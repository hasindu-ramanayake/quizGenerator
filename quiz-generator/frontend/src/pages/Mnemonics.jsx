import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mnemonicService } from '../services/apiService';
import { ArrowPathIcon, SparklesIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';

const Mnemonics = () => {
  const [mnemonics, setMnemonics] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMnemonics = async () => {
      try {
        const response = await mnemonicService.getAll();
        const sorted = response.data.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        setMnemonics(sorted);
      } catch (error) {
        console.error('Failed to fetch mnemonics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMnemonics();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this memory trick?")) return;
    
    try {
      await mnemonicService.delete(id);
      setMnemonics(mnemonics.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete mnemonic:', error);
      alert('Failed to delete trick. Please try again.');
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
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <SparklesIcon className="h-8 w-8 text-yellow-500" />
            Mnemonics Library
        </h1>
        <p className="text-gray-500 font-medium">Review your AI-generated memory tricks and shortcuts.</p>
      </div>

      {mnemonics.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
           <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-500 font-medium text-lg">You haven't generated any memory tricks yet.</p>
           <button 
             onClick={() => navigate('/flashcards')}
             className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
            >
              Go to Flashcards
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mnemonics.map((trick) => (
            <div key={trick.id} className="bg-linear-to-br from-yellow-50/50 to-white rounded-3xl p-6 shadow-sm border border-yellow-200 hover:shadow-xl hover:shadow-yellow-100 transition-all flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                   <div className="flex items-center text-xs font-bold text-yellow-600 gap-1.5 bg-yellow-100 px-3 py-1.5 rounded-full">
                     <ClockIcon className="h-4 w-4" />
                     {new Date(trick.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                     })}
                   </div>
                   <button 
                     onClick={(e) => handleDelete(e, trick.id)}
                     className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                     title="Delete Trick"
                   >
                     <TrashIcon className="h-5 w-5" />
                   </button>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-gray-800 leading-tight italic whitespace-pre-wrap">"{trick.memory_trick}"</h3>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-yellow-200/50">
                <p className="text-xs text-gray-500 font-medium line-clamp-2">
                    Linked to question #{trick.question}
                </p>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => navigate(`/flashcards`)}
                    className="flex-1 text-center py-2.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 font-bold rounded-xl transition-colors text-sm"
                    >
                    Review Cards
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Mnemonics;
