import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Send, Sparkles, Zap, Mic, ArrowRight, Loader2, Target, Split, FileText, ToggleLeft, ToggleRight, Save, User, Quote, BookOpen, Image as ImageIcon, Download, ExternalLink, ChevronLeft, ChevronRight, Layers, ZoomIn, ZoomOut, Maximize, Edit2, Check, RefreshCw, ScanLine, Hand, PanelLeft, Eye, AlignLeft, ChevronDown, Brain, MessageSquare } from 'lucide-react';
import { AppTheme, Note, AgentAction, CanvasNode } from '../types';
import { GRADIENTS } from '../constants';
import { chatWithKAi, transcribeHandwriting } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'https://esm.sh/react-pdf@9.1.0?external=react,react-dom';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface KAiOrbProps {
  theme: AppTheme;
  library: Note[];
  incomingMessage?: { text: string; role: 'user' | 'model'; actions?: AgentAction[] } | null;
  isOpen: boolean;
  onSetOpen: (open: boolean) => void;
  isListening: boolean;
  isInputOpen: boolean; 
  onToggleInput: (v: boolean) => void;
  isProcessing: boolean;
  transcript: string;
  setTranscript: (text: string) => void;
  onProcess: (text?: string, context?: any[]) => void;
  selectedNodes?: CanvasNode[];
  activeContextItem?: Note | null; 
  onSaveInsight?: (question: string, answer: string, sourceTitle?: string) => void; 
  startAtIndex?: number; 
  showNeuralInput?: boolean; 
  onUpdateNote?: (note: Note) => void; 
}

interface Message {
  role: 'user' | 'model';
  text: string;
  actions?: AgentAction[];
}

type ChatContextMode = 'full' | 'synthesis' | 'asset';

