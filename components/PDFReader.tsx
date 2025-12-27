
import React, { useState, useEffect, useRef } from 'react';
import { Book, Annotation, GroundingSource, AnnotationType, Point } from '../types';
import { researchTopic, editBookCover } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface PDFReaderProps {
  book: Book;
  onClose: () => void;
  onUpdateBook: (book: Book) => void;
}

const PDFReader: React.FC<PDFReaderProps> = ({ book, onClose, onUpdateBook }) => {
  const [numPages, setNumPages] = useState<number | null>(book.totalPages);
  const [currentPage, setCurrentPage] = useState(book.currentPage);
  const [scale, setScale] = useState(1.2);
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<{ text: string, sources: GroundingSource[] } | null>(null);
  const [researchQuery, setResearchQuery] = useState('');
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [activeTool, setActiveTool] = useState<AnnotationType>('highlight');
  const [isExporting, setIsExporting] = useState(false);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(book.dataUrl);
        const pdf = await loadingTask.promise;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        renderPage(currentPage, scale);
      } catch (err) {
        console.error("PDF Load Error:", err);
      }
    };
    loadPdf();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [book.dataUrl]);

  useEffect(() => {
    if (currentPage !== book.currentPage) {
      onUpdateBook({ ...book, currentPage });
    }
  }, [currentPage]);

  const renderPage = async (pageNumber: number, currentScale: number) => {
    if (!pdfRef.current || !canvasRef.current || !textLayerRef.current) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale: currentScale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };
        
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        renderTaskRef.current = null;
        
        drawPageAnnotations(context, viewport, pageNumber);
      }

      const textLayerDiv = textLayerRef.current;
      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      const textContent = await page.getTextContent();
      const textLayer = new (pdfjsLib as any).TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: viewport
      });
      await textLayer.render();

    } catch (err: any) {
      if (err.name === 'RenderingCancelledException') return;
      console.error("Error rendering page:", err);
    }
  };

  const drawPageAnnotations = (ctx: CanvasRenderingContext2D, viewport: any, pageNum: number) => {
    const pageAnnotations = book.annotations.filter(a => a.pageNumber === pageNum);
    pageAnnotations.forEach(ann => {
      if (ann.type === 'highlight' && ann.rect) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(254, 240, 138, 0.5)';
        ctx.fillRect(ann.rect.x * viewport.scale, ann.rect.y * viewport.scale, ann.rect.width * viewport.scale, ann.rect.height * viewport.scale);
        ctx.restore();
      } else if (ann.type === 'draw' && ann.path) {
        ctx.save();
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 2 * viewport.scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ann.path.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x * viewport.scale, pt.y * viewport.scale);
          else ctx.lineTo(pt.x * viewport.scale, pt.y * viewport.scale);
        });
        ctx.stroke();
        ctx.restore();
      }
    });
  };

  useEffect(() => {
    renderPage(currentPage, scale);
  }, [currentPage, scale, book.annotations]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || activeTool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setCurrentPath(prev => [...prev, { x, y }]);

    // Temporary draw on canvas for smooth feedback
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const lastPt = currentPath[currentPath.length - 1];
      ctx.moveTo(lastPt.x * scale, lastPt.y * scale);
      ctx.lineTo(x * scale, y * scale);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentPath.length > 1) {
      const newAnnotation: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'draw',
        pageNumber: currentPage,
        color: '#ef4444',
        timestamp: Date.now(),
        path: currentPath
      };
      onUpdateBook({ ...book, annotations: [...book.annotations, newAnnotation] });
    }
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleTextSelection = () => {
    if (activeTool === 'draw') return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const selectionText = selection.toString().trim();
    if (!selectionText) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();

    if (canvasRect) {
      const relX = (rect.left - canvasRect.left) / scale;
      const relY = (rect.top - canvasRect.top) / scale;
      const relW = rect.width / scale;
      const relH = rect.height / scale;

      if (activeTool === 'highlight') {
        const newAnnotation: Annotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'highlight',
          pageNumber: currentPage,
          text: selectionText,
          color: '#fef08a',
          timestamp: Date.now(),
          rect: { x: relX, y: relY, width: relW, height: relH }
        };
        onUpdateBook({ ...book, annotations: [...book.annotations, newAnnotation] });
      } else if (activeTool === 'note') {
        const noteText = prompt("Add a note to this selection:");
        if (noteText) {
          const newAnnotation: Annotation = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'note',
            pageNumber: currentPage,
            text: `${selectionText} -> ${noteText}`,
            color: '#dcfce7',
            timestamp: Date.now()
          };
          onUpdateBook({ ...book, annotations: [...book.annotations, newAnnotation] });
        }
      }
      selection.removeAllRanges();
    }
  };

  const handleResearch = async () => {
    if (!researchQuery.trim()) return;
    setIsResearching(true);
    try {
      const result = await researchTopic(researchQuery);
      setResearchResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsResearching(false);
    }
  };

  const handleEditCover = async () => {
    if (!coverPrompt.trim() || !book.coverUrl) return;
    setIsEditingCover(true);
    try {
      const newCover = await editBookCover(book.coverUrl, coverPrompt);
      if (newCover) {
        onUpdateBook({ ...book, coverUrl: newCover });
        setCoverPrompt('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEditingCover(false);
    }
  };

  const exportAnnotatedPDF = async () => {
    setIsExporting(true);
    try {
      const existingPdfBytes = await fetch(book.dataUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      book.annotations.forEach(ann => {
        if (ann.pageNumber <= pages.length) {
          const page = pages[ann.pageNumber - 1];
          const { width, height } = page.getSize();
          
          if (ann.type === 'highlight' && ann.rect) {
            const pdfX = ann.rect.x * (width / (canvasRef.current!.width / scale));
            const pdfY = height - (ann.rect.y + ann.rect.height) * (height / (canvasRef.current!.height / scale));
            const pdfW = ann.rect.width * (width / (canvasRef.current!.width / scale));
            const pdfH = ann.rect.height * (height / (canvasRef.current!.height / scale));

            page.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              color: rgb(1, 1, 0),
              opacity: 0.3,
            });
          } else if (ann.type === 'draw' && ann.path) {
            // Mapping path points to PDF space
            const pdfPoints = ann.path.map(pt => ({
              x: pt.x * (width / (canvasRef.current!.width / scale)),
              y: height - pt.y * (height / (canvasRef.current!.height / scale))
            }));
            
            for (let i = 0; i < pdfPoints.length - 1; i++) {
              page.drawLine({
                start: pdfPoints[i],
                end: pdfPoints[i+1],
                thickness: 2,
                color: rgb(0.9, 0.2, 0.2),
                opacity: 0.8
              });
            }
          }
        }
      });

      const summaryPage = pdfDoc.addPage();
      summaryPage.drawText('Kskar Library Study Notes', { x: 50, y: summaryPage.getHeight() - 50, size: 24, font });
      let yOffset = summaryPage.getHeight() - 100;
      book.annotations.forEach((ann, i) => {
        if (ann.text || ann.type === 'draw') {
          const content = ann.text ? ann.text.substring(0, 80) : "Drawing / Sketch";
          summaryPage.drawText(`${i+1}. [Page ${ann.pageNumber}] ${content}`, { x: 50, y: yOffset, size: 10 });
          yOffset -= 20;
          if (yOffset < 50) return;
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${book.metadata.name}_Kskar_Annotated.pdf`;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-500 ${activeTool === 'draw' ? 'drawing-active' : ''}`}>
      <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center space-x-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div className="hidden sm:block">
            <h2 className="font-bold text-slate-900 leading-none truncate max-w-[200px]">{book.metadata.name}</h2>
            <p className="text-xs text-slate-400 mt-1">Kskar Reader Progress: {Math.round((currentPage/numPages!)*100)}%</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-100 rounded-xl flex p-1 border border-slate-200">
            <button 
              onClick={() => setActiveTool('highlight')}
              className={`p-2 rounded-lg transition-all ${activeTool === 'highlight' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Highlight Tool"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button 
              onClick={() => setActiveTool('draw')}
              className={`p-2 rounded-lg transition-all ${activeTool === 'draw' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Freehand Drawing"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button 
              onClick={() => setActiveTool('note')}
              className={`p-2 rounded-lg transition-all ${activeTool === 'note' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Note Tool"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
            </button>
          </div>

          <div className="bg-slate-100 rounded-lg flex p-1">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-white rounded shadow-sm text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
            </button>
            <span className="px-3 flex items-center text-xs font-bold text-slate-500">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-white rounded shadow-sm text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
          </div>
          
          <button 
            onClick={exportAnnotatedPDF}
            disabled={isExporting}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md flex items-center space-x-2 disabled:opacity-50"
          >
            {isExporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>}
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-slate-100 flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Book Details</h3>
            <div className="aspect-[3/4] rounded-2xl bg-slate-100 mb-4 overflow-hidden shadow-lg border border-slate-100">
              {book.coverUrl && <img src={book.coverUrl} className="w-full h-full object-cover" />}
            </div>
            <p className="text-xs text-slate-500 italic mb-4">"{book.metadata.summary}"</p>
            <div className="space-y-3">
               <h4 className="text-sm font-bold">Edit Cover (AI)</h4>
               <div className="relative">
                  <input type="text" placeholder="e.g., Add a retro filter" className="w-full text-xs p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-100" value={coverPrompt} onChange={(e) => setCoverPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEditCover()} />
                  {isEditingCover && <div className="absolute right-3 top-2.5 animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full" />}
               </div>
            </div>
          </div>

          <div className="p-6 border-b border-slate-50 bg-slate-50/30">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">Smart Research</h3>
            <div className="relative mb-4">
              <input type="text" placeholder="Ask Gemini..." className="w-full text-xs p-3 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-100" value={researchQuery} onChange={(e) => setResearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleResearch()} />
              <button onClick={handleResearch} disabled={isResearching} className="absolute right-2 top-2 p-1 text-indigo-500 hover:bg-indigo-50 rounded transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </button>
            </div>
            {researchResult && (
              <div className="text-xs space-y-4 animate-in fade-in">
                <p className="text-slate-600 line-clamp-6">{researchResult.text}</p>
              </div>
            )}
          </div>

          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Annotations</h3>
            <div className="space-y-4">
              {book.annotations.length === 0 ? <p className="text-[11px] text-slate-400 text-center py-10">Select text in PDF or use the pencil to draw.</p> : book.annotations.slice().reverse().map(ann => (
                <div key={ann.id} className={`p-3 rounded-xl border group relative cursor-pointer ${ann.type === 'highlight' ? 'bg-yellow-50 border-yellow-100' : ann.type === 'draw' ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`} onClick={() => setCurrentPage(ann.pageNumber)}>
                  <p className="text-[11px] line-clamp-2">{ann.text || (ann.type === 'draw' ? "Sketch" : "")}</p>
                  <div className="mt-2 flex items-center justify-between text-[9px] opacity-60">
                    <span>Page {ann.pageNumber}</span>
                    <button onClick={(e) => { e.stopPropagation(); onUpdateBook({ ...book, annotations: book.annotations.filter(a => a.id !== ann.id) }); }} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div 
          className="flex-1 flex flex-col items-center bg-slate-200/50 p-4 md:p-8 overflow-y-auto relative" 
          onMouseUp={handleMouseUp}
        >
          <div className="bg-white shadow-2xl rounded-sm mb-20 relative">
            <canvas 
              ref={canvasRef} 
              className="max-w-full h-auto cursor-text block" 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            />
            <div 
              ref={textLayerRef} 
              className="textLayer absolute inset-0 overflow-hidden pointer-events-auto" 
              onMouseUp={handleTextSelection}
            />
          </div>

          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-3xl flex items-center space-x-8 shadow-2xl border border-white/10 z-20">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div className="flex items-center space-x-2">
              <input type="number" value={currentPage} onChange={(e) => setCurrentPage(Math.min(numPages || 1, Math.max(1, parseInt(e.target.value) || 1)))} className="w-12 bg-transparent text-center border-b border-white/30 focus:border-white focus:outline-none font-bold" />
              <span className="text-white/40 font-medium">/ {numPages}</span>
            </div>
            <button disabled={currentPage >= (numPages || 0)} onClick={() => setCurrentPage(p => Math.min(numPages || 1, p + 1))} className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFReader;
