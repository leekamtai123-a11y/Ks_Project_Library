
import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { extractBookMetadata } from '../services/geminiService';
import { Book, BookMetadata } from '../types';

interface UploadZoneProps {
  onClose: () => void;
  onBookAdded: (book: Book) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onClose, onBookAdded }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buffer processing effect
  useEffect(() => {
    if (queue.length > 0 && !isProcessing && currentFileIndex < queue.length) {
      processFile(queue[currentFileIndex]);
    }
  }, [queue, currentFileIndex, isProcessing]);

  const generateHighQualityThumbnail = (metadata: BookMetadata): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 600;
    canvas.height = 800;

    // Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 600, 800);
    const colors = ['#4f46e5', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    gradient.addColorStop(0, randomColor);
    gradient.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 800);

    // Overlay Pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 800; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(600, i + 200);
      ctx.stroke();
    }

    // Text Container
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    
    // Title
    ctx.font = 'bold 48px Inter, system-ui, sans-serif';
    const words = metadata.name.split(' ');
    let line = '';
    let y = 300;
    words.forEach(word => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 500 && line !== '') {
        ctx.fillText(line, 300, y);
        line = word + ' ';
        y += 60;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line, 300, y);

    // Author
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('by ' + (metadata.authors.join(', ') || 'Unknown'), 300, y + 80);

    // Theme Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    const themeText = metadata.theme.toUpperCase();
    const themeWidth = ctx.measureText(themeText).width;
    ctx.roundRect(300 - (themeWidth / 2) - 20, 100, themeWidth + 40, 40, 20);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText(themeText, 300, 126);

    return canvas.toDataURL('image/png');
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(10);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setProgress(30);
      const imageParts: any[] = [];
      for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        if (context) {
          // Add canvas to RenderParameters as required by newer versions of pdfjs-dist
          await (page as any).render({ canvasContext: context, viewport, canvas }).promise;
          imageParts.push({ inlineData: { data: canvas.toDataURL('image/png').split(',')[1], mimeType: 'image/png' } });
        }
      }
      
      setProgress(60);
      const metadata = await extractBookMetadata(imageParts);
      setProgress(90);

      // Generate the stylized clear thumbnail
      const coverUrl = generateHighQualityThumbnail(metadata);

      const newBook: Book = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        dataUrl: URL.createObjectURL(file),
        coverUrl,
        metadata,
        annotations: [],
        currentPage: 1,
        totalPages: pdf.numPages,
        uploadDate: Date.now(),
        fileSize: file.size
      };

      onBookAdded(newBook);
      
      if (currentFileIndex + 1 >= queue.length) {
        onClose();
      } else {
        setCurrentFileIndex(prev => prev + 1);
        setIsProcessing(false);
        setProgress(0);
      }
    } catch (error) {
      console.error("Failed to process PDF", error);
      setIsProcessing(false);
      // Move to next even on failure
      setCurrentFileIndex(prev => prev + 1);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfs.length > 0) {
      setQueue(pdfs);
      setCurrentFileIndex(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 transition-colors text-slate-400"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="p-10">
          {!isProcessing && queue.length === 0 ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Upload Library</h2>
              <p className="text-slate-500 mb-8">Select multiple PDF files. Gemini will process them sequentially.</p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-3xl p-12 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
              >
                <p className="text-slate-400 group-hover:text-indigo-500 font-medium">Click or drag and drop PDFs here</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple
                  accept=".pdf"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-24 h-24 relative mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                  <circle 
                    cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray={251.2} 
                    strokeDashoffset={251.2 * (1 - progress / 100)} 
                    className="text-indigo-600 transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-xl font-bold text-indigo-600">{progress}%</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Processing {currentFileIndex + 1} of {queue.length}
              </h2>
              <p className="text-slate-600 font-medium mb-1 truncate px-10">
                {queue[currentFileIndex]?.name}
              </p>
              <p className="text-slate-400 animate-pulse italic text-sm">Gemini is reading and generating custom cover...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
