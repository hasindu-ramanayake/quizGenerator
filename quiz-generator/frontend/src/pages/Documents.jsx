import React, { useState, useEffect } from 'react';
import { documentService, getMediaUrl } from '../services/apiService';
import { ArrowPathIcon, DocumentTextIcon, ArrowTopRightOnSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await documentService.getAll();
        // Sort by uploaded_at descending
        const sortedDocs = response.data.sort((a, b) => 
          new Date(b.uploaded_at) - new Date(a.uploaded_at)
        );
        setDocuments(sortedDocs);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleOpenPdf = (fileUrl) => {
    window.open(getMediaUrl(fileUrl), '_blank');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent opening the PDF
    if (!window.confirm("Are you sure you want to delete this document? This will also delete any associated quizzes.")) return;
    
    try {
      await documentService.delete(id);
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
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
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">All Documents</h1>
        <p className="text-gray-500 font-medium">View all the PDF documents you have uploaded.</p>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
           <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-500 font-medium text-lg">You haven't uploaded any documents yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div 
                key={doc.id} 
                onClick={() => handleOpenPdf(doc.file)}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-400 cursor-pointer transition-all group flex flex-col justify-between h-56"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                   <div className="p-3 bg-red-50 rounded-2xl group-hover:bg-red-500 transition-colors">
                     <DocumentTextIcon className="h-6 w-6 text-red-500 group-hover:text-white transition-colors" />
                   </div>
                   <div className="flex items-center text-xs font-bold text-gray-500 gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                     PDF Document
                   </div>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-gray-900 line-clamp-3 leading-tight group-hover:text-indigo-600 transition-colors">{doc.title}</h3>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 text-sm text-gray-400 font-medium">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleDelete(e, doc.id)}
                      className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete Document"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                    <span>
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;
