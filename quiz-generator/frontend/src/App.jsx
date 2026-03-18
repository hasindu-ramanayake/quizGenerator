import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import QuizView from './pages/QuizView';
import QHistory from './pages/QHistory';
import Documents from './pages/Documents';
import Flashcards from './pages/Flashcards';
import LectureNotes from './pages/LectureNotes';
import NoteView from './pages/NoteView';
import Mnemonics from './pages/Mnemonics';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/quizzes" element={<QHistory />} />
          <Route path="/quiz/:id" element={<QuizView />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/lecture-notes" element={<LectureNotes />} />
          <Route path="/lecture-note/:id" element={<NoteView />} />
          <Route path="/mnemonics" element={<Mnemonics />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
