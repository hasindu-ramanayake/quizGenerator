import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const documentService = {
  upload: (file, title) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);
    return api.post('/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  generateQuiz: (documentId, count, title, types) => {
    return api.post(`/documents/${documentId}/generate-quiz/`, { count, title, types });
  },
  generateLectureNotes: (documentId, title) => {
    return api.post(`/documents/${documentId}/generate-lecture-notes/`, { title });
  },
  getAll: () => api.get('/documents/'),
  delete: (id) => api.delete(`/documents/${id}/`),
};

export const quizService = {
  getAll: () => api.get('/quizzes/'),
  getById: (id) => api.get(`/quizzes/${id}/`),
  delete: (id) => api.delete(`/quizzes/${id}/`),
  submitResponse: (questionId, selectedChoiceIds) => {
    return api.post('/user-responses/', {
      question: questionId,
      selected_choices: selectedChoiceIds
    });
  },
  deleteQuestion: (questionId) => api.delete(`/questions/${questionId}/`),
  generateMnemonic: (questionId) => api.post(`/questions/${questionId}/generate-mnemonic/`),
};

export const lectureNoteService = {
  getAll: () => api.get('/lecture-notes/'),
  getById: (id) => api.get(`/lecture-notes/${id}/`),
  delete: (id) => api.delete(`/lecture-notes/${id}/`),
};
export const mnemonicService = {
  getAll: () => api.get('/mnemonics/'),
  getById: (id) => api.get(`/mnemonics/${id}/`),
  delete: (id) => api.delete(`/mnemonics/${id}/`),
};

export default api;
