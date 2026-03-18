import os
import django
import sys
from pprint import pprint

# Setup django environment so models work
sys.path.append('d:/Msc/TestCodes/quiz-generator/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Document
from api.agents.quiz_graph import quiz_graph

def test_graph():
    # Grab an existing user and document to avoid needing real uploads
    user = User.objects.first()
    doc = Document.objects.first()
    
    if not user or not doc:
        print("Please ensure at least 1 User and 1 Document exist in the DB.")
        return
        
    initial_state = {
        "user_id": user.id,
        "document_id": doc.id,
        "pdf_path": doc.file.path,
        "quiz_title": "Multi-Agent Test Quiz",
        "questions_count": 3,
        "concepts": [],
        "quiz_data": [],
        "verification_errors": [],
        "error": None
    }
    
    print("Invoking graph...")
    try:
        final_state = quiz_graph.invoke(initial_state)
        print("Graph completed!")
        if final_state.get('error'):
            print("ERROR FOUND:", final_state['error'])
        else:
            print(f"Success! Quiz saved as ID: {final_state.get('quiz_id')}")
            for err in final_state.get('verification_errors', []):
                print(f"Final Verification Error (Ignored): {err}")
    except Exception as e:
        print(f"Graph exception: {str(e)}")

if __name__ == "__main__":
    test_graph()
