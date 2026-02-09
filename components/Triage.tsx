
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InboxItem, AppTheme, QuizFeedbackType, Platform, ProcessingOptions, FileData } from '../types';
import { X, Check, ExternalLink, Loader2, List, PlayCircle, FileText, Hash, Undo2, ChevronRight, ChevronLeft, BookOpen, BrainCircuit, Terminal, FileUp, Sparkles, Layers, Zap, Search, ArrowRight, ArrowLeft, Inbox, Edit2, Play, CheckCircle2 } from 'lucide-react';
import { THEME_ACCENTS } from '../constants';

// Helper for basic markdown (Bold only for now)
const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
        (part.startsWith('**') && part.endsWith('**')) 
            ? <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong> 
            : part
    );
};

interface TriageProps {
  inbox: InboxItem[];
  theme: AppTheme;
  onKeep: (item: InboxItem, editedSummary?: string[], quizAnswers?: Record<number, number>, tags?: string[], editedTitle?: string) => void;
  onDiscard: (id: string) => void;
  onUndoDiscard?: (item: InboxItem) => void;
  onQuizFeedback?: (itemId: string, feedback: QuizFeedbackType, suppress: boolean) => void;
  onCapture: (url: string, options: ProcessingOptions) => Promise<void>;
}

export const ReasoningTrace: React.FC<{ title: string; platform: string; type?: 'triage' | 'synthesis' | 'forensic' | 'course'; isFinished?: boolean }> = ({ title, platform, type = 'triage', isFinished = false }) => {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  
  const baseSequence = useMemo(() => [
    `> [SYSTEM_INIT] Loading Neural Distillation Engine...`,
    `> Identifying signal from ${platform} stream...`,
    `> Parsing semantic structure of "${(title || "Unknown").substring(0, 32)}..."`,
    `> Extracting high-signal takeaways...`,
    `> Filtering redundant noise clusters...`,
    `> Mapping context to Global Brain Graph...`,
  ], [title, platform]);

  const loopSequence = useMemo(() => [
    `> Re-evaluating semantic density...`,
    `> Cross-referencing internal knowledge nodes...`,
    `> Optimizing retention pathways...`,
    `> Synthesizing key insights...`,
    `> Verifying factual consistency...`
  ], []);

  useEffect(() => {
    let currentIdx = 0;
    let loopIdx = 0;
    let timeoutId: any;
    let mounted = true;

    const addLine = () => {
      if (!mounted) return;

      if (currentIdx < baseSequence.length) {
        setVisibleLines(prev => [...prev, baseSequence[currentIdx]]);
        currentIdx++;
        timeoutId = setTimeout(addLine, Math.random() * 600 + 400);
      } else if (!isFinished) {
        setVisibleLines(prev => {
            const next = [...prev];
            if (next.length > 8) next.shift(); 
            next.push(loopSequence[loopIdx % loopSequence.length]);
            return next;
        });
        loopIdx++;
        timeoutId = setTimeout(addLine, 1500);
      } else {
        setVisibleLines(prev => [...prev, `> [DONE] Internalization signal ready.`]);
      }
    };

    addLine();

    return () => {
        mounted = false;
        clearTimeout(timeoutId);
    };
  }, [baseSequence, loopSequence, isFinished]);

  return (
    <div className="space-y-2 font-mono text-[10px] leading-relaxed text-[#00FF41] min-h-[160px] flex flex-col justify-end">
      {visibleLines.map((line, idx) => (
        <div key={idx} className="flex items-start animate-fade-in">
          <span className="opacity-90">{line}</span>
        </div>
      ))}
      {!isFinished && (
          <div className="flex items-center">
              <span className="inline-block w-1.5 h-3 bg-[#00FF41] ml-1 animate-pulse" />
          </div>
      )}
    </div>
  );
};

