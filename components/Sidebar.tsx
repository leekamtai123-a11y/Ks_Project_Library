
import React from 'react';

interface SidebarProps {
  onHome: () => void;
  onUpload: () => void;
  activeId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ onHome, onUpload, activeId }) => {
  return (
    <div className="w-20 md:w-64 bg-white border-r border-slate-100 flex flex-col items-center md:items-stretch py-8 transition-all">
      <div className="px-4 mb-10 flex items-center space-x-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
          A
        </div>
        <span className="hidden md:block text-xl font-serif font-bold tracking-tight">Aura Library</span>
      </div>

      <nav className="flex-1 px-4 space-y-4 w-full">
        <button 
          onClick={onHome}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${!activeId ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          <span className="hidden md:block">Home</span>
        </button>
        
        <button 
          onClick={onUpload}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          <span className="hidden md:block">Upload</span>
        </button>

        <div className="pt-4 border-t border-slate-50 hidden md:block">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">My Collections</p>
          <button className="w-full text-left px-4 py-2 text-slate-500 hover:text-indigo-600 transition-colors">Personal</button>
          <button className="w-full text-left px-4 py-2 text-slate-500 hover:text-indigo-600 transition-colors">Reference</button>
        </div>
      </nav>

      <div className="px-4 mt-auto">
        {/* Premium section removed per user request */}
      </div>
    </div>
  );
};

export default Sidebar;
