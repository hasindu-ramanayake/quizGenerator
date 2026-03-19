import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudArrowUpIcon, DocumentIcon, SparklesIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { Button, Slider, Typography, Switch, CircularProgress } from '@mui/material';
import { documentService } from '../services/apiService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [questionsCount, setQuestionsCount] = useState(5);
  const [extendedSearch, setExtendedSearch] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(['MCQ']);
  const [isGenerating, setIsGenerating] = useState(false);

  const QUESTION_TYPES = [
    { id: 'MCQ', label: 'Multiple Choice' },
    { id: 'TRUE_FALSE', label: 'True / False' },
    { id: 'MCQ_MULTI', label: 'Tick the Box (Multi-Select)' }
  ];

  const handleTypeChange = (typeId) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setIsGenerating(true);
    try {
      // 1. Upload Document
      const uploadRes = await documentService.upload(file);
      const docId = uploadRes.data.id;

      // 2. Generate Quiz
      const quizRes = await documentService.generateQuiz(docId, questionsCount, file.name, selectedTypes.length > 0 ? selectedTypes : ['MCQ']);
      const quizId = quizRes.data.id;

      // 3. Navigate to Quiz
      navigate(`/quiz/${quizId}`);
    } catch (err) {
      console.error("Generation failed", err);
      alert("Failed to generate quiz. Please check your backend and LLM configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (!file) return;
    setIsGenerating(true);
    try {
      const uploadRes = await documentService.upload(file);
      const docId = uploadRes.data.id;

      const notesRes = await documentService.generateLectureNotes(docId, file.name, extendedSearch);
      
      navigate(`/lecture-note/${notesRes.data.id}`);
    } catch (err) {
      console.error("Notes Generation failed", err);
      alert("Failed to generate lecture notes. Please check your backend.");
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
          Create a New <span className="text-indigo-600">Quiz</span>
        </h1>
        <p className="mt-4 text-xl text-gray-500">
          Upload your study materials and let our AI agents generate a comprehensive quiz for you in seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative group">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept=".pdf"
            />
            <div className={`
              border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300
              ${file ? 'border-indigo-400 bg-indigo-50/30' : 'border-gray-200 hover:border-indigo-300 bg-gray-50/50 hover:bg-white'}
            `}>
              <div className="flex flex-col items-center">
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                  <CloudArrowUpIcon className={`h-10 w-10 ${file ? 'text-indigo-600' : 'text-gray-400'}`} />
                </div>
                {file ? (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-gray-900">{file.name}</p>
                    <p className="text-sm text-indigo-600 font-medium">Click or drag to replace</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-gray-900 text-pretty">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">Only PDF files are supported</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scoping Controls */}
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-indigo-500" />
              <h3 className="text-lg font-bold text-gray-900">Quiz Configuration</h3>
            </div>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-2">
                  <Typography className="text-sm font-semibold text-gray-700">Number of Questions</Typography>
                  <span className="text-sm font-bold text-indigo-600">{questionsCount}</span>
                </div>
                <Slider 
                  value={questionsCount} 
                  min={1} 
                  max={50} 
                  onChange={(e, val) => setQuestionsCount(val)}
                  sx={{ color: '#4f46e5' }}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">Extend Content</p>
                  <p className="text-xs text-gray-500 italic">Allow AI to search for additional context online</p>
                </div>
                <Switch 
                  checked={extendedSearch}
                  onChange={(e) => setExtendedSearch(e.target.checked)}
                  sx={{ 
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#4f46e5' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#4f46e5' }
                  }}
                />
              </div>

              <div>
                <Typography className="text-sm font-semibold text-gray-700 mb-4">Allowed Question Types</Typography>
                <div className="space-y-3">
                  {QUESTION_TYPES.map(type => (
                    <label key={type.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedTypes.includes(type.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-600"
                        checked={selectedTypes.includes(type.id)}
                        onChange={() => handleTypeChange(type.id)}
                      />
                      <span className={`text-sm font-medium ${selectedTypes.includes(type.id) ? 'text-indigo-900' : 'text-gray-600'}`}>
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedTypes.length === 0 && (
                  <p className="text-red-500 text-xs mt-2 font-medium">Please select at least one question type.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action / Help Section */}
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
            <SparklesIcon className="h-10 w-10 text-indigo-200 mb-4" />
            <h3 className="text-xl font-bold mb-4">Ready to test yourself?</h3>
            <p className="text-indigo-100 text-sm leading-relaxed mb-6">
              Our AI agents will analyze your document, extract core concepts, and create a personalized quiz to boost your memory.
            </p>
            <Button 
              fullWidth 
              variant="contained" 
              disabled={!file || isGenerating || selectedTypes.length === 0}
              onClick={handleGenerate}
              className={`py-4 rounded-xl font-bold bg-white text-indigo-600 hover:bg-indigo-50 disabled:bg-indigo-400 disabled:text-indigo-200 capitalize shadow-none transition-all flex items-center justify-center gap-2`}
            >
              {isGenerating ? (
                <>
                  <CircularProgress size={20} color="inherit" />
                  <span>Generating Quiz...</span>
                </>
              ) : (
                "Generate Quiz"
              )}
            </Button>
            
            <div className="relative flex py-5 items-center">
              <div className="grow border-t border-indigo-400/50"></div>
              <span className="shrink-0 mx-4 text-indigo-300 text-xs font-bold uppercase tracking-wider">OR</span>
              <div className="grow border-t border-indigo-400/50"></div>
            </div>

            <Button 
              fullWidth 
              variant="contained" 
              disabled={!file || isGenerating}
              onClick={handleGenerateNotes}
              className={`py-4 rounded-xl font-bold bg-indigo-500 text-white hover:bg-indigo-400 disabled:bg-indigo-400 disabled:text-indigo-200 capitalize shadow-none transition-all flex items-center justify-center gap-2 hover:shadow-lg`}
            >
              {isGenerating ? (
                <>
                  <CircularProgress size={20} color="inherit" />
                  <span>Enhancing Notes...</span>
                </>
              ) : (
                "Enhance Lecture Notes"
              )}
            </Button>

          </div>

          <div className="border border-gray-100 rounded-3xl p-6 bg-white">
            <h4 className="text-sm font-bold text-gray-900 mb-4">Supported Question Types</h4>
            <ul className="space-y-3">
              {['MCQ Flashcards', 'Fill in the Blanks', 'Tick the Box', 'Structured Answers'].map((type) => (
                <li key={type} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  {type}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
