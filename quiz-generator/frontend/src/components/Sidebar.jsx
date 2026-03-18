import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizService } from '../services/apiService';
import {
  PlusIcon,
  ClockIcon,
  BookOpenIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await quizService.getAll();
        // Sort by created_at descending and get top 5
        const sortedQuizzes = response.data
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);
        setHistory(sortedQuizzes);
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
      }
    };

    fetchQuizzes();
  }, []);

  return (
    <aside className="w-64 bg-gray-50/50 border-r border-gray-100 h-[calc(100vh-64px)] fixed left-0 top-16 overflow-y-auto hidden lg:block">
      <div className="px-5 py-8">
        {/* <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all mb-10 group active:scale-95">
          <PlusIcon className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
          <span>New Quiz</span>
        </button> */}

        <div className="space-y-2">
          <h3 className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Study History</h3>
          {history.map((quiz) => (
            <button key={quiz.id} onClick={() => navigate(`/quiz/${quiz.id}`)} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-xl transition-all group">
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-indigo-100 transition-colors">
                <ClockIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
              </div>
              <div className="flex flex-col items-start overflow-hidden flex-1">
                <span className="truncate w-full font-bold text-gray-700 group-hover:text-indigo-700 transition-colors leading-tight text-left">{quiz.title}</span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {new Date(quiz.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <ChevronRightIcon className="h-3 w-3 text-gray-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          ))}
        </div>

        <div className="mt-12 space-y-2">
          <h3 className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Library</h3>
          <button onClick={() => navigate('/documents')} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-xl transition-all group">
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-indigo-100">
              <DocumentTextIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-indigo-700">All Documents</span>
          </button>
          <button onClick={() => navigate('/flashcards')} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-xl transition-all group">
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-indigo-100">
              <BookOpenIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-indigo-700">Flashcard Sets</span>
          </button>
          <button onClick={() => navigate('/lecture-notes')} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-xl transition-all group">
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-indigo-100">
              <ComputerDesktopIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-indigo-700">Lecture Notes</span>
          </button>
          <button onClick={() => navigate('/mnemonics')} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-500 hover:text-yellow-600 hover:bg-yellow-50/80 rounded-xl transition-all group">
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-yellow-100 font-bold">
              <SparklesIcon className="h-4 w-4 text-gray-400 group-hover:text-yellow-600" />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-yellow-700">Memory Tricks</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
