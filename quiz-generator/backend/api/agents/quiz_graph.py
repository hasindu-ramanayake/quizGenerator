import fitz  # PyMuPDF
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from django.conf import settings
import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field
from langchain_community.tools import DuckDuckGoSearchRun

from api.models import Quiz, Question, Choice, Document
from django.contrib.auth.models import User

# Shared rate limiter
rate_limiter = InMemoryRateLimiter(
    requests_per_second=0.25,
)

# Initialize the Search Tool
search_tool = DuckDuckGoSearchRun()

# Pydantic Schemas
class ConceptSchema(BaseModel):
    thought_process: str = Field(description="Use this space to think step-by-step about what concepts are most important in this text.")
    concepts: List[str] = Field(description="A list of key concepts identified from the text.")

class ChoiceSchema(BaseModel):
    text: str = Field(description="The text of the answer choice")
    is_correct: bool = Field(description="Whether this choice is the correct answer")

class QuestionSchema(BaseModel):
    text: str = Field(description="The question text")
    question_type: str = Field(description="Type of question (MUST be exactly one of the requested types, e.g MCQ, TRUE_FALSE, or MCQ_MULTI)")
    difficulty: str = Field(description="Difficulty level: Easy, Medium, or Hard")
    choices: List[ChoiceSchema] = Field(description="List of choices based on question type rules")
    explanation: str = Field(description="Detailed explanation of the correct answer(s). For multiple choice questions, you MUST also explicitly explain why each incorrect distractor is wrong (the specific trap).")

class QuizOutputSchema(BaseModel):
    thought_process: str = Field(description="Write your step-by-step plan here. Explicitly state the requested number of questions. Plan out what concept each question will test BEFORE generating them. Count them to ensure you exactly match the requested count.")
    questions: List[QuestionSchema] = Field(description="A list of generated quiz questions matching the exact requested count.")

class VerificationFeedbackSchema(BaseModel):
    thought_process: str = Field(description="Write out your step-by-step reasoning for evaluating these questions based on the rules.")
    is_valid: bool = Field(description="Whether the quiz questions passed verification.")
    feedback: str = Field(description="Detailed feedback on what needs to be fixed if is_valid is false.")

# State definition
class QuizState(TypedDict):
    user_id: int
    document_id: int
    pdf_path: str
    text_content: str
    quiz_title: str
    questions_count: int
    question_types: List[str]
    
    concepts: List[str]
    quiz_data: List[dict]
    verification_errors: List[str]
    
    quiz_id: Optional[int]
    error: Optional[str]

# Node 1: Extract Text
def extract_text_node(state: QuizState) -> QuizState:
    try:
        pdf_path = state['pdf_path']
        if not os.path.isabs(pdf_path):
            pdf_path = os.path.join(settings.MEDIA_ROOT, pdf_path)
            
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        state['text_content'] = text
    except Exception as e:
        state['error'] = f"PDF Extraction failed: {str(e)}"
    return state

# Node 2: Identify Concepts
def identify_concepts_node(state: QuizState) -> QuizState:
    if state.get('error'): return state
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.2, rate_limiter=rate_limiter
        )
        structured_llm = llm.with_structured_output(ConceptSchema)
        
        prompt = f"""
        IDENTITY: You are a Senior Curriculum Strategist specializing in deep-learning extraction.
        OBJECTIVE: Analyze the provided text and identify exactly {state.get('questions_count')} critical concepts that must be tested.
        
        REASONING PROCESS:
        1. Read the text.
        2. Use the 'thought_process' field to write out a numbered list of potential concepts.
        3. Select exactly {state.get('questions_count')} of the most important concepts, ensuring they span the entire document.
        
        CONSTRAINTS: 
        - DO NOT extract more or fewer concepts than {state.get('questions_count')}.
        - Focus on actionable, testable logic.
        
        TEXT:
        {state['text_content'][:25000]}
        """
        output = structured_llm.invoke(prompt)
        state['concepts'] = output.concepts
        state['verification_errors'] = [] # Initialize empty errors for the loop
    except Exception as e:
        state['error'] = f"Concept Identification failed: {str(e)}"
    return state