export const KAiOrb: React.FC<KAiOrbProps> = ({ 
    theme, library, incomingMessage, isOpen, onSetOpen, isListening, isInputOpen, onToggleInput, isProcessing, transcript, setTranscript, onProcess, selectedNodes = [], activeContextItem, onSaveInsight, startAtIndex = 0, showNeuralInput = true, onUpdateNote
}) => {
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<Record<string, Message[]>>({});
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socraticMode, setSocraticMode] = useState(false);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);
  const [chatMode, setChatMode] = useState<ChatContextMode>('full');
  const [targetAssetIndex, setTargetAssetIndex] = useState(startAtIndex); 
  const [isContextDropdownOpen, setIsContextDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'extracted'>('summary');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0); 
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [tempText, setTempText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isTextRevealed, setIsTextRevealed] = useState(false);
  const isDraggingRef = useRef(false);

  const gradient = GRADIENTS[theme];

  useEffect(() => {
    if (isOpen && activeContextItem?.id) {
       setChatMode('full');
       setTargetAssetIndex(startAtIndex || 0);
    }
  }, [isOpen, activeContextItem?.id, startAtIndex]);

  const attachedFile = activeContextItem?.userFiles?.[targetAssetIndex];
  const totalFiles = activeContextItem?.userFiles?.length || 0;
  const isImageContext = (chatMode === 'asset' || chatMode === 'full') && attachedFile && attachedFile.startsWith('data:image');
  const isPdfContext = (chatMode === 'asset' || chatMode === 'full') && attachedFile && attachedFile.includes('application/pdf');
  const isTextContext = (chatMode === 'asset' || chatMode === 'full') && attachedFile && (attachedFile.startsWith('data:text') || attachedFile.startsWith('data:application/json'));

  useEffect(() => {
      setIsTextRevealed(false);
      setPdfScale(1.0);
      setCurrentPage(1); 
      if (chatMode === 'synthesis' || chatMode === 'full') {
          setViewMode('summary');
      } else if (activeContextItem?.extractedText && chatMode === 'asset') {
          setViewMode('extracted');
      }
  }, [chatMode, targetAssetIndex, activeContextItem?.id]);

  const currentSessionId = activeContextItem 
      ? `${activeContextItem.id}-${chatMode}${chatMode === 'asset' ? `-${targetAssetIndex}` : ''}` 
      : 'global';
  const messages = sessions[currentSessionId] || [];
  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
      setSessions(prev => {
          const current = prev[currentSessionId] || [];
          const updated = typeof newMessages === 'function' ? newMessages(current) : newMessages;
          return { ...prev, [currentSessionId]: updated };
      });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, chatMode]);

  const persona = useMemo(() => {
      if (!activeContextItem) return "Research Assistant";
      const text = (activeContextItem.title + " " + activeContextItem.tags?.join(" ")).toLowerCase();
      if (text.includes("marketing") || text.includes("sales")) return "Marketing Consultant";
      if (text.includes("finance") || text.includes("invest")) return "Financial Planner";
      if (text.includes("code") || text.includes("engineering")) return "Senior Engineer";
      if (text.includes("design") || text.includes("ux")) return "Design Critic";
      return "Subject Matter Expert";
  }, [activeContextItem?.id]); 

  const getActiveFileContext = () => {
      const indexToUse = chatMode === 'asset' ? targetAssetIndex : 0;
      const file = activeContextItem?.userFiles?.[indexToUse];
      if (!file) return null;
      const parts = file.split(',');
      if (parts.length !== 2) return null;
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : '';
      if (!mimeType) return null;
      return { mimeType, data: parts[1] };
  };

  const contextData = useMemo(() => {
      if (!activeContextItem) return { content: "", paragraphs: [] };
      let systemContext = "";
      if (chatMode === 'synthesis') {
          systemContext = `CONTEXT: SYNTHESIS ONLY\nThe user is focusing on their personal thoughts and synthesis.`;
      } else if (chatMode === 'asset') {
          systemContext = `CONTEXT: SPECIFIC ASSET (File ${targetAssetIndex + 1})\nThe user is looking at a specific file. Focus your answer on this file.\n${activeContextItem.extractedText ? `EXTRACTED TEXT FROM ASSET:\n"""\n${activeContextItem.extractedText}\n"""` : ''}`;
      } else {
          systemContext = `CONTEXT: FULL MEMORY\nConsider all available information: Summary, User Thoughts, and Assets.\nSUMMARY:\n"""\n${activeContextItem.summary.join('\n')}\n"""\n${activeContextItem.extractedText ? `ALL EXTRACTED TEXT:\n"""\n${activeContextItem.extractedText}\n"""` : ''}`;
      }
      if (activeContextItem.userThoughts) systemContext += `\nUSER'S SYNTHESIS/THOUGHTS:\n"""\n${activeContextItem.userThoughts}\n"""`;
      systemContext += `\n\nMETA:\nTitle: ${activeContextItem.title}\nTags: ${activeContextItem.tags.join(', ')}`;
      return { content: systemContext, paragraphs: activeContextItem.summary };
  }, [activeContextItem, chatMode, targetAssetIndex]);

  useEffect(() => {
      if (!isEditingText) {
          if (activeContextItem?.extractedText && (chatMode === 'asset' || (chatMode === 'full' && activeContextItem.extractedText))) {
              setTempText(activeContextItem.extractedText);
          } else {
              setTempText(contextData.paragraphs.join('\n\n'));
          }
      }
  }, [contextData, isEditingText, activeContextItem?.extractedText, chatMode]);

  const handleSaveText = () => {
      if (!activeContextItem || !onUpdateNote) return;
      if (chatMode === 'asset' || (activeContextItem.extractedText && chatMode === 'full')) {
          onUpdateNote({ ...activeContextItem, extractedText: tempText });
      } else {
          const newSummary = tempText.split(/\n\s*\n/).filter(s => s.trim());
          onUpdateNote({ ...activeContextItem, summary: newSummary });
      }
      setIsEditingText(false);
  };

  const handleScanImage = async () => {
      if (!attachedFile || !onUpdateNote || !activeContextItem) return;
      const indexToScan = chatMode === 'asset' ? targetAssetIndex : 0;
      const file = activeContextItem?.userFiles?.[indexToScan];
      if (!file) return;
      const parts = file.split(',');
      if (parts.length !== 2) return;
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : '';
      if (!mimeType) return;
      setIsScanning(true);
      try {
          const textLines = await transcribeHandwriting(parts[1], mimeType);
          const textBlock = textLines.join('\n');
          onUpdateNote({ ...activeContextItem, extractedText: textBlock });
          setIsTextRevealed(true);
      } catch (e) { console.error("Scan failed", e); } finally { setIsScanning(false); }
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    const fileContext = (chatMode === 'asset' || chatMode === 'full') ? getActiveFileContext() : null;
    try {
      const response = await chatWithKAi(userMsg, library, [], socraticMode, persona, contextData.content, fileContext);
      setMessages(prev => [...prev, { role: 'model', text: response || "I'm thinking..." }]);
    } catch (e) { setMessages(prev => [...prev, { role: 'model', text: "Connection issue." }]); } finally { setIsTyping(false); }
  };

  const renderFormattedText = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return (
          <span>
              {parts.map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                  const subParts = part.split(/(\[\d+\])/g);
                  return (
                      <span key={i}>
                          {subParts.map((subPart, j) => {
                              const match = subPart.match(/\[(\d+)\]/);
                              if (match) {
                                  const index = parseInt(match[1]);
                                  return (
                                      <button key={j} onMouseEnter={() => setHighlightedCitation(index)} onMouseLeave={() => setHighlightedCitation(null)} className="inline-flex items-center justify-center bg-blue-100 text-blue-700 text-[9px] font-bold rounded-full px-1.5 py-0.5 mx-0.5 align-middle hover:bg-blue-600 hover:text-white transition-colors cursor-pointer" > {index} </button>
                                  );
                              }
                              return subPart;
                          })}
                      </span>
                  );
              })}
          </span>
      );
  };

  const showBubble = showNeuralInput && (isInputOpen || isListening || (transcript.length > 0) || isProcessing);
  const handleDumpProcess = () => { onProcess(undefined, selectedNodes); };
  const hasMessages = messages.length > 0;

  useEffect(() => {
      if (isPdfContext && attachedFile) {
          try {
              if (attachedFile.startsWith('blob:')) { setPdfBlobUrl(attachedFile); return; }
              const parts = attachedFile.split(',');
              if (parts.length === 2) {
                  const cleanBase64 = parts[1].replace(/[\r\n]+/g, '');
                  const binaryStr = atob(cleanBase64);
                  const len = binaryStr.length;
                  const bytes = new Uint8Array(len);
                  for (let i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); }
                  const blob = new Blob([bytes], { type: 'application/pdf' });
                  const url = URL.createObjectURL(blob);
                  setPdfBlobUrl(url);
                  return () => { URL.revokeObjectURL(url); setPdfBlobUrl(null); };
              }
          } catch (e) { console.error("PDF Blob generation failed:", e); setPdfBlobUrl(null); }
      } else { setPdfBlobUrl(null); }
  }, [attachedFile, isPdfContext]);

  const handleDownload = () => {
      if (!attachedFile) return;
      const link = document.createElement('a');
      link.href = attachedFile;
      let ext = 'bin';
      if (isImageContext) ext = 'png'; if (isPdfContext) ext = 'pdf'; if (isTextContext) ext = 'txt';
      link.download = `kno-source-${Date.now()}.${ext}`;
      link.click();
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setCurrentPage(1);
    setPdfScale(1.0); 
    pageRefs.current = new Array(numPages).fill(null);
  }

  const scrollToPage = (pageIndex: number) => {
      if (pageRefs.current[pageIndex]) {
          pageRefs.current[pageIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setCurrentPage(pageIndex + 1);
      }
  };

  useEffect(() => {
      if (!pdfContainerRef.current || !numPages || !pdfBlobUrl) return;
      const container = pdfContainerRef.current;
      const observer = new IntersectionObserver(
          (entries) => {
              const visible = entries.filter(e => e.isIntersecting);
              if (visible.length > 0) {
                  const topMost = visible.reduce((prev, curr) => {
                      return (curr.intersectionRatio > prev.intersectionRatio) ? curr : prev;
                  });
                  const pageIndex = Number(topMost.target.getAttribute('data-page-index'));
                  if (!isNaN(pageIndex)) {
                      setCurrentPage(pageIndex + 1);
                  }
              }
          },
          { root: container, threshold: [0.1, 0.25, 0.5, 0.75, 1.0] }
      );
      pageRefs.current.forEach((el) => { if (el) observer.observe(el); });
      return () => observer.disconnect();
  }, [numPages, pdfBlobUrl, chatMode, pdfScale]);

  return (
    <>
      {showNeuralInput && (
          <motion.div drag dragMomentum={false} onDragStart={() => { isDraggingRef.current = true; }} onDragEnd={() => { setTimeout(() => { isDraggingRef.current = false; }, 100); }} whileDrag={{ scale: 1.1, cursor: 'grabbing' }} className="fixed z-[999] flex items-center justify-center cursor-grab touch-none" style={{ bottom: 32, right: 32 }} >
            <AnimatePresence>
                {showBubble && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: 20, y: 0 }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} exit={{ opacity: 0, scale: 0.9, x: 20, y: 0 }} className="absolute right-[76px] bottom-0 w-80 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl rounded-br-none overflow-hidden flex flex-col pointer-events-auto origin-bottom-right" >
                        <div className={`px-4 py-3 bg-gradient-to-r ${gradient} flex justify-between items-center`}>
                            <div className="flex flex-col">
                                <div className="flex items-center space-x-2 text-white">
                                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-pulse' : ''}`} />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Neural Dump'}</span>
                                </div>
                                {selectedNodes.length > 0 && !isProcessing && ( <div className="flex items-center mt-1 text-[9px] font-bold text-white/80"> <Target className="w-3 h-3 mr-1" /> <span>Focus: {selectedNodes[0].title?.substring(0,15)}{selectedNodes.length > 1 ? ` +${selectedNodes.length-1}` : ''}...</span> </div> )}
                            </div>
                            {(transcript || isInputOpen) && !isProcessing && ( <button onClick={() => { setTranscript(""); onToggleInput(false); }} className="text-white/50 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button> )}
                        </div>
                        <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDumpProcess(); } }} disabled={isProcessing} placeholder={isListening ? "Listening..." : "Type or speak..."} className="w-full h-32 p-4 text-sm bg-transparent border-none focus:outline-none resize-none text-gray-800 placeholder-gray-400 font-medium leading-relaxed" autoFocus />
                        <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50 flex justify-between items-center"> <span className="text-[9px] font-bold text-gray-400 uppercase"> {isListening ? 'Double-tap Space to Stop' : 'Press Enter to Generate'} </span> <button onClick={handleDumpProcess} disabled={!transcript.trim() && !isProcessing} className={`p-2.5 rounded-full transition-all ${transcript.trim() && !isProcessing ? 'bg-black text-white hover:scale-110 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`} > <ArrowRight className="w-4 h-4" /> </button> </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <button onClick={(e) => { if (isDraggingRef.current) { e.preventDefault(); e.stopPropagation(); return; } if (!showBubble) onSetOpen(true); }} className={`w-16 h-16 rounded-full shadow-2xl relative flex items-center justify-center bg-white transition-all duration-300 ${isListening ? 'ring-4 ring-red-100 scale-110' : 'hover:scale-105'} ${isOpen ? 'ring-4 ring-blue-100' : ''}`} >
                 <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${gradient} blur opacity-40 ${isListening ? 'animate-pulse' : ''}`}></div>
                 <div className="relative bg-white w-14 h-14 rounded-full flex items-center justify-center border border-gray-100 z-10 overflow-hidden">
                    {isProcessing ? ( <div className="absolute inset-0 bg-black flex items-center justify-center"> <Loader2 className="w-6 h-6 text-white animate-spin" /> </div> ) : isListening ? ( <Mic className="text-red-500 w-6 h-6 animate-bounce" /> ) : ( <Sparkles className="text-gray-900 w-6 h-6" /> )}
                 </div>
            </button>
          </motion.div>
      )}
      {isOpen && !showBubble && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-8" onClick={() => onSetOpen(false)} >
          <div className={`bg-white rounded-[32px] border border-gray-200 shadow-2xl overflow-hidden flex relative animate-scale-in transition-all duration-500 ${activeContextItem ? 'w-full max-w-7xl h-[85vh] flex-row' : 'w-full max-w-md h-[700px] flex-col'}`} onClick={(e) => e.stopPropagation()} >
            {activeContextItem && (
                <div className="w-[45%] bg-white flex flex-col h-full border-r border-gray-200 relative">
                    <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2 min-w-0">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block flex-shrink-0">Source Context:</span>
                                <div className="relative">
                                    <button onClick={() => setIsContextDropdownOpen(!isContextDropdownOpen)} className="flex items-center space-x-1.5 text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors" > <span> {chatMode === 'full' && '🧠 Full Memory'} {chatMode === 'synthesis' && '📝 Synthesis Only'} {chatMode === 'asset' && `📂 Asset ${targetAssetIndex + 1}`} </span> <ChevronDown className="w-3 h-3" /> </button>
                                    {isContextDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsContextDropdownOpen(false)} />
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl p-1 z-50 animate-fade-in">
                                                <button onClick={() => { setChatMode('full'); setIsContextDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center ${chatMode === 'full' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}> <Brain className="w-3.5 h-3.5 mr-2" /> Full Memory </button>
                                                <button onClick={() => { setChatMode('synthesis'); setIsContextDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center ${chatMode === 'synthesis' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}> <FileText className="w-3.5 h-3.5 mr-2" /> Synthesis Only </button>
                                                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                                <span className="px-3 py-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">Assets</span>
                                                {activeContextItem.userFiles?.map((_, idx) => ( <button key={idx} onClick={() => { setChatMode('asset'); setTargetAssetIndex(idx); setIsContextDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center ${chatMode === 'asset' && targetAssetIndex === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`} > {_.startsWith('data:image') ? <ImageIcon className="w-3.5 h-3.5 mr-2" /> : <BookOpen className="w-3.5 h-3.5 mr-2" />} Asset {idx + 1} </button> ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            {attachedFile && (chatMode === 'asset' || chatMode === 'full') && ( <button onClick={handleDownload} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition border border-gray-100" title="Download Asset"> <Download className="w-4 h-4" /> </button> )}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 relative p-6">
                        {chatMode === 'full' && (
                            <div className="flex flex-col h-full gap-6 overflow-y-auto no-scrollbar">
                                {activeContextItem.userThoughts && ( <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative"> <div className="flex items-center space-x-2 mb-4 text-blue-600"> <User className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">My Synthesis</span> </div> <div className="text-sm text-gray-700 leading-relaxed font-serif whitespace-pre-wrap"> {activeContextItem.userThoughts} </div> </div> )}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative"> <div className="flex items-center space-x-2 mb-4 text-gray-600"> <FileText className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Source Summary</span> </div> <div className="text-sm text-gray-700 leading-relaxed font-serif whitespace-pre-wrap space-y-4"> {activeContextItem.summary.map((para, i) => ( <p key={i}>{para}</p> ))} </div> </div>
                                {totalFiles > 0 && ( <div className="space-y-4"> <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Attached Assets ({totalFiles})</span> {activeContextItem.userFiles?.map((file, idx) => ( <div key={idx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm h-64 relative group"> {file.startsWith('data:image') ? ( <img src={file} className="w-full h-full object-contain bg-gray-50" /> ) : ( <div className="w-full h-full flex items-center justify-center bg-gray-50"><FileText className="w-12 h-12 text-gray-300" /></div> )} <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => { setChatMode('asset'); setTargetAssetIndex(idx); }}> <button className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg">Focus Asset</button> </div> </div> ))} </div> )}
                            </div>
                        )}
                        {chatMode === 'synthesis' && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 h-full overflow-y-auto relative animate-fade-in"> <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center"> <FileText className="w-5 h-5 mr-2 text-blue-600" /> My Synthesis </h3> <div className="text-sm text-gray-700 leading-relaxed font-serif whitespace-pre-wrap"> {activeContextItem.userThoughts ? ( activeContextItem.userThoughts ) : ( <div className="flex flex-col items-center justify-center h-48 opacity-50"> <Edit2 className="w-8 h-8 mb-2 text-gray-400" /> <p className="text-xs font-medium text-center">No personal synthesis recorded yet.<br/>Use the card in your library to add thoughts.</p> </div> )} </div> </div>
                        )}
                        {chatMode === 'asset' && attachedFile && (
                            <div className="flex-1 h-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 relative group/asset transition-all duration-300 animate-fade-in">
                                {isImageContext ? (
                                    <div className="w-full h-full relative">
                                        <div onClick={() => setLightboxImage(attachedFile)} className="w-full h-full cursor-zoom-in relative"> <img src={attachedFile} className="w-full h-full object-contain" alt="Source" /> <div className="absolute inset-0 bg-black/0 group-hover/asset:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/asset:opacity-100"> <Maximize className="w-8 h-8 text-white drop-shadow-md" /> </div> </div>
                                        {!activeContextItem.extractedText && ( <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"> <button onClick={handleScanImage} disabled={isScanning} className="bg-black/80 hover:bg-black text-white backdrop-blur-md px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl flex items-center transition-all hover:scale-105" > {isScanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ScanLine className="w-4 h-4 mr-2" />} Scan Text </button> </div> )}
                                        {activeContextItem.extractedText && ( <div className="absolute inset-x-4 bottom-4 bg-white/90 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg max-h-[40%] overflow-y-auto"> <div className="flex justify-between items-center mb-2"> <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Extracted Text</span> <button onClick={() => setIsEditingText(!isEditingText)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-3 h-3" /></button> </div> <p className="text-xs font-mono text-gray-800 whitespace-pre-wrap">{activeContextItem.extractedText}</p> </div> )}
                                    </div>
                                ) : isPdfContext && pdfBlobUrl ? (
                                    <div className="w-full h-full relative group/pdf bg-gray-100">
                                        <div ref={pdfContainerRef} className="w-full h-full overflow-auto p-4">
                                            <div className="flex flex-col items-center gap-4 min-h-min w-fit mx-auto">
                                                <Document file={pdfBlobUrl} onLoadSuccess={onDocumentLoadSuccess} loading={<div className="flex items-center justify-center h-20 text-gray-400 w-full"><Loader2 className="animate-spin mr-2 w-4 h-4"/> Loading PDF...</div>} error={<div className="flex items-center justify-center h-20 text-red-400 text-xs font-bold w-full">Error loading PDF</div>} className="shadow-lg" >
                                                    {Array.from(new Array(numPages), (el, index) => (
                                                        <div key={`page_${index + 1}`} className="mb-4 shadow-md bg-white" ref={el => { pageRefs.current[index] = el; }} data-page-index={index} > <Page pageNumber={index + 1} renderTextLayer={true} renderAnnotationLayer={false} scale={pdfScale} className="bg-white" /> </div>
                                                    ))}
                                                </Document>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2 bg-black/80 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/10 opacity-0 group-hover/pdf:opacity-100 transition-opacity flex-nowrap">
                                            <button onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 rounded-full hover:bg-white/20 text-white"><ZoomOut className="w-3 h-3" /></button>
                                            <span className="text-[10px] text-white font-mono px-2 whitespace-nowrap">{Math.round(pdfScale * 100)}%</span>
                                            <button onClick={() => setPdfScale(s => Math.min(3, s + 0.2))} className="p-1.5 rounded-full hover:bg-white/20 text-white"><ZoomIn className="w-3 h-3" /></button>
                                            <div className="w-px h-3 bg-white/20 mx-1 flex-shrink-0" />
                                            <button onClick={() => scrollToPage(Math.max(0, currentPage - 2))} className="p-1.5 rounded-full hover:bg-white/20 text-white"><ChevronLeft className="w-3 h-3" /></button>
                                            <span className="text-[10px] text-white font-mono px-2 whitespace-nowrap">{currentPage} / {numPages}</span>
                                            <button onClick={() => scrollToPage(Math.min((numPages || 1) - 1, currentPage))} className="p-1.5 rounded-full hover:bg-white/20 text-white"><ChevronRight className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400"> <FileText className="w-8 h-8 mb-2 opacity-50" /> <p className="text-xs font-medium">Preview Unavailable</p> </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className={`flex flex-col h-full bg-zinc-50 ${activeContextItem ? 'w-[55%]' : 'w-full'}`}>
               <div className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0 z-20">
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-full bg-gradient-to-br ${gradient} text-white shadow-md`}> <User className="w-5 h-5" /> </div>
                    <div>
                        <div className="flex items-center space-x-2"> <span className="font-black text-gray-900 text-sm tracking-wide">Ko</span> {activeContextItem && ( <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase rounded-md tracking-wider border border-blue-200"> {persona} </span> )} </div>
                        <div className="flex items-center space-x-1"> <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> <span className="text-[10px] font-medium text-gray-400">Online & Contextualized</span> </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                      <button onClick={() => setSocraticMode(!socraticMode)} className="flex items-center space-x-2 group bg-gray-100 hover:bg-gray-200 rounded-full p-1 pr-3 transition-colors" title={socraticMode ? "Socratic Mode: ON (Guided Learning)" : "Socratic Mode: OFF (Direct Answers)"} > <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all ${socraticMode ? 'bg-purple-600 text-white' : 'bg-white text-gray-400'}`}> {socraticMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />} </div> <span className={`text-[9px] font-bold uppercase tracking-widest ${socraticMode ? 'text-purple-700' : 'text-gray-500'}`}>Socratic</span> </button>
                      <div className="h-6 w-px bg-gray-200 mx-2"></div>
                      <button onClick={() => onSetOpen(false)} className="hover:bg-gray-200 rounded-full p-2 transition text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 relative">
                   {!hasMessages ? (
                       <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-fade-in select-none"> <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-2xl mb-8 transform hover:scale-105 transition-transform duration-500`}> <Sparkles className="w-12 h-12 text-white" /> </div> <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">I've analyzed this source.</h3> <p className="text-sm text-gray-500 max-w-xs leading-relaxed"> Acting as your <span className="text-blue-600 font-bold">{persona}</span>.<br/> Ask me anything to clarify, expand, or challenge the concepts on the left. </p> </div>
                   ) : (
                       <div className="space-y-6 pb-4">
                           {messages.map((msg, idx) => ( <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group/msg relative animate-slide-up`}> {msg.role === 'model' && ( <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm mr-3 mt-1 flex-shrink-0`}> <Sparkles className="w-4 h-4" /> </div> )} <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm shadow-sm leading-relaxed relative ${msg.role === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'}`}> <div className="whitespace-pre-wrap">{renderFormattedText(msg.text)}</div> {msg.role === 'model' && msg.text.length > 50 && onSaveInsight && ( <div className="absolute -right-12 top-2 opacity-0 group-hover/msg:opacity-100 transition-all duration-300"> <button onClick={() => onSaveInsight(messages[idx-1]?.text || "User Query", msg.text, activeContextItem?.title)} className="p-2 bg-white border border-gray-200 rounded-full shadow-md hover:scale-110 hover:border-yellow-300 hover:text-yellow-600 transition text-gray-400" title="Save as Spark Insight" > <Zap className="w-4 h-4 fill-current" /> </button> </div> )} </div> </div> ))}
                           {isTyping && ( <div className="flex justify-start"> <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm mr-3 mt-1`}> <Sparkles className="w-4 h-4" /> </div> <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-5 py-4 flex items-center space-x-1"> <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div> <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div> <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div> </div> </div> )}
                           <div ref={messagesEndRef} />
                       </div>
                   )}
                </div>
                <div className="p-6 bg-zinc-50 flex-shrink-0">
                   <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center space-x-2 focus-within:ring-2 focus-within:ring-blue-100 transition-all"> <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={socraticMode ? "Ask for guidance..." : `Ask your ${persona}...`} className="flex-1 bg-transparent text-gray-900 px-4 py-3 focus:outline-none text-sm font-medium placeholder-gray-400" autoFocus /> <button onClick={handleSend} disabled={!query.trim()} className={`p-3 rounded-xl bg-black text-white shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100`} > <Send className="w-4 h-4" /> </button> </div>
                </div>
            </div>
          </div>
        </div>
      )}
      {lightboxImage && ( <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setLightboxImage(null)} > <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}> <button onClick={() => setLightboxImage(null)} className="absolute -top-12 right-0 text-white/70 hover:text-white transition p-2 bg-black/50 rounded-full"><X className="w-6 h-6" /></button> <img src={lightboxImage} className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="Full size" /> </div> </div> )}
    </>
  );
};