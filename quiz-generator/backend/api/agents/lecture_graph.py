import os
import json
import pymupdf # type: ignore
from typing import TypedDict, List
from langgraph.graph import StateGraph
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from api.models import Document, LectureNote

class LectureState(TypedDict):
    user_id: int
    document_id: int
    pdf_path: str
    title: str
    text_content: str
    content: str
    error: str
    note_id: int

# Node 1: Extract Text
def extract_text_node(state: LectureState) -> LectureState:
    try:
        doc = pymupdf.open(state['pdf_path'])
        text = ""
        for page in doc:
            text += page.get_text()
        
        if not text.strip():
            state['error'] = "No extractable text found in PDF."
            return state
            
        state['text_content'] = text
    except Exception as e:
        state['error'] = f"Failed to extract text: {str(e)}"
    return state

# Node 2: Enhance Notes Generation
def generate_notes_node(state: LectureState) -> LectureState:
    if state.get('error'): return state
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.7
        )
        
        system_msg = SystemMessage(content="""
        IDENTITY: You are a Master University Lecturer and Expert Storyteller known for making complex subjects intuitive.
        OBJECTIVE: Transform the provided raw document text into highly engaging, structured, and comprehensive "Enhanced Lecture Notes".
        
        REASONING PROCESS:
        1. Read the text and identify the core themes, major definitions, and underlying mechanisms.
        2. Identify where students typically struggle or find the material dry.
        3. Brainstorm compelling analogies, real-world examples, and step-by-step intuitive breakdowns for those difficult areas.
        
        OUTPUT FORMAT: Provide the output in beautifully formatted Markdown. Include:
        - A compelling Title/Header
        - An engaging Introduction (setting the stage)
        - Main Body Sections (with clear headings, bolded key terms)
        - "Lecturer's Insight" callout boxes (using blockquotes >) where you provide a deep, intuitive analogy.
        - A concise Summary / Key Takeaways at the end.
        
        CONSTRAINTS:
        - DO NOT hallucinate facts not supported by the core text, but DO create analogies to explain existing facts.
        - Output *only* the Markdown text. Do not wrap in JSON.
        """)
        
        user_msg = HumanMessage(content=f"Enhance this text into a masterpiece lecture:\n\n{state['text_content'][:25000]}")
        
        response = llm.invoke([system_msg, user_msg])
        
        # Remove markdown code block markers if the LLM adds them
        content = response.content.strip()
        if content.startswith('```markdown'):
            content = content[11:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
            
        state['content'] = content.strip()
    except Exception as e:
        state['error'] = f"Lecture generation failed: {str(e)}"
    return state

# Node 3: Save to Database
def save_note_node(state: LectureState) -> LectureState:
    if state.get('error'): return state
    try:
        document = Document.objects.get(id=state['document_id'])
        
        note = LectureNote.objects.create(
            user_id=state['user_id'],
            document=document,
            title=state['title'],
            content=state['content']
        )
        
        state['note_id'] = note.id
    except Exception as e:
        state['error'] = f"Failed to save lecture note: {str(e)}"
    return state

# Build Graph
builder = StateGraph(LectureState)
builder.add_node("extract_text", extract_text_node)
builder.add_node("generate_notes", generate_notes_node)
builder.add_node("save_note", save_note_node)

builder.set_entry_point("extract_text")
builder.add_edge("extract_text", "generate_notes")
builder.add_edge("generate_notes", "save_note")

lecture_graph = builder.compile()
