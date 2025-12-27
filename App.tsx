
import React, { useState, useMemo } from 'react';
import { Book } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BookGallery from './components/BookGallery';
import PDFReader from './components/PDFReader';
import UploadZone from './components/UploadZone';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using the exact version matching the API in index.html
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

type SortOption = 'date' | 'progress' | 'size' | 'name';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');

  const selectedBook = books.find(b => b.id === selectedBookId);

  const handleAddBook = (newBook: Book) => {
    setBooks(prev => [...prev, newBook]);
    setSelectedBookId(newBook.id);
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
  };

  const filteredAndSortedBooks = useMemo(() => {
    let result = books.filter(b => 
      b.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.metadata.authors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.metadata.theme.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      switch (sortBy) {
        case 'progress':
          return (b.currentPage / b.totalPages) - (a.currentPage / a.totalPages);
        case 'size':
          return b.fileSize - a.fileSize;
        case 'name':
          return a.metadata.name.localeCompare(b.metadata.name);
        case 'date':
        default:
          return b.uploadDate - a.uploadDate;
      }
    });

    return result;
  }, [books, searchQuery, sortBy]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <Sidebar 
        onHome={() => setSelectedBookId(null)} 
        onUpload={() => setIsUploading(true)} 
        activeId={selectedBookId}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Header 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onUploadClick={() => setIsUploading(true)}
        />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {selectedBookId && selectedBook ? (
            <PDFReader 
              book={selectedBook} 
              onClose={() => setSelectedBookId(null)}
              onUpdateBook={handleUpdateBook}
            />
          ) : (
            <>
              <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-serif font-bold mb-2">My Library</h1>
                  <p className="text-slate-500">Your collection of AI-indexed knowledge.</p>
                </div>
                
                <div className="flex items-center space-x-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider">Sort:</span>
                  {(['date', 'progress', 'size', 'name'] as SortOption[]).map(option => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${sortBy === option ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              
              {books.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                  <div className="bg-blue-100 p-6 rounded-full mb-6 text-blue-600">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Your library is empty</h3>
                  <p className="text-slate-500 mb-6">Upload your first PDF to start building your AI-enhanced collection.</p>
                  <button 
                    onClick={() => setIsUploading(true)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                  >
                    Upload Ebook
                  </button>
                </div>
              ) : (
                <BookGallery 
                  books={filteredAndSortedBooks} 
                  onSelectBook={setSelectedBookId} 
                />
              )}
            </>
          )}
        </div>
      </main>

      {isUploading && (
        <UploadZone 
          onClose={() => setIsUploading(false)} 
          onBookAdded={handleAddBook} 
        />
      )}
    </div>
  );
};

export default App;
