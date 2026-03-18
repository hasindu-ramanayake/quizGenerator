from django.contrib import admin
from .models import Document, Quiz, Question, Choice, UserResponse

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'uploaded_at', 'processed')
    list_filter = ('processed', 'uploaded_at')
    search_fields = ('title', 'user__username')

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'document', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('title', 'user__username')

class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'quiz', 'question_type', 'created_at')
    list_filter = ('question_type', 'created_at')
    search_fields = ('text',)
    inlines = [ChoiceInline]

@admin.register(UserResponse)
class UserResponseAdmin(admin.ModelAdmin):
    list_display = ('user', 'question', 'is_correct', 'timestamp')
    list_filter = ('is_correct', 'timestamp')