# Node 3: Generate Quiz (Tool calling enabled)
def generate_quiz_node(state: QuizState) -> QuizState:
    if state.get('error'): return state
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.7, rate_limiter=rate_limiter
        )
        # We bind the search tool to the LLM so it can fact check
        llm_with_tools = llm.bind_tools([search_tool])
        
        errors_context = ""
        if state.get('verification_errors'):
            errors_context = f"PREVIOUS ERRORS YOU MUST FIX:\n{chr(10).join(state['verification_errors'])}\n\n"

        system_msg = SystemMessage(content=f"""
        IDENTITY: You are an Expert Assessment Designer.
        OBJECTIVE: Create a quiz with EXACTLY {state.get('questions_count')} questions based on the provided concepts.
        
        REASONING PROCESS:
        1. In the 'thought_process' field, explicitly state the target question count: {state.get('questions_count')}
        2. Plan out exactly 1 question for each concept in this list: {', '.join(state.get('concepts', []))}
        3. Count the planned questions to verify it perfectly matches the target count BEFORE generating the final array.
        
        TOOL USAGE:
        - You have access to a web search tool. You MUST use it to verify any historical dates, definitions, or complex facts before generating the question. Do not hallucinate.
        
        CONSTRAINTS AND GUARDRAILS:
        - CRITICAL: You must generate EXACTLY {state.get('questions_count')} questions. Generating more or fewer is a critical failure.
        - You MUST ONLY use the following question types: {', '.join(state.get('question_types', ['MCQ']))}.
        - For 'MCQ', you MUST provide EXACTLY 4 choices and exactly 1 correct answer.
        - For 'TRUE_FALSE', you MUST provide EXACTLY 2 choices (True and False) and exactly 1 correct answer.
        - For 'MCQ_MULTI', you MUST provide EXACTLY 4 to 6 choices, and MUST have at least 2 correct answers.
        - The `explanation` field MUST provide a 'Post-Mortem'. First explain why the correct answer is right. Then, explicitly explain the specific trap or misconception for EACH incorrect distractor (e.g., 'If you selected B, it is incorrect because...').
        
        OUTPUT FORMAT: Strict JSON matching the requested schema.
        
        {errors_context}
        """)
        
        user_msg = HumanMessage(content=f"Generate the quiz based on this text:\n{state['text_content'][:25000]}")
        
        # Invoke LLM (it might decide to use a tool)
        response = llm_with_tools.invoke([system_msg, user_msg])
        
        # If the LLM called the search tool, execute it and pass result back
        if response.tool_calls:
            messages = [system_msg, user_msg, response]
            for tool_call in response.tool_calls:
                # Execute tool
                tool_msg = search_tool.invoke(tool_call)
                messages.append(tool_msg)
            # Re-invoke with tool results
            final_response = llm_with_tools.invoke(messages)
            content_to_parse = final_response.content
        else:
            content_to_parse = response.content

        # Now force format into our schema
        structured_llm = llm.with_structured_output(QuizOutputSchema)
        final_output = structured_llm.invoke(f"Extract the generated quiz from this text into the required JSON schema:\n{content_to_parse}")
        
        # Programmatic Security: Strictly slice the array to the requested count to prevent leakage
        generated_data = [q.model_dump() for q in final_output.questions]
        state['quiz_data'] = generated_data[:state.get('questions_count')]
        
        state['verification_errors'] = [] # Clear errors since we generated a new batch
        
    except Exception as e:
        state['error'] = f"Quiz Generation failed: {str(e)}"
    return state

