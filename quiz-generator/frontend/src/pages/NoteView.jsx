import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lectureNoteService } from '../services/apiService';
import { ArrowLeftIcon, ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';

const NoteView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await lectureNoteService.getById(id);
        setNote(response.data);
      } catch (err) {
        setError('Failed to load lecture note.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [id]);

  const exportNoteToPDF = () => {
     if (!note) return;
     const doc = new jsPDF('p', 'pt', 'a4');
     const pageHeight = doc.internal.pageSize.getHeight();
     const pageWidth = doc.internal.pageSize.getWidth();
     const margin = 50;
     const contentWidth = pageWidth - margin * 2;
     let currentY = margin;

     // Simple Markdown to PDF parser (Text only)
     // Removes bold/italic syntax and draws raw text block by block.
     const rawText = note.content;
     const paragraphs = rawText.split('\n\n');

     // Title
     doc.setFont("helvetica", "bold");
     doc.setFontSize(22);
     doc.setTextColor('#4f46e5');
     const titleLines = doc.splitTextToSize(note.title, contentWidth);
     doc.text(titleLines, margin, currentY + 22);
     currentY += (titleLines.length * 22) + 20;

     // Body
     paragraphs.forEach((p) => {
         // Clean basic markdown (naive)
         let cleanText = p.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/#(.*?)\n/g, '$1\n').replace(/```(.*?)```/gs, '[Code Block omitted]');
         
         let isHeading = p.trim().startsWith('#');
         let isQuote = p.trim().startsWith('>');

         if (isHeading) cleanText = cleanText.replace(/#/g, '').trim();
         if (isQuote) cleanText = cleanText.replace(/>/g, '').trim();

         doc.setFont("helvetica", isHeading ? "bold" : (isQuote ? "italic" : "normal"));
         doc.setFontSize(isHeading ? 16 : (isQuote ? 11 : 12));
         doc.setTextColor(isQuote ? '#666666' : '#222222');

         const lines = doc.splitTextToSize(cleanText, isQuote ? contentWidth - 20 : contentWidth);
         const size = doc.getFontSize();
         const blockHeight = lines.length * (size * 1.5);

         if (currentY + blockHeight > pageHeight - margin) {
             doc.addPage();
             currentY = margin;
         }

         doc.text(lines, isQuote ? margin + 20 : margin, currentY + size);
         currentY += blockHeight + (size * 0.5) + 10;
     });

     const filename = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
     doc.save(filename);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-20">
        <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button onClick={() => navigate('/lecture-notes')} className="text-indigo-600 hover:underline">
          Go back to Lecture Notes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500 pb-20">
       <button 
        onClick={() => navigate('/lecture-notes')}
        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors mb-8 font-bold"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to Library
      </button>

      <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100">
         <div className="flex justify-between items-start mb-10 border-b border-gray-100 pb-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900 leading-tight mb-2 tracking-tight">{note.title}</h1>
              <p className="text-gray-400 font-medium">
                Generated {new Date(note.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
               onClick={exportNoteToPDF}
               className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl font-bold transition-all shrink-0"
               title="Export as PDF"
            >
               <ArrowDownTrayIcon className="h-5 w-5" />
               Export PDF
            </button>
         </div>

         <div className="prose prose-lg prose-indigo max-w-none text-gray-700 leading-relaxed" ref={contentRef}>
            <ReactMarkdown>{note.content}</ReactMarkdown>
         </div>
      </div>
    </div>
  );
};

export default NoteView;
