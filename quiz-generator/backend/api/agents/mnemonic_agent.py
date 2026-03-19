import logging
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from api.models import Question, Mnemonic
from django.contrib.auth.models import User

logger = logging.getLogger('mnemonic_agent')

class MnemonicActionSchema(BaseModel):
    thought_process: str = Field(description="Analyze the concept and figure out a simple acronym, silly rhyme, or visual mapping.")
    memory_trick: str = Field(description="The final mnemonic device. Keep it under 3 sentences.")

class MnemonicState(TypedDict):
    user_id: int
    question_id: int
    question_text: str
    correct_answer: str
    
    memory_trick: Optional[str]
    mnemonic_id: Optional[int]
    error: Optional[str]

def extract_content_node(state: MnemonicState) -> MnemonicState:
    logger.debug("[extract_content] Fetching question_id=%d", state.get('question_id', 0))
    try:
        question = Question.objects.get(id=state['question_id'])
        state['question_text'] = question.text
        # Gather correct choices or explanation context
        correct_choices = [c.text for c in question.choices.filter(is_correct=True)]
        
        if question.question_type == 'FLASHCARD':
            # Flashcards usually have the answer in the explanation field
            state['correct_answer'] = question.explanation
        else:
            state['correct_answer'] = f"Correct Answer(s): {', '.join(correct_choices)}\nContext: {question.explanation}"
        logger.debug("[extract_content] Question: '%s', Answer: '%s'", state['question_text'][:80], state['correct_answer'][:80])
    except Exception as e:
        logger.error("[extract_content] Failed: %s", str(e))
        state['error'] = f"Failed to fetch question: {str(e)}"
    return state

def generate_trick_node(state: MnemonicState) -> MnemonicState:
    if state.get('error'): return state
    logger.debug("[generate_trick] Starting mnemonic generation...")
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.9
        )
        structured_llm = llm.with_structured_output(MnemonicActionSchema)
        logger.debug("[generate_trick] LLM initialized (model=qwen3.5:9b, temp=0.9)")
        
        prompt = f"""
        IDENTITY: You are a Master Mnemonist and Memory Coach.
        OBJECTIVE: Create a highly memorable, catchy, or silly memory trick (like an acronym, rhyme, or visual association) to help a student memorize a specific fact.
        
        REASONING PROCESS:
        1. Consider the Question and the Correct Answer.
        2. In the 'thought_process' field, brainstorm associations. Are the first letters useful for an acronym? Is there a funny visual?
        3. Output the absolute best trick in the 'memory_trick' field.
        
        CONSTRAINTS:
        - The memory trick must be extremely brief (max 3 sentences).
        - Make it as catchy, bizarre, or intuitive as possible (bizarre things are easier to remember).
        
        QUESTION FACT:
        {state['question_text']}
        
        ANSWER FACT:
        {state['correct_answer']}
        """
        
        logger.debug("[generate_trick] Invoking LLM...")
        output = structured_llm.invoke(prompt)
        state['memory_trick'] = output.memory_trick
        logger.debug("[generate_trick] Mnemonic generated: '%s'", output.memory_trick[:100])
    except Exception as e:
        logger.error("[generate_trick] Failed: %s", str(e))
        state['error'] = f"Failed to generate mnemonic: {str(e)}"
    return state

def save_mnemonic_node(state: MnemonicState) -> MnemonicState:
    if state.get('error'): return state
    logger.debug("[save_mnemonic] Saving mnemonic to database...")
    try:
        user = User.objects.get(id=state['user_id'])
        question = Question.objects.get(id=state['question_id'])
        
        mnemonic = Mnemonic.objects.create(
            user=user,
            question=question,
            memory_trick=state['memory_trick']
        )
        state['mnemonic_id'] = mnemonic.id
        logger.debug("[save_mnemonic] Mnemonic saved (mnemonic_id=%d)", mnemonic.id)
    except Exception as e:
        logger.error("[save_mnemonic] Failed: %s", str(e))
        state['error'] = f"Failed to save mnemonic: {str(e)}"
    return state

builder = StateGraph(MnemonicState)
builder.add_node("extract_content", extract_content_node)
builder.add_node("generate_trick", generate_trick_node)
builder.add_node("save_mnemonic", save_mnemonic_node)

builder.set_entry_point("extract_content")
builder.add_edge("extract_content", "generate_trick")
builder.add_edge("generate_trick", "save_mnemonic")
builder.add_edge("save_mnemonic", END)

mnemonic_graph = builder.compile()
