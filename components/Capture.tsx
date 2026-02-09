
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Link, Check, Loader2, AlertCircle, Zap, FileUp, Image as ImageIcon, X } from 'lucide-react';
import { AppTheme, ProcessingOptions, FileData } from '../types';
import { THEME_ACCENTS } from '../constants';

interface CaptureProps {
  theme: AppTheme;
  onCapture: (url: string, options: ProcessingOptions) => Promise<void>;
}

export const Capture: React.FC<CaptureProps> = ({ theme, onCapture }) => {
  const [url, setUrl] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [summaryPoints, setSummaryPoints] = useState(3);
  const [quizCount, setQuizCount] = useState(3);
  const [language] = useState('English');
  const [sourceLanguage] = useState('Auto');

  // Drag & Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  
  const processFiles = (files: FileList) => {
      const newFiles: FileData[] = [];
      const promises: Promise<void>[] = [];

      Array.from(files).forEach(file => {
          // Strict check on client side for drag and drop to avoid bad UX
          if (
              file.type.startsWith('image/') || 
              file.type === 'application/pdf' || 
              file.type.startsWith('text/') || 
              file.type.startsWith('video/') ||
              file.type.startsWith('audio/')
          ) {
              const promise = new Promise<void>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      newFiles.push({
                          mimeType: file.type,
                          data: reader.result as string,
                          name: file.name
                      });
                      resolve();
                  };
                  reader.readAsDataURL(file);
              });
              promises.push(promise);
          } else {
              setError(`Skipped ${file.name}: Unsupported format. Use PDF, Image, Audio, or Video.`);
          }
      });

      Promise.all(promises).then(() => {
          setUploadedFiles(prev => [...prev, ...newFiles]);
          // Clear error after 4s
          setTimeout(() => setError(null), 4000);
      });
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(e.dataTransfer.files);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(e.target.files);
  };

  const removeFile = (index: number) => {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCapture = async () => {
    // Validation: Needs either a URL OR files
    if (!url.trim() && uploadedFiles.length === 0) {
        setError("Please enter a URL or upload a file.");
        return;
    }
    setError(null);
    setIsCapturing(true);

    try {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = url.match(urlRegex);
        const targetUrl = url.trim();

        // 1. Process URL(s) if present
        if (matches && matches.length > 0) {
             for (const link of matches) {
                 await onCapture(link, { 
                    summaryPoints, 
                    quizCount, 
                    targetLanguage: language,
                    sourceLanguage: sourceLanguage,
                    files: [] // Links don't get files attached automatically in bulk mode
                });
             }
        } else if (targetUrl && targetUrl !== "File Upload") {
             // Handle text-only input as context or generic URL
             await onCapture(targetUrl, { 
                summaryPoints, 
                quizCount, 
                targetLanguage: language,
                sourceLanguage: sourceLanguage,
                files: []
            });
        }

        // 2. Process Files Individually (Separate Items)
        if (uploadedFiles.length > 0) {
             for (const file of uploadedFiles) {
                 await onCapture("File Upload", {
                    summaryPoints, 
                    quizCount, 
                    targetLanguage: language,
                    sourceLanguage: sourceLanguage,
                    // Use URL text as context if it wasn't a valid link (e.g. user typed a note)
                    contextText: !matches && targetUrl ? targetUrl : undefined,
                    files: [file] // Send one file per item
                 });
             }
        }
        
        setCaptured(true);
        setUrl('');
        setUploadedFiles([]);
        setTimeout(() => setCaptured(false), 3000);
    } catch (err) {
        setError("Failed to capture.");
    } finally {
        setIsCapturing(false);
    }
  };

  const accentClass = THEME_ACCENTS[theme];

  return (
    <div 
        className={`flex flex-col h-full justify-center items-center px-8 relative overflow-hidden bg-white/50 w-full transition-colors duration-300 ${isDragging ? 'bg-blue-50/80' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center border-4 border-blue-400 border-dashed rounded-3xl m-4 bg-white/80 backdrop-blur-sm pointer-events-none">
              <div className="flex flex-col items-center animate-bounce">
                  <FileUp className="w-16 h-16 text-blue-500 mb-4" />
                  <h3 className="text-2xl font-bold text-blue-600">Drop to Analyze</h3>
              </div>
          </div>
      )}

      <div className="z-10 w-full max-w-lg space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-3xl shadow-soft mb-2">
            <Zap className="w-8 h-8 text-yellow-500 fill-current" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-gray-900">
            Kno
          </h1>
          <p className="text-gray-500 font-medium text-lg">From Feed to Knowledge</p>
        </div>

        <div className="relative group space-y-4">
          {/* Main Input Area */}
          <div className={`relative bg-white rounded-2xl p-2 flex flex-col shadow-soft border transition-shadow hover:shadow-lg focus-within:shadow-xl focus-within:ring-4 focus-within:ring-gray-100 ${error ? 'border-red-300' : 'border-gray-100'}`}>
            
            {/* Text Input Row */}
            <div className="flex items-center w-full">
                <Link className={`ml-4 w-6 h-6 flex-shrink-0 ${error ? 'text-red-400' : 'text-gray-400'}`} />
                <input 
                type="text"
                placeholder={uploadedFiles.length > 0 ? "Add context about these files..." : "Paste link or drag files..."}
                className="w-full bg-transparent text-gray-800 p-5 font-medium focus:outline-none placeholder-gray-400 text-lg"
                value={url}
                onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCapture();
                    }
                }}
                />
                <div className="flex items-center pr-2 space-x-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Upload File">
                        <FileUp className="w-5 h-5" />
                    </button>
                    <button 
                    onClick={handleCapture}
                    disabled={isCapturing}
                    className={`p-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center min-w-[50px] ${accentClass} ${isCapturing ? 'opacity-80' : ''}`}
                    >
                    {isCapturing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* File Previews */}
            {uploadedFiles.length > 0 && (
                <div className="flex gap-2 px-4 pb-4 overflow-x-auto no-scrollbar">
                    {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="relative group/file flex-shrink-0 w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                            {file.mimeType.startsWith('image/') ? (
                                <img src={file.data} className="w-full h-full object-cover" alt="preview" />
                            ) : (
                                <span className="text-[9px] font-bold text-gray-500 uppercase p-1 text-center break-words leading-tight">{file.name?.slice(0, 10)}</span>
                            )}
                            <button 
                                onClick={() => removeFile(idx)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                multiple 
                accept="image/*,application/pdf,audio/*,video/*,text/*"
            />
          </div>

          {error && (
              <div className="flex items-center justify-center space-x-2 text-sm font-bold text-red-500 animate-slide-up">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
              </div>
          )}

          {/* Options Panel */}
          <div className="bg-white/60 rounded-2xl p-6 border border-gray-100/50 flex flex-col space-y-4 animate-slide-up">
              <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Processing Options</span>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500">Summary Depth</label>
                      <div className="relative">
                          <select 
                              value={summaryPoints}
                              onChange={(e) => setSummaryPoints(parseInt(e.target.value))}
                              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none cursor-pointer appearance-none"
                          >
                              {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                                  <option key={num} value={num}>{num} {num === 1 ? 'Point' : 'Points'}</option>
                              ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500">Quiz Questions</label>
                      <div className="relative">
                          <select 
                              value={quizCount}
                              onChange={(e) => setQuizCount(parseInt(e.target.value))}
                              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none cursor-pointer appearance-none"
                          >
                              {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                                  <option key={num} value={num}>{num} {num === 1 ? 'Question' : 'Questions'}</option>
                              ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        {captured && (
          <div className="absolute top-10 left-0 right-0 flex justify-center animate-slide-up z-50">
            <div className="bg-gray-900 text-white px-8 py-4 rounded-full flex items-center shadow-xl">
              <Check className="w-5 h-5 mr-3" />
              <span className="font-bold">Captured to Inbox</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
