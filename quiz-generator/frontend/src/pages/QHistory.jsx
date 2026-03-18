import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizService, getMediaUrl } from '../services/apiService';
import { exportQuizToPDF } from '../utils/pdfExport';
import { ArrowPathIcon, ClockIcon, PlayIcon, DocumentTextIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const QHistory = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await quizService.getAll();
        // Sort by created_at descending
        const sortedQuizzes = response.data.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        setQuizzes(sortedQuizzes);
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent triggering any parent clicks
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;
    
    try {
      await quizService.delete(id);
      setQuizzes(quizzes.filter(quiz => quiz.id !== id));
    } catch (error) {
      console.error('Failed to delete quiz:', error);
      alert('Failed to delete quiz. Please try again.');
    }
  };

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
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Quiz History</h1>
        <p className="text-gray-500 font-medium">Review and redo your previously generated quizzes.</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
           <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-500 font-medium text-lg">You haven't generated any quizzes yet.</p>
           <button 
             onClick={() => navigate('/')}
             className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
            >
              Generate a Quiz
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-100 transition-all group flex flex-col justify-between h-56">
              
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       if (quiz.document_file) window.open(getMediaUrl(quiz.document_file), '_blank');
                     }}
                     title="Open Original Document"
                     className={`p-3 rounded-2xl transition-colors ${quiz.document_file ? 'bg-indigo-50 group-hover:bg-indigo-600 cursor-pointer' : 'bg-gray-50 cursor-default'}`}
                   >
                     <DocumentTextIcon className={`h-6 w-6 transition-colors ${quiz.document_file ? 'text-indigo-600 group-hover:text-white' : 'text-gray-400'}`} />
                   </button>
                   <div className="flex items-center text-xs font-bold text-gray-400 gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                     <ClockIcon className="h-4 w-4" />
                     {new Date(quiz.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                     })}
                   </div>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{quiz.title}</h3>
                   <p className="text-sm font-medium text-gray-500 mt-1">{quiz.questions?.length || 0} Questions</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button 
                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 font-bold py-3 rounded-xl transition-colors"
                  >
                  <PlayIcon className="h-5 w-5" />
                  Review
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    exportQuizToPDF(quiz);
                  }}
                  className="px-4 py-3 bg-gray-50 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-xl transition-colors"
                  title="Download as PDF Worksheet"
                  >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={(e) => handleDelete(e, quiz.id)}
                  className="px-4 py-3 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-xl transition-colors"
                  title="Delete Quiz"
                  >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QHistory;