# Node 4: Devil's Advocate (Distractor Improver)
def devils_advocate_node(state: QuizState) -> QuizState:
    if state.get('error'): return state
    # Only run if there are MCQs
    if not any(q['question_type'] == 'MCQ' for q in state['quiz_data']):
        return state
        
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.6, rate_limiter=rate_limiter
        )
        llm_with_tools = llm.bind_tools([search_tool])
        
        system_msg = SystemMessage(content=f"""
        IDENTITY: You are an Expert Distractor Designer and Senior Educational Psychometrician.
        OBJECTIVE: Review the generated Multiple Choice Questions (MCQs) and replace 1 or 2 weak or obvious "wrong" answers with highly plausible distractors based on common student misconceptions.
        
        REASONING PROCESS:
        1. For each MCQ, analyze the correct answer and the source text.
        2. Identify why a student might be confused (common misconceptions, similar terms, logical fallacies).
        3. Use the 'thought_process' field to explain which options you are replacing and why the new ones are trickier.
        
        TOOL USAGE:
        - You MUST use the search_tool to look up common student misconceptions or pedagogical challenges related to the concepts if you aren't certain.
        
        CONSTRAINTS:
        - DO NOT change the correct answer.
        - DO NOT change the question text.
        - Maintain EXACTLY 4 choices for MCQs.
        - Only modify questions of type 'MCQ'.
        - If you replace a distractor, you MUST also update the question's `explanation` field so it explicitly explains the specific trap for the new distractor you introduced.
        
        OUTPUT FORMAT: Final output must be the updated quiz data in the required JSON schema.
        """)
        
        user_msg = HumanMessage(content=f"Improve these MCQs by making distractors trickier. Source Text Context:\n{state['text_content'][:10000]}\n\nCurrent Quiz Data:\n{json.dumps(state['quiz_data'])}")
        
        response = llm_with_tools.invoke([system_msg, user_msg])
        
        if response.tool_calls:
            messages = [system_msg, user_msg, response]
            for tool_call in response.tool_calls:
                tool_msg = search_tool.invoke(tool_call)
                messages.append(tool_msg)
            response = llm_with_tools.invoke(messages)

        # Parse back into schema
        structured_llm = llm.with_structured_output(QuizOutputSchema)
        final_output = structured_llm.invoke(f"Extract the improved quiz into JSON schema:\n{response.content}")
        
        # Merge changes
        state['quiz_data'] = [q.model_dump() for q in final_output.questions]
        
    except Exception as e:
        # If this fails, we just log it and continue with original data to avoid breaking the flow
        print(f"Devil's Advocate failed: {str(e)}")
    return state

# Node 5: Answer Verification
def verify_answers_node(state: QuizState) -> QuizState:
    if state.get('error'): return state
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.1, rate_limiter=rate_limiter
        ).with_structured_output(VerificationFeedbackSchema)
        
        prompt = f"""
        IDENTITY: You are a strict Academic Quality Assurance Auditor.
        OBJECTIVE: Verify the absolute factual correctness of every generated quiz answer against the source text.
        
        REASONING PROCESS:
        1. In the 'thought_process' field, evaluate each answer for factual grounding.
        2. Ask yourself: "Does the source text directly support this correct answer without hallucination?"
        
        CONSTRAINTS:
        - If ANY correct choice asserts a fact NOT found in the source text, set is_valid to false and provide feedback.
        
        Source Text: {state['text_content'][:10000]}
        
        Quiz Data: {json.dumps(state['quiz_data'])}
        """
        output = llm.invoke(prompt)
        if not output.is_valid:
            state['verification_errors'].append(f"Answer Verification Failed: {output.feedback}")
    except Exception as e:
        state['error'] = f"Answer Verification failed: {str(e)}"
    return state

# Node 5: Format Verification
def verify_questions_node(state: QuizState) -> QuizState:
    if state.get('error'): return state
    for idx, q in enumerate(state.get('quiz_data', [])):
        q_type = q.get('question_type')
        allowed_types = state.get('question_types', ['MCQ'])
        
        if q_type not in allowed_types:
            state['verification_errors'].append(f"Question {idx+1} is of type '{q_type}', which was not requested. Only use: {', '.join(allowed_types)}.")
            continue
            
        correct_count = sum(1 for c in q.get('choices', []) if c['is_correct'])
        num_choices = len(q.get('choices', []))
        
        if q_type == 'MCQ':
            if num_choices != 4:
                state['verification_errors'].append(f"Question {idx+1} is MCQ but has {num_choices} choices instead of exactly 4.")
            if correct_count != 1:
                state['verification_errors'].append(f"Question {idx+1} is MCQ but has {correct_count} correct answers instead of exactly 1.")
                
        elif q_type == 'TRUE_FALSE':
            if num_choices != 2:
                state['verification_errors'].append(f"Question {idx+1} is TRUE_FALSE but has {num_choices} choices instead of exactly 2.")
            if correct_count != 1:
                state['verification_errors'].append(f"Question {idx+1} is TRUE_FALSE but has {correct_count} correct answers instead of exactly 1.")
                
        elif q_type == 'MCQ_MULTI':
            if num_choices < 4 or num_choices > 6:
                state['verification_errors'].append(f"Question {idx+1} is MCQ_MULTI but has {num_choices} choices. It must have 4 to 6.")
            if correct_count < 2:
                state['verification_errors'].append(f"Question {idx+1} is MCQ_MULTI but only has {correct_count} correct answers. It must have at least 2.")
                
    return state

