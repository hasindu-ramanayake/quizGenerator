from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, QuizViewSet, QuestionViewSet, UserResponseViewSet, LectureNoteViewSet, MnemonicViewSet

router = DefaultRouter()
router.register(r'documents', DocumentViewSet)
router.register(r'quizzes', QuizViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'user-responses', UserResponseViewSet)
router.register(r'lecture-notes', LectureNoteViewSet)
router.register(r'mnemonics', MnemonicViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
