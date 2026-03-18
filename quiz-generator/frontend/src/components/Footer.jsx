import React from 'react';
import { AcademicCapIcon } from '@heroicons/react/24/outline';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12 px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <AcademicCapIcon className="h-6 w-6 text-indigo-600" />
            <span className="text-lg font-bold text-gray-900">QuizGenius AI</span>
          </div>
          <p className="text-gray-500 text-sm max-w-sm leading-relaxed text-pretty">
            Empowering students with intelligent active recall. Our platform uses advanced LLM agents to turn your lecture notes into interactive learning experiences.
          </p>
        </div>
        
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Product</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Features</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Pricing</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Integrations</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Help Center</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-gray-400 text-xs">
          © {new Date().getFullYear()} QuizGenius AI. All rights reserved.
        </p>
        <div className="flex gap-6">
          <span className="text-xs text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors">Twitter</span>
          <span className="text-xs text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors">GitHub</span>
          <span className="text-xs text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors">Discord</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