export const Triage: React.FC<TriageProps> = ({ inbox, theme, onKeep, onDiscard, onUndoDiscard, onQuizFeedback, onCapture }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [captureInput, setCaptureInput] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [currentQuizStep, setCurrentQuizStep] = useState(0);
  const [lastDiscarded, setLastDiscarded] = useState<InboxItem | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [mobileTab, setMobileTab] = useState<'read' | 'quiz'>('read');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz Interaction State in Triage
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [editedTitle, setEditedTitle] = useState("");

  useEffect(() => {
    // Only auto-select on desktop if no selection
    if (window.innerWidth >= 768 && (inbox || []).length > 0) {
      if (!selectedId || !inbox.find(i => i.id === selectedId)) setSelectedId(inbox[0].id);
    } else {
       if (selectedId && !inbox.find(i => i.id === selectedId)) setSelectedId(null);
    }
  }, [inbox.length, selectedId]);

  useEffect(() => {
    const item = inbox.find(i => i.id === selectedId);
    if (item && !item.isProcessing) {
        setSelectedAnswers({});
        setCurrentQuizStep(0);
        setIsTakingQuiz(false);
        // Initialize edit state
        setEditedSummary((item.summary || []).join('\n'));
        setEditedTitle(item.title);
        setIsEditing(false);
    }
  }, [selectedId, inbox]);
  
  // Paste support for files
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                         if (event.target?.result) {
                             setUploadedFiles(prev => [...prev, {
                                 mimeType: items[i].type,
                                 data: event.target!.result as string,
                                 name: `Pasted Image ${Date.now()}`
                             }]);
                         }
                    };
                    if (blob) reader.readAsDataURL(blob);
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const advanceSelection = (currentId: string) => {
      const currentIndex = inbox.findIndex(i => i.id === currentId);
      if (currentIndex === -1) return;
      // Prefer next item
      if (currentIndex < inbox.length - 1) {
          setSelectedId(inbox[currentIndex + 1].id);
      } else if (currentIndex > 0) {
          // If last item, go to previous
          setSelectedId(inbox[currentIndex - 1].id);
      } else {
          setSelectedId(null);
      }
  };

  const handleDiscard = (item: InboxItem) => {
      advanceSelection(item.id);
      setLastDiscarded(item);
      setShowUndo(true);
      onDiscard(item.id);
      setTimeout(() => setShowUndo(false), 5000);
  };

  const handleUndo = () => {
      if (lastDiscarded && onUndoDiscard) {
          onUndoDiscard(lastDiscarded);
          setLastDiscarded(null);
          setShowUndo(false);
      }
  };

  const handleKeepItem = (item: InboxItem) => {
      advanceSelection(item.id);
      onKeep(item, isEditing ? editedSummary.split('\n').filter(s => s.trim()) : undefined, selectedAnswers, undefined, isEditing ? editedTitle : undefined);
  };

  const handleCaptureSignal = async () => {
    if (!captureInput.trim() && uploadedFiles.length === 0) return;
    setIsCapturing(true);
    try {
        const targetUrl = captureInput.trim() || (uploadedFiles.length > 0 ? "File Upload" : "");
        await onCapture(targetUrl, { summaryPoints: 5, quizCount: 3, targetLanguage: 'English', files: uploadedFiles });
        setCaptureInput('');
        setUploadedFiles([]);
    } finally {
        setIsCapturing(false);
    }
  };

  const processFileList = (fileList: File[]) => {
      fileList.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
              setUploadedFiles(prev => [...prev, { mimeType: file.type, data: reader.result as string, name: file.name }]);
          };
          reader.readAsDataURL(file);
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFileList(Array.from(e.target.files));
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFileList(Array.from(e.dataTransfer.files));
      }
  };
  
  const removeFile = (index: number) => {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Quiz Handlers
  const handleAnswerSelect = (optionIndex: number) => {
      setSelectedAnswers(prev => ({...prev, [currentQuizStep]: optionIndex}));
      // Auto advance
      if (currentItem?.generatedQuiz && currentQuizStep < currentItem.generatedQuiz.length - 1) {
          setTimeout(() => setCurrentQuizStep(prev => prev + 1), 300);
      }
  };
  
  const currentItem = inbox.find(i => i.id === selectedId) || null;
  const accentClass = THEME_ACCENTS[theme];

  return (
    <div 
        className="h-full flex flex-col w-full overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
        {/* Full screen drop overlay */}
        {isDragging && (
            <div className="absolute inset-0 z-50 bg-blue-50/90 flex flex-col items-center justify-center border-4 border-blue-400 border-dashed m-4 rounded-3xl animate-pulse pointer-events-none">
                <FileUp className="w-16 h-16 text-blue-500 mb-4" />
                <h3 className="text-2xl font-bold text-blue-600">Drop Files to Analyze</h3>
            </div>
        )}

        {/* Input Header */}
        <div className="p-4 md:p-6 bg-white border-b border-gray-100 flex-shrink-0 z-20 shadow-sm relative">
            <div className="max-w-3xl mx-auto w-full relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="w-4 h-4" />
                </div>
                <input 
                    type="text"
                    value={captureInput}
                    onChange={(e) => setCaptureInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCaptureSignal();
                        }
                    }}
                    placeholder={uploadedFiles.length > 0 ? "Add context to your files..." : "Paste a URL, drag files, or type a thought..."}
                    className="w-full pl-10 pr-32 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all text-sm font-medium"
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-200 rounded-xl text-gray-500 transition" title="Upload File">
                        <FileUp className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleCaptureSignal}
                        disabled={!captureInput.trim() && uploadedFiles.length === 0}
                        className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center"
                    >
                        {isCapturing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                    </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
            </div>
            
            {/* File Previews */}
            {uploadedFiles.length > 0 && (
                <div className="max-w-3xl mx-auto w-full mt-3 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {uploadedFiles.map((f, i) => (
                        <div key={i} className="relative group flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                            {f.mimeType.startsWith('image/') ? <img src={f.data} className="w-full h-full object-cover" /> : <FileText className="w-5 h-5 text-gray-400" />}
                            <button onClick={() => removeFile(i)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white transition-opacity"><X className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            {/* LEFT: List */}
            <div className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-gray-100 bg-gray-50/50 overflow-hidden`}>
                <div className="p-3 bg-gray-100/50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-widest sticky top-0 backdrop-blur-sm z-10 flex justify-between items-center">
                    <span>Pending Signals ({inbox.length})</span>
                    {inbox.length > 0 && <span className="text-blue-500">{inbox.filter(i => i.isProcessing).length} Processing</span>}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {inbox.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 opacity-40">
                            <Inbox className="w-12 h-12 mb-2 text-gray-400" />
                            <p className="text-xs font-bold text-gray-500">Inbox Zero</p>
                        </div>
                    ) : (
                        inbox.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => setSelectedId(item.id)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all relative group ${selectedId === item.id ? 'bg-white border-black shadow-md z-10' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase tracking-widest">{item.platform}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDiscard(item); }} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                                </div>
                                <h4 className={`text-sm font-bold leading-snug ${selectedId === item.id ? 'text-gray-900' : 'text-gray-600'}`}>{item.title}</h4>
                                {item.isProcessing && (
                                    <div className="mt-3 flex items-center text-[10px] font-bold text-blue-500 animate-pulse">
                                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                        {item.thinking || "Analyzing signal..."}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: Detail */}
            <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white overflow-hidden relative`}>
                {currentItem ? (
                    currentItem.isProcessing ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-black text-white relative overflow-hidden">
                             <div className="absolute inset-0 bg-[#0c1117]">
                                <ReasoningTrace title={currentItem.title} platform={currentItem.platform} />
                             </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-4 md:p-8 flex items-start justify-between z-10">
                                <div className="flex-1 mr-4">
                                     <button onClick={() => setSelectedId(null)} className="md:hidden mb-4 flex items-center text-xs font-bold text-gray-500"><ChevronLeft className="w-3 h-3 mr-1" /> Back</button>
                                     <div className="flex items-center space-x-2 mb-2">
                                         <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-black text-gray-500 uppercase tracking-widest">{currentItem.platform}</span>
                                         <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900"><Edit2 className="w-3 h-3" /></button>
                                     </div>
                                     {isEditing ? (
                                         <input className="w-full text-3xl font-black text-gray-900 border-b border-gray-200 focus:outline-none focus:border-black" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} autoFocus />
                                     ) : (
                                         <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight">{currentItem.title}</h1>
                                     )}
                                </div>
                                <a href={currentItem.url} target="_blank" rel="noreferrer" className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition"><ExternalLink className="w-5 h-5" /></a>
                            </div>

                            <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto pb-32">
                                {/* Summary Card */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
                                    <div className="flex items-center space-x-2 mb-6">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><FileText className="w-5 h-5" /></div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Key Takeaways</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {isEditing ? (
                                            <textarea className="w-full h-96 p-4 border border-gray-200 rounded-xl text-lg leading-relaxed focus:outline-none resize-none" value={editedSummary} onChange={(e) => setEditedSummary(e.target.value)} />
                                        ) : (
                                            (currentItem.summary || []).map((point, idx) => (
                                                <div key={idx} className="flex items-start group">
                                                    <span className="mr-4 mt-2 w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-blue-50 transition-colors flex-shrink-0"></span>
                                                    <p className="text-lg text-gray-700 leading-relaxed">{renderMarkdown(point)}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Full Interactive Quiz in Triage */}
                                {currentItem.generatedQuiz && currentItem.generatedQuiz.length > 0 && (
                                    <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center space-x-2">
                                                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl"><Sparkles className="w-5 h-5" /></div>
                                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Knowledge Check</h3>
                                            </div>
                                            {!isTakingQuiz && Object.keys(selectedAnswers).length === 0 && (
                                                <button onClick={() => setIsTakingQuiz(true)} className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase hover:scale-105 transition-transform flex items-center">
                                                    <Play className="w-3 h-3 mr-2" /> Start Quiz
                                                </button>
                                            )}
                                        </div>

                                        {!isTakingQuiz && Object.keys(selectedAnswers).length === 0 ? (
                                            <div className="text-center py-4 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                                                <p className="text-gray-500 font-medium text-sm">Review this content with {currentItem.generatedQuiz.length} generated questions.</p>
                                                <div className="flex justify-center mt-3 gap-1">
                                                    {currentItem.generatedQuiz.map((_, i) => (
                                                        <div key={i} className="w-2 h-2 rounded-full bg-gray-300"></div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Question {currentQuizStep + 1} of {currentItem.generatedQuiz.length}</span>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => setCurrentQuizStep(Math.max(0, currentQuizStep - 1))} disabled={currentQuizStep === 0} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                                                        <button onClick={() => setCurrentQuizStep(Math.min(currentItem.generatedQuiz!.length - 1, currentQuizStep + 1))} disabled={currentQuizStep === currentItem.generatedQuiz.length - 1} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-6">
                                                    <h4 className="text-lg font-bold text-gray-900 mb-6 leading-relaxed">{currentItem.generatedQuiz[currentQuizStep].question}</h4>
                                                    <div className="space-y-3">
                                                        {currentItem.generatedQuiz[currentQuizStep].options.map((opt, i) => (
                                                            <button 
                                                                key={i}
                                                                onClick={() => handleAnswerSelect(i)}
                                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center group ${selectedAnswers[currentQuizStep] === i ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-100 hover:border-gray-300 bg-white text-gray-700'}`}
                                                            >
                                                                <span className="text-sm font-medium">{opt}</span>
                                                                {selectedAnswers[currentQuizStep] === i && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                {Object.keys(selectedAnswers).length === currentItem.generatedQuiz.length && (
                                                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center justify-between animate-fade-in">
                                                        <div className="flex items-center text-green-700 font-bold text-sm">
                                                            <CheckCircle2 className="w-5 h-5 mr-2" />
                                                            Quiz Completed!
                                                        </div>
                                                        <span className="text-xs text-green-600">Answers will be saved with note.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Sticky Action Footer */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-between items-center z-20">
                                <button onClick={() => handleDiscard(currentItem)} className="px-6 py-3 rounded-2xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">Discard Signal</button>
                                <button 
                                    onClick={() => handleKeepItem(currentItem)} 
                                    className="px-8 py-3 rounded-2xl bg-black text-white font-bold text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center"
                                >
                                    <Check className="w-4 h-4 mr-2" /> Keep as Asset
                                </button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-soft mb-6 animate-float">
                            <Layers className="w-10 h-10 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">Select a Signal</h2>
                        <p className="text-gray-400 text-sm max-w-xs text-center leading-relaxed">Choose an item from the inbox to distill, analyze, and internalize.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Undo Toast */}
        {showUndo && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full flex items-center shadow-2xl animate-slide-up z-50">
                <span className="text-xs font-bold mr-4">Signal Discarded</span>
                <button onClick={handleUndo} className="flex items-center text-xs font-bold text-blue-400 hover:text-white transition"><Undo2 className="w-3 h-3 mr-1" /> Undo</button>
            </div>
        )}
    </div>
  );
};
