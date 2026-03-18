import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky Header */}
      <Header />
      
      <div className="flex flex-1">
        {/* Fixed Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:ml-64 min-h-[calc(100vh-64px)]">
          <main className="flex-1 bg-white">
            <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Layout;
