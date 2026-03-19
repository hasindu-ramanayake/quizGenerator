import os
import json
import logging
import pymupdf # type: ignore
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools import DuckDuckGoSearchRun
from pydantic import BaseModel, Field
from api.models import Document, LectureNote

logger = logging.getLogger('lecture_graph')

# Web search tool for extended context
search_tool = DuckDuckGoSearchRun()


# Schema for concept extraction (used by web research node)
class ConceptListSchema(BaseModel):
    concepts: List[str] = Field(description="A list of the major concepts/topics found in the text, each described in a few words.")


class LectureState(TypedDict):
    user_id: int
    document_id: int
    pdf_path: str
    title: str
    text_content: str
    extended_context: bool  # Whether to use web search for supplementary info
    research_context: str   # Supplementary info gathered from web search
    content: str
    error: str
    note_id: int


# Node 1: Extract Text
def extract_text_node(state: LectureState) -> LectureState:
    logger.debug("[extract_text] Starting PDF extraction: %s", state.get('pdf_path'))
    try:
        doc = pymupdf.open(state['pdf_path'])
        text = ""
        for page in doc:
            text += page.get_text()
        
        if not text.strip():
            logger.warning("[extract_text] No extractable text found in PDF")
            state['error'] = "No extractable text found in PDF."
            return state
            
        state['text_content'] = text
        logger.debug("[extract_text] Extracted %d characters from %d pages", len(text), len(doc))
    except Exception as e:
        logger.error("[extract_text] Failed: %s", str(e))
        state['error'] = f"Failed to extract text: {str(e)}"
    return state


# Node 2: Web Research (only runs when extended_context=True)
def web_research_node(state: LectureState) -> LectureState:
    if state.get('error'):
        return state
    if not state.get('extended_context', False):
        logger.debug("[web_research] Skipping — extended_context is disabled")
        state['research_context'] = ""
        return state
    
    logger.debug("[web_research] Starting web research for extended context...")
    try:
        # Step 1: Extract major concepts from the text
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.2
        )
        structured_llm = llm.with_structured_output(ConceptListSchema)
        
        concept_output = structured_llm.invoke(
            f"Identify the 5-8 most important academic concepts from this text. "
            f"Each concept should be a short phrase (3-6 words):\n\n{state['text_content'][:15000]}"
        )
        concepts = concept_output.concepts
        logger.debug("[web_research] Identified %d concepts for research: %s", len(concepts), concepts)
        
        # Step 2: Search for each concept
        research_results = []
        for concept in concepts[:6]:  # Cap at 6 to avoid rate limiting
            try:
                query = f"{concept} academic explanation definition"
                logger.debug("[web_research] Searching: %s", query)
                result = search_tool.invoke(query)
                research_results.append(f"### {concept}\n{result[:1000]}")
            except Exception as e:
                logger.warning("[web_research] Search failed for '%s': %s", concept, str(e))
        
        state['research_context'] = "\n\n".join(research_results)
        logger.debug("[web_research] Gathered %d research results, total length=%d", 
                     len(research_results), len(state['research_context']))
    except Exception as e:
        logger.warning("[web_research] Web research failed (non-fatal): %s", str(e))
        state['research_context'] = ""
    return state


