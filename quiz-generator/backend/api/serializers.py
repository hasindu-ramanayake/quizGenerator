from rest_framework import serializers
from .models import Document, Quiz, Question, Choice, UserResponse, LectureNote, Mnemonic
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ('id', 'text', 'is_correct')

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = ('id', 'quiz', 'text', 'explanation', 'question_type', 'choices', 'created_at')

class MnemonicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mnemonic
        fields = ('id', 'user', 'question', 'memory_trick', 'created_at')
        read_only_fields = ('user', 'created_at')

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    document_file = serializers.CharField(source='document.file.url', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    
    class Meta:
        model = Quiz
        fields = ('id', 'user', 'document', 'document_file', 'document_title', 'title', 'questions', 'created_at')
        read_only_fields = ('user', 'created_at', 'document_file', 'document_title')

class LectureNoteSerializer(serializers.ModelSerializer):
    document_file = serializers.CharField(source='document.file.url', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)

    class Meta:
        model = LectureNote
        fields = ('id', 'user', 'document', 'document_file', 'document_title', 'title', 'content', 'created_at')
        read_only_fields = ('user', 'created_at', 'document_file', 'document_title')


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ('id', 'user', 'title', 'file', 'uploaded_at', 'processed')
        read_only_fields = ('user', 'uploaded_at', 'processed')


class UserResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserResponse
        fields = ('id', 'user', 'question', 'selected_choices', 'text_response', 'is_correct', 'timestamp')
        read_only_fields = ('user', 'is_correct', 'timestamp')
