from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Document, Quiz, Question, Choice, UserResponse, LectureNote
from .serializers import (
    DocumentSerializer, QuizSerializer, QuestionSerializer, 
    ChoiceSerializer, UserResponseSerializer, LectureNoteSerializer,
    MnemonicSerializer
)
from .agents.quiz_graph import quiz_graph
from .agents.lecture_graph import lecture_graph
from .agents.mnemonic_agent import mnemonic_graph
from django.contrib.auth.models import User

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        # Default to first user for now
        user = User.objects.first()
        serializer.save(user=user)

    @action(detail=True, methods=['post'], url_path='generate-quiz')
    def generate_quiz(self, request, pk=None):
        document = self.get_object()
        
        # Prepare initial state for LangGraph
        initial_state = {
            "user_id": document.user.id,
            "document_id": document.id,
            "pdf_path": document.file.path,
            "quiz_title": request.data.get('title', f"Quiz: {document.title}"),
            "questions_count": int(request.data.get('count', 5)),
            "question_types": request.data.get('types', ['MCQ']),
            "quiz_data": [],
            "error": None
        }
        
        # Run the graph
        final_state = quiz_graph.invoke(initial_state)
        
        if final_state.get('error'):
            return Response({"error": final_state['error']}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Return the created quiz details
        quiz_id = final_state.get('quiz_id')
        quiz = Quiz.objects.get(id=quiz_id)
        return Response(QuizSerializer(quiz).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='generate-lecture-notes')
    def generate_lecture_notes(self, request, pk=None):
        document = self.get_object()
        
        initial_state = {
            "user_id": document.user.id,
            "document_id": document.id,
            "pdf_path": document.file.path,
            "title": request.data.get('title', f"Lecture Notes: {document.title}"),
            "content": "",
            "error": None
        }
        
        final_state = lecture_graph.invoke(initial_state)
        
        if final_state.get('error'):
            return Response({"error": final_state['error']}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        note_id = final_state.get('note_id')
        note = LectureNote.objects.get(id=note_id)
        return Response(LectureNoteSerializer(note).data, status=status.HTTP_201_CREATED)

class LectureNoteViewSet(viewsets.ModelViewSet):
    queryset = LectureNote.objects.all()
    serializer_class = LectureNoteSerializer
    permission_classes = [permissions.AllowAny]

class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [permissions.AllowAny]

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], url_path='generate-mnemonic')
    def generate_mnemonic(self, request, pk=None):
        question = self.get_object()
        
        initial_state = {
            "user_id": request.user.id if request.user.is_authenticated else User.objects.first().id,
            "question_id": question.id,
            "question_text": "",
            "correct_answer": "",
            "error": None
        }
        
        final_state = mnemonic_graph.invoke(initial_state)
        
        if final_state.get('error'):
            return Response({"error": final_state['error']}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        mnemonic_id = final_state.get('mnemonic_id')
        from .models import Mnemonic
        mnemonic = Mnemonic.objects.get(id=mnemonic_id)
        return Response(MnemonicSerializer(mnemonic).data, status=status.HTTP_201_CREATED)

class MnemonicViewSet(viewsets.ModelViewSet):
    from .models import Mnemonic
    queryset = Mnemonic.objects.all()
    serializer_class = MnemonicSerializer
    permission_classes = [permissions.AllowAny]

from .agents.flashcard_agent import generate_flashcard_from_wrong_answer

class UserResponseViewSet(viewsets.ModelViewSet):
    queryset = UserResponse.objects.all()
    serializer_class = UserResponseSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Evaluate context if it's an MCQ before saving to determine if they got it right
        question = serializer.validated_data.get('question')
        selected_choices = serializer.validated_data.get('selected_choices', [])
        
        # Calculate correctness
        is_correct = False
        if question.question_type in ['MCQ', 'TRUE_FALSE', 'MCQ_MULTI']:
            correct_choice_ids = set(question.choices.filter(is_correct=True).values_list('id', flat=True))
            selected_ids = set([c.id for c in selected_choices])
            is_correct = (correct_choice_ids == selected_ids)
        
        # Save response
        response_instance = serializer.save(is_correct=is_correct, user=User.objects.first())
        
        # If wrong, trigger flashcard agent asynchronously (or sync for now)
        if not is_correct and question.question_type in ['MCQ', 'TRUE_FALSE', 'MCQ_MULTI', 'FILL_IN_BLANKS', 'STRUCTURED']:
            generate_flashcard_from_wrong_answer(question)
            
        headers = self.get_success_headers(serializer.data)
        # Re-fetch data to reflect boolean
        return Response(UserResponseSerializer(response_instance).data, status=status.HTTP_201_CREATED, headers=headers)
