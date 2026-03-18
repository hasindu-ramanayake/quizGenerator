import React from 'react';
import { AcademicCapIcon, UserCircleIcon, BellIcon } from '@heroicons/react/24/outline';

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 w-full z-50 h-16 flex items-center">
      <div className="w-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 rounded-lg shadow-sm shadow-indigo-200">
            <AcademicCapIcon className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            QuizGenius AI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="/" className="text-sm text-gray-600 hover:text-indigo-600 font-semibold transition-colors">New Quiz</a>
          <a href="/quizzes" className="text-sm text-gray-500 hover:text-indigo-600 font-semibold transition-colors">My Quizzes</a>
        </nav>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-all">
            <BellIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-gray-900 leading-none">Alex Smith</span>
              <span className="text-[10px] text-indigo-600 font-medium tracking-wide transition-all">PRO STUDENT</span>
            </div>
            <UserCircleIcon className="h-8 w-8 text-gray-300" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
