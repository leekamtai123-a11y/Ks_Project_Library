
import React from 'react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  const progressPercent = Math.round((book.currentPage / book.totalPages) * 100);

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-2 transition-all cursor-pointer"
    >
      <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.metadata.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-200">
             <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
          </div>
        )}
        
        {/* Progress Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between text-white text-[10px] font-bold mb-1.5 px-1">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden backdrop-blur-sm">
            <div className="bg-indigo-400 h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white text-slate-900 px-6 py-2.5 rounded-full text-sm font-bold shadow-xl">Resume Reading</span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{book.metadata.theme}</p>
          <span className="text-[9px] font-bold text-slate-400">{formatFileSize(book.fileSize)}</span>
        </div>
        <h3 className="text-lg font-bold line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">{book.metadata.name}</h3>
        <p className="text-sm text-slate-500 mb-4 line-clamp-1">by {book.metadata.authors.join(', ')}</p>
        <div className="flex items-center text-xs text-slate-400 space-x-4">
          <span className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            <span>{book.totalPages} Pages</span>
          </span>
          <span className="flex items-center space-x-1">
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
             <span>{book.annotations.length} Notes</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
