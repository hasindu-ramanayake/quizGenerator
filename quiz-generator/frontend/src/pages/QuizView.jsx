import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { quizService } from '../services/apiService';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowRightIcon, 
  ArrowLeftIcon,
  AcademicCapIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Button, LinearProgress, CircularProgress } from '@mui/material';

const QuizView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const filterType = urlParams.get('type'); // could be 'flashcard'

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Track multiple selections for MCQ_MULTI
  const [selectedChoiceIds, setSelectedChoiceIds] = useState([]);
  const [isCorrectEval, setIsCorrectEval] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Mnemonic State
  const [isGeneratingMnemonic, setIsGeneratingMnemonic] = useState(false);
  const [mnemonicText, setMnemonicText] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await quizService.getById(id);
        const fetchedQuiz = response.data;
        let visibleQuestions = fetchedQuiz.questions;
        
        // If filterType is flashcard, only show flashcard questions
        if (filterType === 'flashcard') {
           visibleQuestions = visibleQuestions.filter(q => q.question_type === 'FLASHCARD');
        }
        
        setQuiz(fetchedQuiz);
        setQuestions(visibleQuestions);
      } catch (err) {
        console.error("Failed to fetch quiz", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  if (loading) return <div className="p-20 text-center"><LinearProgress /></div>;
  if (!quiz || questions.length === 0) return <div className="p-20 text-center">No questions found for this mode.</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  
  const isFlashcardMode = currentQuestion.question_type === 'FLASHCARD';
  const isMultiSelect = currentQuestion.question_type === 'MCQ_MULTI';

  const handleChoiceSelect = async (choice) => {
    if (isFlipped) return;
    
    if (isMultiSelect) {
      if (selectedChoiceIds.includes(choice.id)) {
        setSelectedChoiceIds(selectedChoiceIds.filter(id => id !== choice.id));
      } else {
        setSelectedChoiceIds([...selectedChoiceIds, choice.id]);
      }
      // Do not auto flip for multi-select
    } else {
      // Auto-submit for single choice types
      setSelectedChoiceIds([choice.id]);
      setIsCorrectEval(choice.is_correct);
      setIsFlipped(true);
      
      try {
        await quizService.submitResponse(currentQuestion.id, [choice.id]);
      } catch (e) {
        console.error("Failed to submit response", e);
      }
    }
  };

  const handleMultiSubmit = async () => {
    if (selectedChoiceIds.length === 0) return;
    
    // Evaluate locally for UI
    const correctChoiceIds = currentQuestion.choices.filter(c => c.is_correct).map(c => c.id);
    const isExactlyCorrect = 
      correctChoiceIds.length === selectedChoiceIds.length && 
      correctChoiceIds.every(id => selectedChoiceIds.includes(id));
      
    setIsCorrectEval(isExactlyCorrect);
    setIsFlipped(true);

    try {
      await quizService.submitResponse(currentQuestion.id, selectedChoiceIds);
    } catch (e) {
        console.error("Failed to submit response", e);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setIsFlipped(false);
      setSelectedChoiceIds([]);
      setIsCorrectEval(false);
      setMnemonicText(null);
    } else {
      if (filterType === 'flashcard') {
         navigate('/flashcards');
      } else {
         navigate('/quizzes');
      }
    }
  };

  const handleDeleteFlashcard = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this flashcard?")) return;
    
    try {
      await quizService.deleteQuestion(currentQuestion.id);
      
      const updatedQuestions = questions.filter(q => q.id !== currentQuestion.id);
      
      if (updatedQuestions.length === 0) {
        navigate('/flashcards');
      } else {
        setQuestions(updatedQuestions);
        if (currentQuestionIndex >= updatedQuestions.length) {
          setCurrentQuestionIndex(updatedQuestions.length - 1);
        }
        setIsFlipped(false);
      }
    } catch (error) {
       console.error("Failed to delete flashcard", error);
       alert("Failed to delete flashcard.");
    }
  };

  const handleGenerateMnemonic = async (e) => {
    e.stopPropagation();
    setIsGeneratingMnemonic(true);
    try {
      const response = await quizService.generateMnemonic(currentQuestion.id);
      setMnemonicText(response.data.memory_trick);
    } catch (error) {
       console.error("Failed to generate mnemonic", error);
       alert("Failed to generate memory trick.");
    } finally {
      setIsGeneratingMnemonic(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
          <p className="text-sm text-gray-500">{isFlashcardMode ? 'Flashcard' : 'Question'} {currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="w-48">
              <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, bgcolor: '#eef2ff', '& .MuiLinearProgress-bar': { bgcolor: '#4f46e5' }}} />
           </div>
        </div>
      </div>

      {/* Flashcard Container */}
      <div className="relative min-h-[500px] w-full [perspective:1000px] group">
        <div className={`relative min-h-full w-full transition-all duration-700 [transform-style:preserve-3d] grid ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
          
          {/* Front Side */}
          <div className="[grid-area:1/1] bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-gray-100 flex flex-col justify-between [backface-visibility:hidden] gap-8">
            <div className="space-y-6 relative">
              <div className="flex items-start justify-between">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isFlashcardMode ? 'bg-yellow-50 text-yellow-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {currentQuestion.question_type}
                </span>
                {isFlashcardMode && (
                  <button 
                    onClick={handleDeleteFlashcard}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Flashcard"
                  >
                    <TrashIcon className="h-6 w-6" />
                  </button>
                )}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 leading-tight mt-4">
                {currentQuestion.text}
              </h3>
            </div>

            {isFlashcardMode ? (
              <div className="mt-8">
                 <button 
                  onClick={() => setIsFlipped(true)}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-4 rounded-2xl transition-colors border-2 border-indigo-100 border-dashed"
                 >
                   Reveal Answer
                 </button>
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.choices?.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleChoiceSelect(choice)}
                      className={`p-5 text-left border-2 hover:border-indigo-200 hover:bg-indigo-50/50 rounded-2xl transition-all font-medium group/item flex items-center justify-between gap-4 ${
                         selectedChoiceIds.includes(choice.id) 
                           ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm' 
                           : 'border-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-wrap wrap-break-word">{choice.text}</span>
                      <div className={`shrink-0 rounded flex items-center justify-center transition-colors ${
                          isMultiSelect 
                            ? `h-5 w-5 border-2 ${selectedChoiceIds.includes(choice.id) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 group-hover/item:border-indigo-400'}`
                            : `h-4 w-4 rounded-full border-2 ${selectedChoiceIds.includes(choice.id) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 group-hover/item:border-indigo-400'}`
                      }`}>
                          {isMultiSelect && selectedChoiceIds.includes(choice.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                          )}
                      </div>
                    </button>
                  ))}
                </div>
                {isMultiSelect && !isFlipped && (
                  <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
                    <Button
                      variant="contained"
                      onClick={handleMultiSubmit}
                      disabled={selectedChoiceIds.length === 0}
                      className="bg-indigo-600! hover:bg-indigo-700! text-white! font-bold py-3 px-8 rounded-xl shadow-md capitalize"
                    >
                      Submit Answer
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Back Side (Explanation) */}
          <div className="[grid-area:1/1] bg-indigo-600 border-2 border-indigo-700 rounded-[2.5rem] p-8 md:p-12 text-white [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between gap-8">
            <div className="space-y-8 text-center">
              {!isFlashcardMode && (
                <>
                  <div className="flex justify-center">
                    {isCorrectEval ? (
                      <div className="bg-green-400 p-4 rounded-full shadow-lg shadow-green-500/50">
                        <CheckCircleIcon className="h-16 w-16 text-white" />
                      </div>
                    ) : (
                      <div className="bg-rose-400 p-4 rounded-full shadow-lg shadow-rose-500/50">
                        <XCircleIcon className="h-16 w-16 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-4xl font-black uppercase tracking-widest">
                      {isCorrectEval ? "Amazing!" : "Not Quite..."}
                    </h4>
                    <p className="text-indigo-100 italic">
                       {isCorrectEval 
                          ? "You nailed it!" 
                          : `The correct answer was: ${currentQuestion.choices?.filter(c => c.is_correct).map(c => c.text).join(' AND ')}`
                       }
                    </p>
                  </div>
                </>
              )}

              <div className="bg-indigo-500/30 rounded-3xl p-8 backdrop-blur-sm border border-indigo-400/30 text-left">
                <div className="flex items-center gap-2 mb-3 text-indigo-200 uppercase text-xs font-bold tracking-widest">
                  <AcademicCapIcon className="h-4 w-4" />
                  {isFlashcardMode ? "Answer" : "Post-Mortem Explanation"}
                </div>
                <p className="text-lg leading-relaxed text-indigo-50 whitespace-pre-wrap">
                  {currentQuestion.explanation}
                </p>
              </div>

              {/* Mnemonic Generation Section */}
              {isFlashcardMode && (
                <div className="mt-4">
                  {!mnemonicText ? (
                    <button
                      onClick={handleGenerateMnemonic}
                      disabled={isGeneratingMnemonic}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-700/50 hover:bg-indigo-500 text-indigo-100 hover:text-white rounded-2xl font-bold transition-all border border-indigo-500 shadow-sm shadow-indigo-900/20 disabled:opacity-50"
                    >
                      {isGeneratingMnemonic ? (
                        <>
                          <CircularProgress size={20} color="inherit" />
                          <span>Brewing trick...</span>
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-5 w-5 text-yellow-300" />
                          <span>Give me a memory trick ✨</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-6 text-left animate-in zoom-in-95 duration-300 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
                       <div className="flex items-center gap-2 mb-2 text-yellow-200 uppercase text-xs font-bold tracking-widest">
                         <SparklesIcon className="h-4 w-4 text-yellow-400" />
                         Memory Trick
                       </div>
                       <p className="text-yellow-50 font-medium leading-relaxed italic text-lg whitespace-pre-wrap">
                         {mnemonicText}
                       </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-center mt-8">
              <Button 
                onClick={handleNext}
                endIcon={<ArrowRightIcon className="h-5 w-5" />}
                className="bg-indigo-700! text-white! hover:bg-indigo-800! px-8 py-3 rounded-xl font-bold capitalize text-lg border border-indigo-500 transition-colors"
                style={{ color: 'white' }}
              >
                {currentQuestionIndex < questions.length - 1 ? 
                  (isFlashcardMode ? "Next Card" : "Next Question") 
                  : "Finish"
                }
              </Button>
            </div>
          </div>

        </div>
      </div>

      <div className="flex justify-between items-center text-gray-400 px-4">
         <p className="text-xs font-medium uppercase tracking-widest">Interactive Study Mode Enabled</p>
         <button className="hover:text-indigo-600 transition-colors">Report an issue</button>
      </div>
    </div>
  );
};

export default QuizView;
