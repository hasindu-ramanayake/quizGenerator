import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizService } from '../services/apiService';
import { AcademicCapIcon, BoltIcon, RectangleStackIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const Flashcards = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        const response = await quizService.getAll();
        
        // Filter quizzes to only those that actually have flashcards inside them
        const quizzesWithFlashcards = response.data.map(quiz => {
            const flashcards = quiz.questions.filter(q => q.question_type === 'FLASHCARD');
            return {
                ...quiz,
                flashcard_count: flashcards.length,
                flashcards: flashcards
            };
        }).filter(quiz => quiz.flashcard_count > 0);
        
        // Sort by most recently created
        const sortedQuizzes = quizzesWithFlashcards.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        setQuizzes(sortedQuizzes);
      } catch (error) {
        console.error('Failed to fetch flashcards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcards();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-20">
        <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <BoltIcon className="h-8 w-8 text-yellow-500" />
          Flashcard Sets
        </h1>
        <p className="text-gray-500 font-medium">Review AI-generated flashcards from questions you answered incorrectly.</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
           <RectangleStackIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-500 font-medium text-lg">You haven't generated any flashcards yet.</p>
           <p className="text-gray-400 text-sm mt-2">Take a quiz. If you answer incorrectly, a custom flashcard will appear here automatically!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-yellow-100/50 hover:border-yellow-200 transition-all group flex flex-col justify-between h-56">
              
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                   <div className="p-3 bg-yellow-50 rounded-2xl group-hover:bg-yellow-500 transition-colors">
                     <AcademicCapIcon className="h-6 w-6 text-yellow-600 group-hover:text-white transition-colors" />
                   </div>
                   <div className="flex items-center text-xs font-bold text-gray-400 gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                     Generated Deck
                   </div>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-yellow-600 transition-colors">{quiz.title}</h3>
                   <p className="text-sm font-medium text-gray-500 mt-1">{quiz.flashcard_count} Cards to Review</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button 
                  onClick={() => navigate(`/quiz/${quiz.id}?type=flashcard`)}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-50 hover:bg-yellow-500 hover:text-white text-yellow-700 font-bold py-3 rounded-xl transition-colors"
                  >
                  Study Now
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Flashcards;