# Node 6: Duplicate Checker
def check_duplicates_node(state: QuizState) -> QuizState:
    if state.get('error'): return state
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.1, rate_limiter=rate_limiter
        ).with_structured_output(VerificationFeedbackSchema)
        
        prompt = f"""
        IDENTITY: You are a strict Academic Quality Assurance Auditor.
        OBJECTIVE: Verify that none of the generated questions are duplicates or covering the exact same concept verbatim.
        
        REASONING PROCESS:
        1. In the 'thought_process' field, map out what core concept each question tests.
        2. Check for heavy overlap.
        
        CONSTRAINTS:
        - If two questions ask the exact same thing using different words, set is_valid to false.
        
        Quiz Data: {json.dumps(state['quiz_data'])}
        """
        output = llm.invoke(prompt)
        if not output.is_valid:
            state['verification_errors'].append(f"Duplicate Verification Failed: {output.feedback}")
    except Exception as e:
        state['error'] = f"Duplicate Verification failed: {str(e)}"
    return state

# Conditional Edge router
def route_verification(state: QuizState) -> str:
    if state.get('error'):
        return "end" # Early exit on critical error
    
    if len(state.get('verification_errors', [])) > 0:
        return "generate_quiz" # Loop back
        
    return "save_quiz" # Proceed to save

# Node 7: Save Quiz
def save_quiz_node(state: QuizState) -> QuizState:
    if state.get('error'): return state
    try:
        user = User.objects.get(id=state['user_id'])
        doc = Document.objects.get(id=state['document_id'])
        
        quiz = Quiz.objects.create(
            user=user,
            document=doc,
            title=state.get('quiz_title', f"Quiz for {doc.title}")
        )
        
        for q_item in state['quiz_data']:
            question = Question.objects.create(
                quiz=quiz,
                text=q_item['text'],
                question_type=q_item['question_type'],
                explanation=q_item.get('explanation', '')
            )
            for choice_item in q_item.get('choices', []):
                Choice.objects.create(
                    question=question,
                    text=choice_item['text'],
                    is_correct=choice_item['is_correct']
                )
        state['quiz_id'] = quiz.id
        doc.processed = True
        doc.save()
    except Exception as e:
        state['error'] = f"Database save failed: {str(e)}"
    return state

# Define the graph
builder = StateGraph(QuizState)
builder.add_node("extract_text", extract_text_node)
builder.add_node("identify_concepts", identify_concepts_node)
builder.add_node("generate_quiz", generate_quiz_node)
builder.add_node("devils_advocate", devils_advocate_node)
builder.add_node("verify_answers", verify_answers_node)
builder.add_node("verify_questions", verify_questions_node)
builder.add_node("check_duplicates", check_duplicates_node)
builder.add_node("save_quiz", save_quiz_node)

builder.set_entry_point("extract_text")
builder.add_edge("extract_text", "identify_concepts")
builder.add_edge("identify_concepts", "generate_quiz")
builder.add_edge("generate_quiz", "devils_advocate")
builder.add_edge("devils_advocate", "verify_answers")
builder.add_edge("verify_answers", "verify_questions")
builder.add_edge("verify_questions", "check_duplicates")

builder.add_conditional_edges("check_duplicates", route_verification, {
    "generate_quiz": "generate_quiz",
    "save_quiz": "save_quiz",
    "end": END
})
builder.add_edge("save_quiz", END)

quiz_graph = builder.compile()
