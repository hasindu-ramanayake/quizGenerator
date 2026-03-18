from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from api.models import Question, Choice

class FlashcardSchema(BaseModel):
    thought_process: str = Field(description="Analyze the user's mistake and determine the core fact they need to memorize.")
    front: str = Field(description="The front of the flashcard (the question)")
    back: str = Field(description="The back of the flashcard (the correct answer)")

def generate_flashcard_from_wrong_answer(question: Question, user_text: str = None):
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", temperature=0.7
        )
        structured_llm = llm.with_structured_output(FlashcardSchema)
        
        correct_choices = question.choices.filter(is_correct=True)
        correct_text = ", ".join([c.text for c in correct_choices])
        
        prompt = f"""
        IDENTITY: You are an Expert Cognitive Psychologist and specialized Study Aids Creator.
        OBJECTIVE: Create a highly-focused, concise flashcard to correct a student's misunderstanding based on an incorrectly answered quiz question.
        
        REASONING PROCESS:
        1. In the 'thought_process' field, analyze why the student might have gotten it wrong based on the provided context (if any).
        2. Identify the single most critical, atomic fact they need to memorize to never make this mistake again.
        3. Formulate a short question (front) and a direct answer (back).
        
        CONSTRAINTS AND GUARDRAILS:
        - Do NOT hallucinate information outside of the provided Original Question and Explanation.
        - The 'front' of the flashcard must be extremely concise and clear.
        - The 'back' of the flashcard must be a direct, unambiguous answer.
        - Do not include conversational filler.
        
        INPUT DATA:
        Original Question: {question.text}
        Correct Answer(s): {correct_text}
        Detailed Explanation: {question.explanation}
        User's wrong understanding (if any): {user_text or 'N/A'}
        """
        
        output = structured_llm.invoke(prompt)
        
        # Create the new Flashcard Question tied to the same Quiz
        flashcard_q = Question.objects.create(
            quiz=question.quiz,
            text=output.front,
            explanation=output.back, # We'll store the back of the card in the explanation field
            question_type='FLASHCARD'
        )
        return flashcard_q
    except Exception as e:
        print(f"Failed to generate flashcard: {str(e)}")
        return None