# Node 3: Generate Masters-Level Lecture Notes
def generate_notes_node(state: LectureState) -> LectureState:
    if state.get('error'):
        return state
    logger.debug("[generate_notes] Starting masters-level lecture notes generation...")
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.7
        )
        logger.debug("[generate_notes] LLM initialized (model=gemini-3-flash-preview, temp=0.7)")

        # Build supplementary context section if available
        research_section = ""
        if state.get('research_context'):
            research_section = f"""
        SUPPLEMENTARY RESEARCH (from web search — integrate where relevant):
        {state['research_context'][:8000]}
        """
        
        system_msg = SystemMessage(content=f"""
        IDENTITY: You are a Distinguished University Professor and published academic author at a top-tier research university.
        You specialize in creating comprehensive, masters-level study materials that meet postgraduate academic standards.

        OBJECTIVE: Transform the provided raw document text into an exhaustive, masters-level academic study document.
        Every concept in the source text MUST be explained in scholarly depth — no concept should be left with a
        surface-level treatment.

        STRUCTURE — Output in clean, well-structured Markdown using this format:

        # [Document Title]

        ## Abstract
        A 150-200 word executive summary of the entire document's scope, methodology, and key contributions.

        ## 1. Introduction
        - Context and background of the subject matter
        - The problem statement or research gap being addressed
        - Objectives and scope of the document

        ## 2. [First Major Topic]
        ### 2.1 [Subtopic]
        For each concept provide:
        - **Definition**: Precise academic definition with proper terminology
        - **Mechanism / How It Works**: Step-by-step breakdown of the underlying process
        - **Significance**: Why this matters in the broader field
        - **Critical Analysis**: Strengths, limitations, trade-offs, or ongoing debates
        - **Real-World Application or Example**: Concrete illustration

        > **Key Insight:** Use blockquotes for important takeaways, analogies, or "aha moments" that
        > help students internalize the concept at a deeper level.

        [Continue with sections 3, 4, 5... for each major topic area]

        ## [N]. Critical Discussion
        - Synthesis of how the concepts interconnect
        - Limitations of the approaches discussed
        - Open questions and future research directions

        ## [N+1]. Summary & Key Takeaways
        A numbered list of the most critical points a masters student must remember.

        ## References & Further Reading
        - List any sources mentioned in the text
        - Suggest 3-5 additional academic resources for deeper study (use real, well-known textbooks or papers)

        ---

        DEPTH REQUIREMENTS:
        - Every concept MUST receive at minimum 150-200 words of explanation
        - Use **bold** for key terms on their first appearance
        - Use `code formatting` for technical terms, algorithms, or formulas
        - Include numbered lists for sequential processes
        - Include bullet points for feature comparisons or attribute lists
        - Add horizontal rules (---) between major sections for visual separation

        QUALITY STANDARD:
        - The output should read like a chapter from a graduate-level textbook
        - Use precise academic language while remaining accessible
        - Explain jargon when it first appears
        - Draw connections between concepts to show how they relate

        CONSTRAINTS:
        - Output ONLY the Markdown text — no JSON wrapping, no code block wrappers
        - Do NOT skip or superficially cover any concept from the source text
        - Facts must be grounded in the source text; analogies and examples may be original
        {research_section}
        """)
        
        user_msg = HumanMessage(
            content=f"Transform this document into comprehensive masters-level study notes:\n\n{state['text_content'][:25000]}"
        )
        
        logger.debug("[generate_notes] Invoking LLM...")
        response = llm.invoke([system_msg, user_msg])
        logger.debug("[generate_notes] LLM responded, content type=%s", type(response.content).__name__)
        
        # Handle response.content being a list of parts (Gemini returns [{'type': 'text', 'text': '...'}])
        raw_content = response.content
        if isinstance(raw_content, list):
            raw_content = "\n".join(
                part.get('text', str(part)) if isinstance(part, dict) else str(part)
                for part in raw_content
            )
        
        # Remove markdown code block markers if the LLM adds them
        content = raw_content.strip()
        if content.startswith('```markdown'):
            content = content[11:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
            
        state['content'] = content.strip()
        logger.debug("[generate_notes] Notes generated, final length=%d characters", len(state['content']))
    except Exception as e:
        logger.error("[generate_notes] Failed: %s", str(e))
        state['error'] = f"Lecture generation failed: {str(e)}"
    return state


# Node 4: Save to Database
def save_note_node(state: LectureState) -> LectureState:
    if state.get('error'):
        return state
    logger.debug("[save_note] Saving lecture note to database...")
    try:
        document = Document.objects.get(id=state['document_id'])
        
        note = LectureNote.objects.create(
            user_id=state['user_id'],
            document=document,
            title=state['title'],
            content=state['content']
        )
        
        state['note_id'] = note.id
        logger.debug("[save_note] Lecture note saved (note_id=%d)", note.id)
    except Exception as e:
        logger.error("[save_note] Failed: %s", str(e))
        state['error'] = f"Failed to save lecture note: {str(e)}"
    return state


# Build Graph
builder = StateGraph(LectureState)
builder.add_node("extract_text", extract_text_node)
builder.add_node("web_research", web_research_node)
builder.add_node("generate_notes", generate_notes_node)
builder.add_node("save_note", save_note_node)

builder.set_entry_point("extract_text")
builder.add_edge("extract_text", "web_research")
builder.add_edge("web_research", "generate_notes")
builder.add_edge("generate_notes", "save_note")

lecture_graph = builder.compile()
