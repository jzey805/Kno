import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
    PanelLeftClose, PanelLeftOpen, ArrowLeft, Database, Inbox, Brain, Trash2, Link, ArrowRight, 
    Loader2, ExternalLink, RefreshCcw, X, GripHorizontal, AlertTriangle, Zap, Plus, Search, 
    MousePointer2, Move, LayoutGrid, Save, ZoomIn, ZoomOut, Maximize, MoreHorizontal, FileText,
    Image as ImageIcon, Check, Edit2, Binary, Eye, BookOpen, Copy, BrainCircuit, Play, FileUp, Sparkles, RotateCw, Shield, ShieldAlert, CheckCircle2, FlaskConical, Activity, MousePointerClick, Undo2, Redo2, Hand, Archive, ChevronLeft, ChevronRight, HelpCircle, MessageSquare, RefreshCw, Download, FileUp as FileExport
} from 'lucide-react';
import { analyzeFallacy } from '../services/geminiService';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ReasoningTrace } from './Triage';
import { 
    InboxItem, Note, ProcessingOptions, AppTheme, CanvasDocument, CanvasNode, CanvasEdge, 
    FileData, QuizQuestion, CritiqueResult, Platform, CanvasState
} from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';
import { saveToStorage, loadFromStorage } from '../services/storage';

// --- Helpers ---
const cleanJson = (text: any) => {
    if (!text) return {};
    const str = typeof text === 'string' ? text : String(text);
    let cleaned = str.replace(/```json/gi, '').replace(/```/gi, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (e: any) {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        let start = -1; let end = -1;
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            start = firstBrace; end = lastBrace;
        } else if (firstBracket !== -1) {
            start = firstBracket; end = lastBracket;
        }
        if (start !== -1 && end !== -1 && end > start) {
            const potentialJson = cleaned.substring(start, end + 1);
            try { return JSON.parse(potentialJson); } catch (e2: any) { return {}; }
        }
        return {}; 
    }
};

const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
        (part.startsWith('**') && part.endsWith('**')) 
            ? <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong> 
            : part
    );
};

const stripStars = (text: string) => text.replace(/\*\*/g, "");

interface LibraryDrawerProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    inbox: InboxItem[];
    inboxTrash: InboxItem[];
    library: Note[];
    noteTrash: Note[];
    onDeleteSignal: (id: string) => void;
    onRestoreSignal?: (item: InboxItem) => void;
    onDeleteSignalForever?: (id: string) => void;
    onKeepSignal: (item: InboxItem) => void;
    onDeleteNote: (id: string) => void;
    onRestoreNote: (note: Note) => void;
    onDeleteNoteForever: (id: string) => void;
    onSelectSignal: (item: InboxItem) => void;
    onCapture: (url: string, options: ProcessingOptions) => Promise<void>;
    onGoHome: () => void;
    onDragWarn: (item: InboxItem) => void;
    onEnterMemoryLab: () => void;
    onGoToLibrary: () => void;
}

interface LearningCanvasProps {
  library: Note[];
  inbox: InboxItem[];
  inboxTrash: InboxItem[];
  noteTrash: Note[];
  theme: AppTheme;
  canvases: CanvasDocument[];
  onUpdateCanvases: (canvases: CanvasDocument[]) => void;
  canvasTrash: CanvasDocument[];
  onMoveCanvasToTrash: (id: string) => void;
  onRestoreCanvas: (id: string) => void;
  onDeleteCanvasForever: (id: string) => void;
  activeCanvasId: string | null;
  onSelectCanvas: (id: string | null) => void;
  onOpenNeuralDump: () => void;
  onEnterMemoryLab: () => void;
  onGoToLibrary: () => void;
  onCapture: (url: string, options: ProcessingOptions) => Promise<void>;
  onDeleteSignal: (id: string) => void;
  onRestoreSignal: (item: InboxItem) => void;
  onDeleteSignalForever: (id: string) => void;
  onKeepSignal: (item: InboxItem, editedSummary?: string[], quizAnswers?: Record<number, number>, tags?: string[], editedTitle?: string) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onRestoreNote: (note: Note) => void;
  onDeleteNoteForever: (id: string) => void;
  onSelectionChange?: (selectedNodes: CanvasNode[]) => void;
  onExitWorkspace: () => void;
  onOpenChat?: (noteId: string, fileIndex?: number) => void; 
}

const LibraryDrawer = React.memo<LibraryDrawerProps>(({ 
    isOpen, setIsOpen, inbox, inboxTrash, library, noteTrash, onDeleteSignal, onRestoreSignal, onDeleteSignalForever, onKeepSignal, onDeleteNote, onRestoreNote, onDeleteNoteForever, onSelectSignal, onCapture, onGoHome, onDragWarn, onEnterMemoryLab, onGoToLibrary 
}) => {
    const [activeTab, setActiveTab] = useState<'inbox' | 'assets'>('inbox');
    const [inboxView, setInboxView] = useState<'active' | 'trash'>('active');
    const [assetsView, setAssetsView] = useState<'active' | 'trash'>('active');
    const [captureUrl, setCaptureUrl] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragStart = (e: React.DragEvent, item: any, type: 'signal' | 'asset') => {
        const dragType = type === 'asset' ? 'LINK' : 'signal';
        e.dataTransfer.setData('type', dragType);
        e.dataTransfer.setData('id', String(item.id));
        if (dragType === 'LINK') {
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'LINK', id: item.id, url: item.sourceUrl, title: item.title
            }));
        }
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleCaptureSubmit = async () => {
        if (!captureUrl.trim() && uploadedFiles.length === 0) return;
        if (isCapturing) return;
        setIsCapturing(true);
        try {
            if (captureUrl.trim()) await onCapture(captureUrl.trim(), { summaryPoints: 5, quizCount: 3, targetLanguage: 'English', files: [] });
            if (uploadedFiles.length > 0) await Promise.all(uploadedFiles.map(file => onCapture("File Upload", { summaryPoints: 5, quizCount: 3, targetLanguage: 'English', files: [file], contextText: captureUrl.trim() ? `Context: ${captureUrl.trim()}` : undefined })));
        } catch (e: any) { console.error(e); } finally { setIsCapturing(false); setCaptureUrl(''); setUploadedFiles([]); }
    };

    const processFiles = (files: File[]) => {
        const newFiles: FileData[] = [];
        let processed = 0;
        files.forEach(file => {
             const reader = new FileReader();
             reader.onloadend = () => {
                 const r = reader.result;
                 const resultStr = typeof r === 'string' ? r : '';
                 newFiles.push({ mimeType: file.type, data: resultStr, name: file.name });
                 processed++;
                 if (processed === files.length) setUploadedFiles(prev => [...prev, ...newFiles]);
             };
             reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
             const fileList: File[] = [];
             for (let i = 0; i < e.target.files.length; i++) { const f = e.target.files.item(i); if (f) fileList.push(f); }
             processFiles(fileList);
        }
    };
    
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        const blob = items[i].getAsFile();
                        const reader = new FileReader();
                        reader.onload = (event) => { const target = event.target as FileReader; if (target?.result) { setUploadedFiles(prev => [...prev, { mimeType: items[i].type, data: typeof target.result === 'string' ? target.result : '', name: `Pasted Image ${Date.now()}` }]); }};
                        if (blob) reader.readAsDataURL(blob);
                    }
                }
            }
        };
        if (isOpen) { window.addEventListener('paste', handlePaste); return () => window.removeEventListener('paste', handlePaste); }
    }, [isOpen]);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); const types = e.dataTransfer.types; if (types && Array.from(types as any).indexOf('Files') !== -1) { setIsDraggingFile(true); }};
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(false); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { const fileList: File[] = []; for (let i = 0; i < e.dataTransfer.files.length; i++) { const f = e.dataTransfer.files.item(i); if (f) fileList.push(f); } processFiles(fileList); }};
    const removeFile = (idx: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== idx));

    return (
        <div className={`absolute left-0 top-0 bottom-0 z-30 bg-white/95 backdrop-blur-xl border-r border-gray-100 transition-transform duration-300 flex flex-col shadow-2xl w-full md:w-96 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            {isDraggingFile && (<div className="absolute inset-0 z-50 bg-blue-50/90 flex flex-col items-center justify-center border-4 border-blue-400 border-dashed m-2 rounded-3xl animate-pulse pointer-events-none"><FileUp className="w-16 h-16 text-blue-500 mb-4" /><h3 className="text-xl font-bold text-blue-600">Drop Files to Analyze</h3></div>)}
            <button onClick={() => setIsOpen(!isOpen)} className="absolute -right-8 top-1/2 -translate-y-1/2 w-8 h-16 bg-white border-y border-r border-gray-200 rounded-r-xl flex items-center justify-center shadow-md hover:bg-gray-50 text-gray-500 focus:outline-none z-40 md:flex hidden">{isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}</button>
            <button onClick={() => setIsOpen(false)} className="absolute right-4 top-4 p-2 bg-gray-100 rounded-full md:hidden z-50"><X className="w-5 h-5 text-gray-600" /></button>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/50 flex-shrink-0"><div className="flex items-center space-x-2"><button onClick={onGoHome} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition mr-1"><ArrowLeft className="w-4 h-4" /></button><span className="font-black text-xs uppercase tracking-widest text-gray-900 flex items-center"><LayoutGrid className="w-4 h-4 mr-2 text-blue-600" />Canvas</span></div></div>
            <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 space-x-2 flex-shrink-0"><button onClick={() => setActiveTab('inbox')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition flex items-center justify-center ${activeTab === 'inbox' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}><Inbox className="w-3 h-3 mr-1.5" /> Inbox</button><button onClick={() => setActiveTab('assets')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition flex items-center justify-center ${activeTab === 'assets' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}><Database className="w-3 h-3 mr-1.5" /> Library</button></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar bg-gray-50/30 relative">
                 {activeTab === 'inbox' && inboxView === 'active' && (
                    <div className="mb-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <div className="flex items-center">
                            <input 
                                type="text" 
                                value={captureUrl} 
                                onChange={(e) => setCaptureUrl(e.target.value)} 
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCaptureSubmit();
                                    }
                                }}
                                placeholder={uploadedFiles.length > 0 ? "Add context..." : "Paste link, drag files or paste image..."} 
                                className="flex-1 bg-transparent text-xs font-medium focus:outline-none py-2 pl-2" 
                            />
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition mr-1"><FileUp className="w-4 h-4" /></button>
                            <button onClick={handleCaptureSubmit} disabled={!captureUrl.trim() && uploadedFiles.length === 0} className="p-2 bg-gray-900 text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">{isCapturing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}</button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,application/pdf,audio/*,video/*,text/*" />
                        {uploadedFiles.length > 0 && (<div className="flex gap-2 mt-2 overflow-x-auto p-2">{uploadedFiles.map((f, i) => (<div key={i} className="relative group/preview flex-shrink-0"><div className="w-10 h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">{f.mimeType.startsWith('image/') ? <img src={f.data} className="w-full h-full object-cover" /> : <FileText className="w-5 h-5 text-gray-400" />}</div><button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/preview:opacity-100 transition"><X className="w-3 h-3" /></button></div>))}</div>)}
                    </div>
                )}
                {activeTab === 'inbox' && (<div className="flex justify-between items-center px-2 mb-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{inboxView === 'active' ? 'Active Signals' : 'Deleted Signals'}</span><button onClick={() => setInboxView(prev => prev === 'active' ? 'trash' : 'active')} className={`text-[10px] font-bold uppercase tracking-wider flex items-center transition-colors ${inboxView === 'trash' ? 'text-red-500 bg-red-50 px-2 py-1 rounded' : 'text-gray-400 hover:text-gray-600'}`}><Trash2 className="w-3 h-3 mr-1" /> {inboxView === 'active' ? 'Bin' : 'Back'}</button></div>)}
                {activeTab === 'assets' && (<div className="flex justify-between items-center px-2 mb-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{assetsView === 'active' ? 'Active Sources' : 'Deleted Sources'}</span><button onClick={() => setAssetsView(prev => prev === 'active' ? 'trash' : 'active')} className={`text-[10px] font-bold uppercase tracking-wider flex items-center transition-colors ${assetsView === 'trash' ? 'text-red-500 bg-red-50 px-2 py-1 rounded' : 'text-gray-400 hover:text-gray-600'}`}><Trash2 className="w-3 h-3 mr-1" /> {assetsView === 'active' ? 'Bin' : 'Back'}</button></div>)}
                {activeTab === 'inbox' ? (inboxView === 'active' ? (inbox.length === 0 ? (<div className="text-center py-10 opacity-40"><Inbox className="w-12 h-12 mx-auto mb-2 text-gray-400" /><p className="text-xs font-bold text-gray-500">Inbox Empty</p></div>) : (inbox.map(item => (<div key={item.id} draggable onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); onDragWarn(item); }} onClick={() => onSelectSignal(item)} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md cursor-no-drop group relative transition-all active:scale-[0.98]"><h4 className="text-sm font-bold text-gray-800 mb-1 leading-snug pr-6">{item.title}</h4><div className="flex justify-between items-center mt-2"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">{item.platform}</span>{item.isProcessing && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}</div><button onClick={(e) => { e.stopPropagation(); onDeleteSignal(item.id); }} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button></div>)))) : (inboxTrash.length === 0 ? (<div className="text-center py-10 opacity-40"><Trash2 className="w-12 h-12 mx-auto mb-2 text-gray-400" /><p className="text-xs font-bold text-gray-500">Trash Empty</p></div>) : (inboxTrash.map(item => (<div key={item.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 opacity-75 hover:opacity-100 transition-all group relative"><h4 className="text-sm font-bold text-gray-500 mb-1 leading-snug line-through decoration-red-300">{item.title}</h4><div className="flex justify-between items-center mt-2"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.platform}</span><div className="flex space-x-1"><button onClick={() => onRestoreSignal && onRestoreSignal(item)} className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg text-[9px] font-bold uppercase tracking-wide flex items-center"><RotateCw className="w-3 h-3 mr-1" /> Restore</button><button onClick={() => onDeleteSignalForever && onDeleteSignalForever(item.id)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg text-[9px] font-bold uppercase tracking-wide flex items-center"><X className="w-3 h-3" /> </button></div></div></div>))))) : (assetsView === 'active' ? (library.map(note => (<div key={note.id} draggable onDragStart={(e) => handleDragStart(e, note, 'asset')} className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group relative transition-all ${note.type === 'spark' ? 'border-amber-200' : note.type === 'collision' ? 'border-violet-200' : note.type === 'asset' ? 'border-emerald-200' : 'border-blue-200'}`}><h4 className="text-sm font-bold text-gray-900 mb-2 leading-snug">{note.title}</h4><div className="flex justify-between items-center"><span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${note.type === 'spark' ? 'bg-amber-50 text-amber-700' : note.type === 'collision' ? 'bg-violet-50 text-violet-700' : note.type === 'asset' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{note.type === 'spark' ? 'Spark' : note.type === 'collision' ? 'Collision' : note.type === 'asset' ? 'Alchemy' : 'Source'}</span><button onClick={() => onDeleteNote(note.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button></div></div>))) : (noteTrash.length === 0 ? (<div className="text-center py-10 opacity-40"><Trash2 className="w-12 h-12 mx-auto mb-2 text-gray-400" /><p className="text-xs font-bold text-gray-500">Trash Empty</p></div>) : (noteTrash.map(note => (<div key={note.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 opacity-75 hover:opacity-100 transition-all group relative mb-2"><h4 className="text-sm font-bold text-gray-500 mb-1 leading-snug line-through decoration-red-300">{note.title}</h4><div className="flex justify-between items-center mt-2"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{note.platform}</span><div className="flex space-x-1"><button onClick={() => onRestoreNote(note)} className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg text-[9px] font-bold uppercase tracking-wide flex items-center"><RotateCw className="w-3 h-3 mr-1" /> Restore</button><button onClick={() => onDeleteNoteForever(note.id)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg text-[9px] font-bold uppercase tracking-wide flex items-center"><X className="w-3 h-3" /> </button></div></div></div>)))))}
            </div>
        </div>
    );
});

const ToolbarButton: React.FC<{ 
    onClick: () => void; 
    icon: React.ReactNode; 
    title: string;
    description: string;
    active?: boolean; 
    disabled?: boolean;
    className?: string;
}> = ({ onClick, icon, title, description, active, disabled, className }) => {
    return (
        <div className="relative group flex flex-col items-center">
            <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 pointer-events-none z-50">
                <div className="bg-gray-900 text-white py-2 px-3 rounded-xl shadow-xl flex flex-col items-center text-center min-w-[120px]">
                    <span className="text-[10px] font-black uppercase tracking-widest mb-0.5">{title}</span>
                    <span className="text-[9px] font-medium text-gray-400 leading-tight max-w-[150px]">{description}</span>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
            </div>
            <button onClick={onClick} disabled={disabled} className={`p-3 rounded-full transition-all relative ${active ? 'bg-gray-900 text-white shadow-lg scale-105' : 'hover:bg-gray-100 text-gray-700 hover:scale-110'} ${disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent hover:scale-100' : ''} ${className || ''}`}>{icon}</button>
        </div>
    );
};

export const LearningCanvas: React.FC<LearningCanvasProps> = ({ 
    library, inbox, inboxTrash, noteTrash, theme, canvases, onUpdateCanvases, activeCanvasId, onSelectCanvas, 
    onCapture, onDeleteSignal, onRestoreSignal, onDeleteSignalForever, onKeepSignal, onUpdateNote, onDeleteNote, 
    onRestoreNote, onDeleteNoteForever, onOpenNeuralDump, onSelectionChange,
    canvasTrash, onMoveCanvasToTrash, onRestoreCanvas, onDeleteCanvasForever, onEnterMemoryLab, onGoToLibrary,
    onExitWorkspace, onOpenChat
}) => {
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [activeDragNode, setActiveDragNode] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [dashboardView, setDashboardView] = useState<'active' | 'trash'>('active');
    const [interactionMode, setInteractionMode] = useState<'select' | 'pan'>('select');
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [deletedNodes, setDeletedNodes] = useState<CanvasNode[]>([]);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [isResizing, setIsResizing] = useState(false);
    const [resizeNodeId, setResizeNodeId] = useState<string | null>(null);
    
    const [editingCanvasTitleId, setEditingCanvasTitleId] = useState<string | null>(null);
    const [tempCanvasTitleVal, setTempCanvasTitleVal] = useState("");

    const [previewSignal, setPreviewSignal] = useState<InboxItem | null>(null);
    const [previewQuizAnswers, setPreviewQuizAnswers] = useState<Record<number, number>>({});

    const [isExporting, setIsExporting] = useState(false);

    const dragStartValues = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });
    const resizeStartValues = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });
    const gestureStartZoomRef = useRef(1);
    
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [tempNodeContent, setTempNodeContent] = useState("");
    const [tempNodeTitle, setTempNodeTitle] = useState("");
    const [dragWarningItem, setDragWarningItem] = useState<InboxItem | null>(null);
    const warningTimeoutRef = useRef<any>(null);
    
    const [scanningNodeId, setScanningNodeId] = useState<string | null>(null);
    const [expandedCritiques, setExpandedCritiques] = useState<Record<string, boolean>>({});
    const [isColliding, setIsColliding] = useState(false);

    const [generatingQuizForNode, setGeneratingQuizForNode] = useState<string | null>(null);
    const [canvasNodeQuizzes, setCanvasNodeQuizzes] = useState<Record<string, QuizQuestion[]>>({});

    const [askPrompt, setAskPrompt] = useState("");
    const [isAsking, setIsAsking] = useState(false);

    const activeCanvas = useMemo(() => canvases?.find(c => c.id === activeCanvasId), [canvases, activeCanvasId]);
    const [localNodes, setLocalNodes] = useState<CanvasNode[]>([]);
    const [localEdges, setLocalEdges] = useState<CanvasEdge[]>([]);
    const [history, setHistory] = useState<{nodes: CanvasNode[], edges: CanvasEdge[]}[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isHistoryAction = useRef(false);

    const noteMap = useMemo(() => {
        return new Map(library.map(n => [n.id, n]));
    }, [library]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const container = document.getElementById('canvas-wrapper-id'); 
            if (container) {
                container.focus();
                container.click(); 
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.focus();
        }
    }, [activeCanvasId]);

    const wasSelectedOnDown = useRef(false);
    const hasDragged = useRef(false);

    const nodesRef = useRef<CanvasNode[]>([]);
    const edgesRef = useRef<CanvasEdge[]>([]);
    const viewportRef = useRef(viewport);

    useEffect(() => { viewportRef.current = viewport; }, [viewport]);
    useEffect(() => { nodesRef.current = localNodes; }, [localNodes]);
    useEffect(() => { edgesRef.current = localEdges; }, [localEdges]);
    useEffect(() => {
        if (onSelectionChange) {
            const selected = localNodes.filter(n => selectedNodeIds.has(n.id));
            onSelectionChange(selected);
        }
    }, [selectedNodeIds, localNodes, onSelectionChange]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                const zoomSensitivity = 0.01;
                const zoomFactor = Math.exp(-e.deltaY * zoomSensitivity);
                const currentZoom = viewportRef.current.zoom;
                const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.1), 5);
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const newX = mouseX - (mouseX - viewportRef.current.x) * (newZoom / currentZoom);
                const newY = mouseY - (mouseY - viewportRef.current.y) * (newZoom / currentZoom);
                const newState = { x: newX, y: newY, zoom: newZoom };
                viewportRef.current = newState; 
                setViewport(newState);
            } else {
                const newX = viewportRef.current.x - e.deltaX;
                const newY = viewportRef.current.y - e.deltaY;
                const newState = { ...viewportRef.current, x: newX, y: newY };
                viewportRef.current = newState; 
                setViewport(newState);
            }
        };
        const onGestureStart = (e: any) => { e.preventDefault(); gestureStartZoomRef.current = viewportRef.current.zoom; };
        const onGestureChange = (e: any) => { e.preventDefault(); const startZoom = gestureStartZoomRef.current; const newZoom = Math.min(Math.max(startZoom * e.scale, 0.1), 5); const newState = { ...viewportRef.current, zoom: newZoom }; viewportRef.current = newState; setViewport(newState); };
        const onGestureEnd = (e: any) => { e.preventDefault(); };
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('gesturestart', onGestureStart);
        canvas.addEventListener('gesturechange', onGestureChange);
        canvas.addEventListener('gestureend', onGestureEnd);
        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('gesturestart', onGestureStart);
            canvas.removeEventListener('gesturechange', onGestureChange);
            canvas.removeEventListener('gestureend', onGestureEnd);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isInputFocused = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
            if (!isInputFocused && !editingNodeId && selectedNodeIds.size > 0) {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault(); 
                    const nodesToDelete = Array.from(selectedNodeIds) as string[];
                    nodesToDelete.forEach(id => handleDeleteNode(id));
                    setSelectedNodeIds(new Set());
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodeIds, editingNodeId, localNodes]); 

    useEffect(() => {
        const restoreData = async () => {
            if (activeCanvas && !isHistoryAction.current) {
                if (!activeDragNode && !editingNodeId && !isResizing) {
                    const propNodes = activeCanvas.state?.nodes;
                    if (propNodes && propNodes.length > 0) {
                        setLocalNodes(propNodes);
                        setLocalEdges(activeCanvas.state?.edges || []);
                    } else {
                        try {
                            const savedNodes = await loadFromStorage<CanvasNode[]>(`kno_nodes_${activeCanvas.id}`);
                            if (savedNodes) {
                                setLocalNodes(savedNodes);
                                const savedEdges = await loadFromStorage<CanvasEdge[]>(`kno_edges_${activeCanvas.id}`);
                                if (savedEdges) setLocalEdges(savedEdges);
                            } else {
                                setLocalNodes([]);
                                setLocalEdges([]);
                            }
                        } catch (e) {
                            console.error("Restoration failed", e);
                            setLocalNodes([]);
                            setLocalEdges([]);
                        }
                    }
                }
            }
        };
        restoreData();
    }, [activeCanvas, activeDragNode, editingNodeId, isResizing]);

    useEffect(() => {
        if (activeCanvasId && localNodes.length > 0) {
            saveToStorage(`kno_nodes_${activeCanvasId}`, localNodes);
            saveToStorage(`kno_edges_${activeCanvasId}`, localEdges);
        }
    }, [localNodes, localEdges, activeCanvasId]);

    const handleExport = async (format: 'pdf' | 'md') => {
        if (!activeCanvas) return;
        setIsExporting(true);
        try {
            if (format === 'md') {
                const sourceCount = localNodes.length;
                const fallacyCount = localNodes.filter(n => n.critique?.isSafe === false || n.critique?.structuredAnalysis?.logic.status.toLowerCase().includes('fallacy')).length;
                const insightCount = localNodes.filter(n => ['spark', 'insight', 'synthesis'].includes(n.type)).length;
                let md = `# Kno Brief: ${activeCanvas.title}\n`;
                md += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
                md += `## Key Statistics\n`;
                md += `* ${sourceCount} Sources Analyzed\n`;
                md += `* ${fallacyCount} Issues Detected\n`;
                md += `* ${insightCount} Insights Synthesized\n\n`;
                md += `## Neural Audit Details\n\n`;
                localNodes.forEach((node, i) => {
                    md += `### ${i + 1}. ${node.title || 'Untitled'}\n\n`;
                    md += `${node.content || ""}\n\n`;
                    if (node.critique) {
                        const c = node.critique;
                        md += `> **🛡️ TRINITY LOGIC AUDIT**\n`;
                        if (c.structuredAnalysis) {
                            const { factual, balance, logic } = c.structuredAnalysis;
                            md += `> - **FACTUAL:** ${factual.status} - ${factual.issue || 'Verified'}\n`;
                            md += `> - **BALANCE:** ${balance.status} - ${balance.check || 'Balanced'}\n`;
                            md += `> - **LOGIC:** ${logic.status} - ${logic.type} : ${logic.explanation || 'Verified'}\n`;
                        } else {
                            md += `> - **HEALTH:** ${c.isSafe ? 'Stable' : 'Vulnerable'} | ${c.issue}\n`;
                        }
                        md += `\n`;
                    }
                    md += `---\n\n`;
                });
                md += `*Powered by Kno & Gemini 3 - Spatial Knowledge OS*`;
                const blob = new Blob([md], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeCanvas.title.replace(/\s+/g, '_')}_Brief.md`;
                a.click();
            } else if (format === 'pdf') {
                const doc = new jsPDF({ format: 'a4', unit: 'mm' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                let yPos = 20;
                const margin = 20;
                const contentWidth = pageWidth - (margin * 2);
                doc.setFillColor(0, 0, 0); 
                doc.rect(0, 0, pageWidth, 25, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(22);
                doc.setFont("helvetica", "bold");
                doc.text("Kno.", margin, 17);
                doc.setTextColor(0);
                yPos = 35; 
                doc.setFontSize(18);
                doc.setFont("helvetica", "bold");
                doc.text(activeCanvas.title, margin, yPos);
                yPos += 10;
                if (canvasRef.current) {
                    try {
                        const canvasImg = await html2canvas(canvasRef.current, { 
                            scale: 1, 
                            logging: false, 
                            backgroundColor: '#ffffff', 
                            useCORS: true,
                            ignoreElements: (element) => {
                                return element.classList.contains('ui-layer');
                            }
                        });
                        const imgData = canvasImg.toDataURL('image/png');
                        const imgProps = doc.getImageProperties(imgData);
                        const pdfImgHeight = (imgProps.height * contentWidth) / imgProps.width;
                        const maxImgHeight = 60; 
                        doc.addImage(imgData, 'PNG', margin, yPos, contentWidth, Math.min(pdfImgHeight, maxImgHeight));
                        yPos += Math.min(pdfImgHeight, maxImgHeight) + 15;
                    } catch (e) { }
                }
                localNodes.forEach((node, i) => {
                    if (yPos > pageHeight - 40) { doc.addPage(); yPos = 20; }
                    doc.setFontSize(14);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(50, 50, 50); 
                    const rawTitle = `${i + 1}. ${stripStars(node.title || "Untitled")}`;
                    const titleLines = doc.splitTextToSize(rawTitle, contentWidth);
                    doc.text(titleLines, margin, yPos);
                    yPos += (titleLines.length * 6) + 4; 
                    doc.setTextColor(0);
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    const cleanContent = stripStars(node.content || "");
                    const splitContent = doc.splitTextToSize(cleanContent, contentWidth);
                    doc.text(splitContent, margin, yPos);
                    yPos += (splitContent.length * 5) + 5;
                    if (node.critique) {
                        const audit = node.critique.structuredAnalysis || {
                            // Fix: Corrected variable name from note to node to fix 'Cannot find name note' error
                            factual: { status: 'N/A', issue: node.critique.issue || '' },
                            balance: { status: 'N/A', check: '' },
                            logic: { status: node.critique.isSafe ? 'Safe' : 'Issues', type: '', explanation: node.critique.fix || '' }
                        };
                        const clean = (t: string) => (t || "").replace(/[\u{1F600}-\u{1F6FF}|[\u{2600}-\u{26FF}]|\*\*/gu, "");
                        const fText = `FACTUAL: ${clean(audit.factual.status)}\n   Note: ${clean(audit.factual.issue)}`;
                        const bText = `BALANCE: ${clean(audit.balance.status)}\n   Note: ${clean(audit.balance.check)}`;
                        const lText = `LOGIC: ${clean(audit.logic.status)} ${clean(audit.logic.type)}\n   Note: ${clean(audit.logic.explanation)}`;
                        const boxWidth = contentWidth - 10;
                        const fLines = doc.splitTextToSize(fText, boxWidth);
                        const bLines = doc.splitTextToSize(bText, boxWidth);
                        const lLines = doc.splitTextToSize(lText, boxWidth);
                        const padding = 5;
                        const lineHeight = 5;
                        const blockSpacing = 3;
                        const totalLines = fLines.length + bLines.length + lLines.length;
                        const boxHeight = (totalLines * lineHeight) + (padding * 2) + (blockSpacing * 2);
                        if (yPos + boxHeight > pageHeight - 20) { doc.addPage(); yPos = 20; }
                        doc.setFillColor(248, 250, 252); 
                        doc.setDrawColor(200, 200, 200);
                        doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, 'FD');
                        let textY = yPos + padding + 4; 
                        doc.text(fLines, margin + 5, textY);
                        textY += (fLines.length * lineHeight) + blockSpacing;
                        doc.text(bLines, margin + 5, textY);
                        textY += (bLines.length * lineHeight) + blockSpacing;
                        doc.text(lLines, margin + 5, textY);
                        yPos += boxHeight + 10;
                    }
                    yPos += 5;
                });
                doc.save(`${activeCanvas.title.replace(/\s+/g, '_')}_InsightBrief.pdf`);
            }
        } catch (e) {
            console.error("Export Failed", e);
        } finally {
            setIsExporting(false);
        }
    };

    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        const zoom = viewport.zoom;
        const dropX = (e.clientX - viewport.x) / zoom;
        const dropY = (e.clientY - viewport.y) / zoom;
        if (type === 'LINK') {
            const dataStr = e.dataTransfer.getData('application/json');
            let noteId = e.dataTransfer.getData('id');
            let title = "Dropped Note";
            let content = "";
            if (dataStr) {
                try {
                    const data = JSON.parse(dataStr);
                    noteId = data.id;
                    title = data.title;
                    if (data.url) title = data.title;
                } catch(e) {}
            }
            const note = library.find(n => n.id === noteId);
            if (note) {
                title = note.title;
                content = (note.summary || []).join('\n\n');
            }
            const newNode: CanvasNode = {
                id: `node-link-${Date.now()}`,
                type: 'note',
                noteId: noteId,
                title: title,
                content: content,
                x: dropX - 125,
                y: dropY - 75,
                width: 250
            };
            const newNodes = [...localNodes, newNode];
            setLocalNodes(newNodes);
            pushHistory(newNodes, localEdges);
        } else if (type === 'signal') {
             const signalId = e.dataTransfer.getData('id');
             const item = inbox.find(i => i.id === signalId);
             if (item) {
                 const newNode: CanvasNode = {
                    id: `node-signal-${Date.now()}`,
                    type: 'note',
                    title: item.title,
                    content: (item.summary || []).join('\n\n'),
                    x: dropX - 125,
                    y: dropY - 75,
                    width: 250
                };
                const newNodes = [...localNodes, newNode];
                setLocalNodes(newNodes);
                pushHistory(newNodes, localEdges);
             }
        }
    };

    const handleSaveNodeEdit = useCallback(() => {
        if (!editingNodeId) return;
        const updatedNodes = localNodes.map(n => 
            n.id === editingNodeId 
            ? { ...n, title: tempNodeTitle, content: tempNodeContent } 
            : n
        );
        setLocalNodes(updatedNodes);
        pushHistory(updatedNodes, localEdges);
        setEditingNodeId(null);
    }, [editingNodeId, localNodes, localEdges, tempNodeTitle, tempNodeContent]);

    const handleStartCanvasRename = (e: React.MouseEvent, canvas: CanvasDocument) => {
        e.stopPropagation();
        setEditingCanvasTitleId(canvas.id);
        setTempCanvasTitleVal(canvas.title);
    };

    const handleSaveCanvasRename = (e?: React.SyntheticEvent) => {
        if (e) e.stopPropagation();
        if (editingCanvasTitleId) {
            const updated = canvases.map(c => c.id === editingCanvasTitleId ? { ...c, title: tempCanvasTitleVal || "Untitled Canvas" } : c);
            onUpdateCanvases(updated);
            setEditingCanvasTitleId(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
          e.target.value = '';
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        if (editingNodeId) handleSaveNodeEdit();
        if (!activeDragNode && !isResizing) {
            if (e.target === canvasRef.current || e.target === e.currentTarget) {
                setSelectedNodeIds(new Set());
            }
            setIsDraggingCanvas(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }
    };

    const handleResizeStart = (e: React.PointerEvent, node: CanvasNode) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeNodeId(node.id);
        resizeStartValues.current = { mouseX: e.clientX, mouseY: e.clientY, width: node.width || 250, height: node.height || 200 };
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isResizing && resizeNodeId) {
            const dx = (e.clientX - resizeStartValues.current.mouseX) / viewport.zoom;
            const newWidth = Math.max(200, resizeStartValues.current.width + dx);
            setLocalNodes(nodes => nodes.map(n => n.id === resizeNodeId ? { ...n, width: newWidth } : n));
        } else if (isDraggingCanvas) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setDragStart({ x: e.clientX, y: e.clientY });
        } else if (activeDragNode) {
            const dx = (e.clientX - dragStartValues.current.mouseX) / viewport.zoom;
            const dy = (e.clientY - dragStartValues.current.mouseY) / viewport.zoom;
            const dist = Math.hypot(e.clientX - dragStartValues.current.mouseX, e.clientY - dragStartValues.current.mouseY);
            if (dist > 5) hasDragged.current = true;
            const newX = dragStartValues.current.nodeX + dx;
            const newY = dragStartValues.current.nodeY + dy;
            setLocalNodes(nodes => nodes.map(n => n.id === activeDragNode ? { ...n, x: newX, y: newY } : n));
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (activeDragNode) {
            pushHistory(localNodes, localEdges);
            if (!hasDragged.current && !editingNodeId && wasSelectedOnDown.current) {
                setSelectedNodeIds(prev => {
                    const next = new Set(prev);
                    if (typeof activeDragNode === 'string') { next.delete(activeDragNode); }
                    return next;
                });
            }
        }
        if (isResizing) {
            pushHistory(localNodes, localEdges);
            setIsResizing(false);
            setResizeNodeId(null);
        }
        setIsDraggingCanvas(false);
        setActiveDragNode(null);
        if (e.currentTarget instanceof Element) { e.currentTarget.releasePointerCapture(e.pointerId); }
    };

    const handleCanvasDragOver = (e: React.DragEvent) => {
        e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    };

    const handleNodePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
        if (interactionMode === 'pan') return;
        e.stopPropagation(); 
        if (editingNodeId) { handleSaveNodeEdit(); return; }
        const isSelected = selectedNodeIds.has(node.id);
        wasSelectedOnDown.current = isSelected;
        hasDragged.current = false;
        if (!isSelected) {
             const isMultiSelect = e.metaKey || e.ctrlKey;
             setSelectedNodeIds(prev => {
                 const next = new Set<string>(isMultiSelect ? prev : []);
                 next.add(node.id);
                 return next;
             });
        }
        setActiveDragNode(node.id);
        dragStartValues.current = { mouseX: e.clientX, mouseY: e.clientY, nodeX: node.x, nodeY: node.y };
        
        // Ensure that clicking a card triggers context update if chat is open
        if (node.noteId && onOpenChat && document.activeElement !== canvasRef.current) {
            // Optional: Auto-focus chat context on selection if chat is visible
        }
    };
    
    const pushHistory = (nodes: CanvasNode[], edges: CanvasEdge[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ nodes, edges });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        isHistoryAction.current = true;
        updateActiveCanvasState({ nodes, edges });
        setTimeout(() => { isHistoryAction.current = false; }, 50);
    };

    const updateActiveCanvasState = useCallback((newState: Partial<CanvasState>) => {
        if (!activeCanvas) return;
        const updated = {
            ...activeCanvas,
            lastModified: Date.now(),
            state: { ...activeCanvas.state, ...newState }
        };
        onUpdateCanvases(canvases.map(c => c.id === activeCanvas.id ? updated : c));
    }, [activeCanvas, canvases, onUpdateCanvases]);

    const undo = () => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setLocalNodes(prevState.nodes);
            setLocalEdges(prevState.edges);
            setHistoryIndex(historyIndex - 1);
            isHistoryAction.current = true;
            updateActiveCanvasState({ nodes: prevState.nodes, edges: prevState.edges });
            setTimeout(() => { isHistoryAction.current = false; }, 50);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setLocalNodes(nextState.nodes);
            setLocalEdges(nextState.edges);
            setHistoryIndex(historyIndex + 1);
            isHistoryAction.current = true;
            updateActiveCanvasState({ nodes: nextState.nodes, edges: nextState.edges });
            setTimeout(() => { isHistoryAction.current = false; }, 50);
        }
    };
    
    const handleSelectSignal = useCallback((item: InboxItem) => {
        setPreviewSignal(item);
        setPreviewQuizAnswers({});
    }, []);
    const handleGoHomeCallback = useCallback(() => onSelectCanvas(null), [onSelectCanvas]);
    const handleDragWarnCallback = useCallback((item: InboxItem) => {
        setDragWarningItem(item);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = setTimeout(() => setDragWarningItem(null), 4000);
    }, []);

    const handleDeleteNode = (nodeId: string) => {
        setLocalNodes(currentNodes => {
            const nodeToDelete = currentNodes.find(n => n.id === nodeId);
            if (!nodeToDelete) return currentNodes;
            setTimeout(() => {
                setDeletedNodes(prev => [nodeToDelete, ...prev]);
                setLocalEdges((currentEdges: CanvasEdge[]) => currentEdges.filter(e => e.source !== nodeId && e.target !== nodeId));
            }, 0);
            return currentNodes.filter(n => n.id !== nodeId);
        });
    };

    const handleRestoreDeletedNode = (node: CanvasNode) => {
        setLocalNodes(prev => [...prev, node]);
        setDeletedNodes(prev => prev.filter(n => n.id !== node.id));
    };

    const handleCreateCanvas = () => {
        const newCanvas: CanvasDocument = {
            id: `canvas-${Date.now()}`,
            title: 'Untitled Canvas',
            lastModified: Date.now(),
            state: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
        };
        onUpdateCanvases([newCanvas, ...canvases]);
        onSelectCanvas(newCanvas.id);
    };

    const handleAddNote = () => {
        const centerX = ((-viewport.x + window.innerWidth / 2) / viewport.zoom);
        const centerY = ((-viewport.y + window.innerHeight / 2) / viewport.zoom);
        const newNode: CanvasNode = {
            id: `node-${Date.now()}`,
            type: 'note',
            source: 'manual',
            title: 'New Note',
            content: '',
            x: centerX - 125, y: centerY - 75, width: 250,
        };
        const newNodes = [...localNodes, newNode];
        setLocalNodes(newNodes);
        pushHistory(newNodes, localEdges);
        setEditingNodeId(newNode.id);
        setTempNodeContent("");
        setTempNodeTitle("New Note");
    };

    const handleQuickShift = () => {
        if (localNodes.length === 0) return;
        const cols = Math.ceil(Math.sqrt(localNodes.length));
        const spacingX = 350;
        const spacingY = 300;
        const newNodes = localNodes.map((node, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            return { ...node, x: col * spacingX, y: row * spacingY };
        });
        setLocalNodes(newNodes);
        pushHistory(newNodes, localEdges);
        setViewport({ x: 50, y: 50, zoom: 0.8 });
    };

    const handleLogicScan = async () => {
        if (selectedNodeIds.size !== 1) return;
        const selection = Array.from(selectedNodeIds);
        const id = selection[0] as string; 
        const node = localNodes.find(n => n.id === id);
        if (!node) return;
        if (node.critique) {
            const currentVisibility = expandedCritiques[id];
            setExpandedCritiques(prev => ({ ...prev, [id]: !currentVisibility }));
            return;
        }
        setScanningNodeId(id); 
        try {
            const rawContent = node.content || node.title || "";
            const contentToCheck = typeof rawContent === 'string' ? rawContent : String(rawContent);
            const result = (await analyzeFallacy(contentToCheck)) as CritiqueResult;
            setLocalNodes(currentNodes => {
                const updated = currentNodes.map(n => n.id === id ? { ...n, critique: result } : n);
                pushHistory(updated, localEdges);
                return updated;
            });
            setExpandedCritiques(prev => ({...prev, [id]: true}));
        } catch (e: any) { console.error("Logic Scan Error", e); } finally { setScanningNodeId(null); }
    };

    const saveSpecialNodeToLibrary = (node: CanvasNode, type: 'spark' | 'collision' | 'asset') => {
        const newNote: Note = {
            id: node.id,
            title: node.title || "Generated Insight",
            summary: [node.content || ""],
            type: type,
            createdAt: Date.now(),
            lastReviewedAt: Date.now(),
            reviewCount: 0,
            platform: Platform.GENERIC,
            sourceUrl: '',
            tags: [],
            quizAttempts: [],
            needsRevision: false
        };
        onUpdateNote(newNote);
    };

    const handleSpark = async () => {
        if (selectedNodeIds.size !== 1) return;
        const selectedId = Array.from(selectedNodeIds)[0] as string;
        const selectedNode = localNodes.find(n => n.id === selectedId);
        if (!selectedNode) return;
        const candidates = library.filter(n => n.id !== selectedNode.noteId);
        if (candidates.length === 0) return;
        const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
        const sparkX = selectedNode.x + (selectedNode.width || 250) + 150;
        const sparkY = selectedNode.y;
        const sparkId = `spark-${Date.now()}`;
        const sparkNode: CanvasNode = {
            id: sparkId, type: 'insight', title: "Sparking Serendipity...", content: "", x: sparkX, y: sparkY, width: 300, color: '#F59E0B', isThinking: true, synthesisHistory: [], historyIndex: 0
        };
        const sparkEdge: CanvasEdge = { id: `spark-edge-${Date.now()}`, source: selectedNode.id, target: sparkId, type: 'spark' };
        setLocalNodes(prev => [...prev, sparkNode]);
        setLocalEdges(prev => [...prev, sparkEdge]);
        try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
             const prompt = `Role: Serendipity Engine. Concept A: "${selectedNode.title} - ${selectedNode.content ? selectedNode.content.substring(0, 200) : ''}" Concept B: "${randomCandidate.title} - ${randomCandidate.summary.join(' ').substring(0, 200)}" Task: Find a surprising connection. Output JSON: { "title": "The Connection", "insight": "Insight text." }`;
             const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
             const responseText = (response.text as string) || "{}";
             const data = cleanJson(responseText) as any;
             const historyEntry = { title: data.title || "Spark Insight", content: `Connected to: "${randomCandidate.title}"\n\n${data.insight || "Connection established."}`, timestamp: Date.now() };
             setLocalNodes(currentNodes => {
                 const nodeToUpdate = currentNodes.find(n => n.id === sparkId);
                 if (nodeToUpdate) {
                     const finalNode = { ...nodeToUpdate, title: historyEntry.title, content: historyEntry.content, isThinking: false, synthesisHistory: [historyEntry], historyIndex: 0 };
                     const newNodes = currentNodes.map(n => n.id === sparkId ? finalNode : n);
                     pushHistory(newNodes, [...edgesRef.current, sparkEdge]); 
                     saveSpecialNodeToLibrary(finalNode, 'spark');
                     return newNodes;
                 }
                 return currentNodes;
             });
        } catch (e: any) {
            setLocalNodes(prev => prev.filter(n => n.id !== sparkId));
            setLocalEdges(prev => prev.filter(e => e.id !== sparkEdge.id));
        } finally { setSelectedNodeIds(new Set()); }
    };

    const handleCollider = async (nodesToCollide?: CanvasNode[]) => {
        const targetNodes = nodesToCollide || localNodes.filter(n => selectedNodeIds.has(n.id));
        if (targetNodes.length < 2) return; 
        setIsColliding(true);
        const avgX = targetNodes.reduce((sum, n) => sum + n.x, 0) / targetNodes.length;
        const maxY = Math.max(...targetNodes.map(n => n.y)); 
        const newId = `col-${Date.now()}`;
        const placeholder: CanvasNode = { id: newId, type: 'synthesis', title: "Colliding Concepts...", content: "", x: avgX, y: maxY + 300, width: 350, isThinking: true, color: '#A855F7' };
        const newEdges: CanvasEdge[] = targetNodes.map((n, i) => ({ id: `e-${Date.now()}-${i}`, source: n.id, target: newId, type: 'conflict' }));
        setLocalNodes(prev => [...prev, placeholder]);
        setLocalEdges(prev => [...prev, ...newEdges]);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
            const inputs = targetNodes.map((n, i) => `Input ${i+1}: "${n.title}"`).join('\n');
            const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Role: Collider. Inputs:\n${inputs}\nTask: Synthesis. Output JSON: { "title": "Title", "content": "Insight." }`, config: { responseMimeType: 'application/json' } });
            const responseText = (response.text as string) || "{}";
            const data = cleanJson(responseText) as any;
            const historyEntry = { title: data.title, content: data.content, timestamp: Date.now() };
            setLocalNodes(currentNodes => {
                const nodeToUpdate = currentNodes.find(n => n.id === newId);
                if (nodeToUpdate) {
                    const finalNode = { ...nodeToUpdate, title: data.title || "Synthesis", content: data.content || "Connection found.", isThinking: false, synthesisHistory: [historyEntry], historyIndex: 0 };
                    const newNodes = currentNodes.map(n => n.id === newId ? finalNode : n);
                    pushHistory(newNodes, edgesRef.current);
                    saveSpecialNodeToLibrary(finalNode, 'collision');
                    return newNodes;
                }
                return currentNodes;
            });
        } catch (e: any) {
            setLocalNodes(prev => prev.filter(n => n.id !== newId));
            setLocalEdges(prev => prev.filter(e => !newEdges.find(ne => ne.id === e.id)));
        } finally { setIsColliding(false); setSelectedNodeIds(new Set()); }
    };

    const handleAlchemy = async () => {
        if (selectedNodeIds.size < 2) return; 
        const sourceNodes = localNodes.filter(n => selectedNodeIds.has(n.id));
        const avgX = sourceNodes.reduce((sum, n) => sum + n.x, 0) / sourceNodes.length;
        const maxY = Math.max(...sourceNodes.map(n => n.y));
        const alchemyId = `alchemy-${Date.now()}`;
        const alchemyNode: CanvasNode = { id: alchemyId, type: 'asset', title: "Alchemy in progress...", content: "", x: avgX, y: maxY + 300, width: 400, color: '#10B981', isThinking: true, synthesisHistory: [], historyIndex: 0 };
        const newEdges = sourceNodes.map(n => ({ id: `edge-${n.id}-${alchemyId}`, source: n.id, target: alchemyId, type: 'synthesis' as const }));
        setLocalNodes(prev => [...prev, alchemyNode]);
        setLocalEdges(prev => [...prev, ...newEdges]);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
            const inputs = sourceNodes.map((n, i) => `Input ${i+1}: ${n.title} - ${n.content ? n.content.substring(0, 150) : ''}`).join('\n');
            const prompt = `Role: Alchemy Engine. Inputs:\n${inputs}\nTask: Fuse into cohesive structure. Output JSON: { "title": "Title", "content": "Output." }`;
            const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            const responseText = (response.text as string) || "{}";
            const data = cleanJson(responseText) as any;
            const historyEntry = { title: data.title || "Alchemical Gold", content: data.content || "Transformation complete.", timestamp: Date.now() };
            setLocalNodes(currentNodes => {
                const nodeToUpdate = currentNodes.find(n => n.id === alchemyId);
                if (nodeToUpdate) {
                    const finalNode = { ...nodeToUpdate, title: historyEntry.title, content: historyEntry.content, isThinking: false, synthesisHistory: [historyEntry], historyIndex: 0 };
                    const newNodes = currentNodes.map(n => n.id === alchemyId ? finalNode : n);
                    pushHistory(newNodes, edgesRef.current);
                    saveSpecialNodeToLibrary(finalNode, 'asset');
                    return newNodes;
                }
                return currentNodes;
            });
        } catch (e: any) {
            setLocalNodes(prev => prev.filter(n => n.id !== alchemyId));
            setLocalEdges(prev => prev.filter(e => e.target !== alchemyId));
        } finally { setSelectedNodeIds(new Set()); }
    };

    const regenerateNode = async (node: CanvasNode) => {
        const parents = localEdges.filter(e => e.target === node.id).map(e => localNodes.find(n => n.id === e.source)).filter(Boolean) as CanvasNode[];
        if (parents.length === 0) return; 
        const isSpark = node.color === '#F59E0B';
        const isAlchemy = node.color === '#10B981';
        const isCollider = !isSpark && !isAlchemy;
        setLocalNodes(prev => prev.map(n => n.id === node.id ? { ...n, isThinking: true, title: "Regenerating..." } : n));
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
            let promptContents = "";
            if (isCollider) {
                 const inputs = parents.map((n, i) => `Input ${i+1}: "${n.title}"`).join('\n');
                 promptContents = `Role: Collider (Regeneration). Inputs:\n${inputs}\nPrevious: "${node.content}"\nTask: Different synthesis. Output JSON: { "title": "New Title", "content": "New Insight." }`;
            } else if (isAlchemy) {
                 const inputs = parents.map((n, i) => `Input ${i+1}: ${n.title}`).join('\n');
                 promptContents = `Role: Alchemy (Regeneration). Inputs:\n${inputs}\nTask: Better structure. Output JSON: { "title": "Refined Gold", "content": "Output." }`;
            } else if (isSpark) {
                 const sourceNode = parents[0];
                 const candidates = library.filter(n => n.id !== sourceNode.noteId);
                 if (candidates.length === 0) throw new Error("No candidates");
                 const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
                 promptContents = `Role: Serendipity. A: "${sourceNode.title}" B: "${randomCandidate.title}" Task: Connection. Output JSON: { "title": "Connection", "insight": "Logic." }`;
                 (node as any)._tempCandidate = randomCandidate.title;
            }
            const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: promptContents, config: { responseMimeType: 'application/json' } });
            const responseText = (response.text as string) || "{}";
            const data = cleanJson(responseText) as any;
            let finalContent = data.content;
            if (isSpark && (node as any)._tempCandidate) finalContent = `Connected to: "${(node as any)._tempCandidate}"\n\n${data.insight || data.content}`;
            const historyEntry = { title: data.title, content: finalContent, timestamp: Date.now() };
            const updatedHistory = [...(node.synthesisHistory || []), historyEntry];
            setLocalNodes(currentNodes => {
                const nodeToUpdate = currentNodes.find(n => n.id === node.id);
                if (nodeToUpdate) {
                    const finalNode = { ...nodeToUpdate, isThinking: false, title: data.title, content: finalContent, synthesisHistory: updatedHistory, historyIndex: updatedHistory.length - 1 };
                    const newNodes = currentNodes.map(n => n.id === node.id ? finalNode : n);
                    saveSpecialNodeToLibrary(finalNode, isSpark ? 'spark' : isAlchemy ? 'asset' : 'collision');
                    return newNodes;
                }
                return currentNodes;
            });
        } catch (e: any) {
            setLocalNodes(prev => prev.map(n => n.id === node.id ? { ...n, isThinking: false, title: node.title } : n));
        }
    };

    const navigateHistory = (node: CanvasNode, direction: 'prev' | 'next') => {
        if (!node.synthesisHistory || node.synthesisHistory.length === 0) return;
        const currentIndex = node.historyIndex ?? (node.synthesisHistory.length - 1);
        const newIndex = direction === 'prev' ? Math.max(0, currentIndex - 1) : Math.min(node.synthesisHistory.length - 1, currentIndex + 1);
        const entry = node.synthesisHistory[newIndex];
        setLocalNodes(prev => prev.map(n => n.id === node.id ? { ...n, title: entry.title, content: entry.content, historyIndex: newIndex } : n));
    };

    const renderEdges = useMemo(() => {
        if (!localEdges || !localNodes) return null;
        return localEdges.map(edge => {
            const source = localNodes.find(n => n.id === edge.source);
            const target = localNodes.find(n => n.id === edge.target);
            if (!source || !target) return null;
            const sx = source.x + (source.width || 250) / 2;
            const sy = source.y + 75; 
            const tx = target.x + (target.width || 250) / 2;
            const ty = target.y + 75;
            const isSpark = edge.type === 'spark';
            const isConflict = edge.type === 'conflict';
            const isSynthesis = edge.type === 'synthesis';
            const isNeural = edge.type === 'neural'; 
            let strokeColor = "#CBD5E1";
            if (isSpark) strokeColor = "#fbbf24"; 
            if (isConflict) strokeColor = "#A855F7"; 
            if (isSynthesis) strokeColor = "#10B981"; 
            if (isNeural) strokeColor = "#3B82F6"; 
            return (
                <g key={edge.id}>
                    <line 
                        x1={sx} y1={sy} x2={tx} y2={ty} 
                        stroke={strokeColor} 
                        strokeWidth="2" 
                        strokeDasharray={(isSpark || isNeural) ? "4,4" : "none"} 
                        className={isConflict ? "animate-pulse" : ""} 
                    />
                </g>
            );
        });
    }, [localEdges, localNodes]);

    if (!activeCanvasId) { 
        return ( 
            <div className="h-full flex flex-col pt-24 pb-10 px-6 md:px-10 overflow-hidden relative">
                <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
                    <div className="flex flex-col space-y-6 mb-8 flex-shrink-0 animate-fade-in">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-end">
                            <div>
                                <div className="flex items-center space-x-2 text-gray-400 mb-1"><LayoutGrid className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">{dashboardView === 'active' ? `${canvases.length} Active Boards` : `${canvasTrash.length} Deleted Boards`}</span></div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Canvas</h1>
                            </div>
                            <div className="flex items-center gap-2 mt-4 md:mt-0">
                                <button onClick={onExitWorkspace} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-400 hover:text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center hover:bg-gray-50 mr-2"><ArrowLeft className="w-3.5 h-3.5 mr-2" /> About Kno</button>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button onClick={() => setDashboardView('active')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dashboardView === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>Active</button>
                                    <button onClick={() => setDashboardView('trash')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center ${dashboardView === 'trash' ? 'bg-white shadow-sm text-red-500' : 'text-gray-400 hover:text-gray-600'}`}><Trash2 className="w-3 h-3 mr-1" /> Bin</button>
                                </div>
                                <button onClick={handleCreateCanvas} className="group flex items-center px-5 py-2.5 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl ml-2"><Plus className="w-4 h-4 mr-2" /> New Canvas</button>
                            </div>
                        </div>
                    </div>
                     <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                        {dashboardView === 'active' ? (
                            canvases.length === 0 ? (
                                <div className="flex flex-col items-center justify-center pt-20 opacity-30 cursor-pointer group" onClick={handleCreateCanvas}>
                                    <LayoutGrid className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform" />
                                    <p className="font-bold uppercase tracking-widest mb-4">No Canvases Created</p>
                                    <button className="px-6 py-2 bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all">Create First Canvas</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {canvases.map(canvas => (
                                        <div key={canvas.id} onClick={() => onSelectCanvas(canvas.id)} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group flex flex-col h-64 relative">
                                            <button onClick={(e) => { e.stopPropagation(); onMoveCanvasToTrash(canvas.id); }} className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 className="w-4 h-4" /></button>
                                            <div className="flex-1 bg-gray-50 rounded-2xl mb-4 flex items-center justify-center border border-gray-100 relative overflow-hidden"><LayoutGrid className="w-8 h-8 text-gray-300" /></div>
                                            <div className="relative group/editarea">
                                                {editingCanvasTitleId === canvas.id ? (
                                                    <input 
                                                        value={tempCanvasTitleVal}
                                                        onChange={(e) => setTempCanvasTitleVal(e.target.value)}
                                                        onBlur={(e) => handleSaveCanvasRename(e)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveCanvasRename(e)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                        className="font-bold text-lg text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none w-full"
                                                    />
                                                ) : (
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <h3 className="font-bold text-lg text-gray-900 mb-1 truncate flex items-center cursor-text group/title hover:bg-gray-50 rounded px-1 -mx-1" onDoubleClick={(e) => handleStartCanvasRename(e, canvas)}>
                                                            {canvas.title}
                                                            <Edit2 className="w-3 h-3 ml-2 text-gray-400 opacity-0 group-hover/title:opacity-100 hover:text-blue-500 transition-all cursor-pointer" onClick={(e) => handleStartCanvasRename(e, canvas)} />
                                                        </h3>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center mt-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{canvas.state.nodes.length} Nodes</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {canvasTrash.map(canvas => (
                                    <div key={canvas.id} className="bg-gray-50 p-6 rounded-3xl border border-gray-200 opacity-80 hover:opacity-100 transition-all flex flex-col h-64">
                                        <div className="flex-1 bg-gray-100 rounded-2xl mb-4 flex items-center justify-center border border-gray-200"><LayoutGrid className="w-8 h-8 text-gray-300" /></div>
                                        <div><h3 className="font-bold text-lg text-gray-500 mb-1 truncate line-through decoration-red-300">{canvas.title}</h3><div className="flex justify-between items-center mt-4"><button onClick={() => onRestoreCanvas(canvas.id)} className="flex items-center text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-wider bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"><RotateCw className="w-3 h-3 mr-1.5" /> Restore</button><button onClick={() => onDeleteCanvasForever(canvas.id)} className="flex items-center text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg"><Trash2 className="w-3 h-3 mr-1.5" /> Delete</button></div></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
    );}

    return (
        <div className="h-full relative overflow-hidden bg-gray-50 flex">
            <AnimatePresence>
                {dragWarningItem && (
                    <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} onClick={() => { setPreviewSignal(dragWarningItem); setDragWarningItem(null); }} className="fixed top-28 left-1/2 z-[200] bg-white/95 backdrop-blur-xl border border-gray-100 pl-2 pr-6 py-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all group">
                        <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 group-hover:bg-amber-100 transition-colors relative overflow-hidden">
                            <Save className="w-5 h-5 text-amber-600 relative z-10" />
                            <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-tight mb-0.5">Unprocessed Signal</span>
                            <span className="text-xs font-bold text-gray-900 group-hover:text-amber-700 transition-colors">Tap to review & save</span>
                        </div>
                        <div className="w-px h-6 bg-gray-100 mx-1"></div>
                        <div className="text-gray-300 group-hover:text-amber-500 transition-colors"><ArrowRight className="w-4 h-4" /></div>
                    </motion.div>
                )}
            </AnimatePresence>
            <LibraryDrawer isOpen={drawerOpen} setIsOpen={setDrawerOpen} inbox={inbox} inboxTrash={inboxTrash} library={library} noteTrash={noteTrash} onDeleteSignal={onDeleteSignal} onRestoreSignal={onRestoreSignal} onDeleteSignalForever={onDeleteSignalForever} onKeepSignal={onKeepSignal} onDeleteNote={onDeleteNote} onRestoreNote={onRestoreNote} onDeleteNoteForever={onDeleteNoteForever} onSelectSignal={handleSelectSignal} onCapture={onCapture} onGoHome={handleGoHomeCallback} onDragWarn={handleDragWarnCallback} onEnterMemoryLab={onEnterMemoryLab} onGoToLibrary={onGoToLibrary} />
            {previewSignal && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewSignal(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{previewSignal.platform} Signal</span><h2 className="text-xl font-black text-gray-900 leading-tight">{previewSignal.title}</h2></div>
                            <button onClick={() => setPreviewSignal(null)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div><h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3 flex items-center"><FileText className="w-4 h-4 mr-2" /> Summary</h3><div className="space-y-2">{previewSignal.summary.map((s, i) => (<div key={i} className="flex items-start text-sm text-gray-600 leading-relaxed"><span className="mr-3 mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>{s}</div>))}</div></div>
                            {previewSignal.generatedQuiz && previewSignal.generatedQuiz.length > 0 && (
                                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100"><h3 className="text-xs font-bold text-blue-900 uppercase tracking-widest mb-4 flex items-center"><HelpCircle className="w-4 h-4 mr-2" /> Quiz Preview</h3><div className="space-y-4">{previewSignal.generatedQuiz.map((q, i) => (<div key={i} className="bg-white p-4 rounded-xl border border-blue-100/50 shadow-sm"><p className="text-xs font-bold text-gray-900 mb-2">{i+1}. {q.question}</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{q.options.map((opt, oi) => { const userSelection = previewQuizAnswers[i]; const hasAnswered = userSelection !== undefined; const isCorrect = oi === q.correctAnswerIndex; const isSelected = userSelection === oi; let styleClass = "bg-gray-50 border-gray-100 text-gray-600 hover:bg-white hover:border-gray-300"; if (hasAnswered) { if (isCorrect) styleClass = "bg-green-50 border-green-200 text-green-800 font-bold shadow-sm"; else if (isSelected) styleClass = "bg-red-50 border-red-200 text-red-800 font-bold"; else styleClass = "bg-white border-gray-100 text-gray-400 opacity-50"; } return (<button key={oi} onClick={() => setPreviewQuizAnswers(prev => ({...prev, [i as any]: oi}))} className={`text-[10px] px-3 py-2 rounded-lg border text-left transition-all flex justify-between items-center ${styleClass}`}><span className="mr-2">{opt}</span>{hasAnswered && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}{hasAnswered && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}</button>); })}</div></div>))}</div></div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <button onClick={() => { onDeleteSignal(previewSignal.id); setPreviewSignal(null); }} className="text-xs font-bold text-red-500 hover:text-red-700 px-4 py-2">Discard</button>
                            <button onClick={() => { onKeepSignal(previewSignal, undefined, previewQuizAnswers); setPreviewSignal(null); }} className="bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition shadow-lg flex items-center"><Check className="w-4 h-4 mr-2" /> Save to Library</button>
                        </div>
                    </div>
                </div>
            )}
            {activeCanvas && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] bg-white/90 backdrop-blur-md px-6 py-2 rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center group/title cursor-text" onClick={(e) => handleStartCanvasRename(e, activeCanvas)} data-html2canvas-ignore="true" >
                    {editingCanvasTitleId === activeCanvas.id ? (
                        <input value={tempCanvasTitleVal} onChange={(e) => setTempCanvasTitleVal(e.target.value)} onBlur={(e) => handleSaveCanvasRename(e)} onKeyDown={(e) => e.key === 'Enter' && handleSaveCanvasRename(e)} autoFocus className="bg-transparent font-bold text-sm text-gray-900 focus:outline-none text-center min-w-[200px]" onClick={(e) => e.stopPropagation()} />
                    ) : (
                        <>
                            <span className="font-bold text-sm text-gray-900 mr-2">{activeCanvas.title}</span>
                            <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                        </>
                    )}
                </div>
            )}
            {activeCanvas && (
                <div className="absolute top-6 right-6 z-[100] flex gap-2 pointer-events-auto" data-html2canvas-ignore="true">
                    <button onClick={() => handleExport('pdf')} disabled={isExporting} className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all font-bold text-xs flex items-center text-gray-700 hover:text-black cursor-pointer pointer-events-auto">
                        {isExporting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <FileExport className="w-3 h-3 mr-2" />} PDF
                    </button>
                    <button onClick={() => handleExport('md')} disabled={isExporting} className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all font-bold text-xs flex items-center text-gray-700 hover:text-black cursor-pointer pointer-events-auto">
                        <FileText className="w-3 h-3 mr-2" /> MD
                    </button>
                </div>
            )}
            <div ref={canvasRef} tabIndex={0} id="canvas-wrapper-id" className={`flex-1 relative overflow-hidden select-none touch-none overscroll-none outline-none ${interactionMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onDragOver={handleCanvasDragOver} onDrop={handleCanvasDrop} style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`, backgroundPosition: `${viewport.x}px ${viewport.y}px`, touchAction: 'none', overscrollBehavior: 'none' }}>
                <div className="absolute top-0 left-0 w-full h-full origin-top-left" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
                    <svg className="absolute inset-0 pointer-events-none overflow-visible z-0" width="100%" height="100%">{renderEdges}</svg>
                    {localNodes.map(node => {
                        const critique = node.critique;
                        const hasCritique = !!critique;
                        const isBeingScanned = scanningNodeId === node.id;
                        const isSelected = selectedNodeIds.has(node.id);
                        const isCritiqueVisible = expandedCritiques[node.id]; 
                        const isNeuralDump = node.source === 'neural_dump';
                        const isSpark = node.type === 'spark' || node.type === 'insight' || node.color === '#F59E0B'; 
                        const isAlchemy = node.type === 'asset' || node.color === '#10B981';
                        const isCollider = node.type === 'synthesis' || node.type === 'conflict' || node.color === '#A855F7'; 
                        const isSource = !isNeuralDump && !isSpark && !isAlchemy && !isCollider;
                        const isManualNote = (node.source === 'manual' && !node.noteId) || (!node.source && !node.noteId && isSource);
                        const nodeHasHistory = isSynthesis(node); 
                        const isEditing = editingNodeId === node.id;
                        const nodeX = Math.round(node.x);
                        const nodeY = Math.round(node.y);
                        const hasQuiz = !!(canvasNodeQuizzes && canvasNodeQuizzes[node.id] && canvasNodeQuizzes[node.id].length > 0);
                        const linkedNote = node.noteId ? noteMap.get(node.noteId) : null;
                        const hasFiles = linkedNote?.userFiles && linkedNote.userFiles.length > 0;
                        let cardClasses = "bg-white border-blue-200 shadow-sm"; 
                        if (isNeuralDump) cardClasses = "bg-blue-50 border-blue-200 shadow-sm";
                        else if (isSpark) cardClasses = "bg-amber-50 border-amber-200 shadow-sm";
                        else if (isAlchemy) cardClasses = "bg-emerald-50 border-emerald-200 shadow-sm";
                        else if (isCollider) cardClasses = "bg-violet-50 border-violet-200 shadow-sm";
                        const label = isNeuralDump ? 'NEURAL DUMP' : (isSpark ? 'SPARK' : isAlchemy ? 'ALCHEMY' : (isCollider ? 'COLLIDER' : (isManualNote ? 'NOTE' : 'SOURCE')));
                        let ringColor = 'ring-blue-500 border-blue-500'; 
                        if (isSpark) ringColor = 'ring-amber-500 border-amber-500';
                        if (isAlchemy) ringColor = 'ring-emerald-500 border-emerald-500';
                        if (isCollider) ringColor = 'ring-violet-500 border-violet-500';
                        if (isNeuralDump) ringColor = 'ring-blue-600 border-blue-600';
                        let critiqueStatus = null;
                        if (critique) {
                            if (critique.structuredAnalysis) {
                                const logicStatus = critique.structuredAnalysis.logic?.status?.toLowerCase() || '';
                                const factualStatus = critique.structuredAnalysis.factual?.status?.toLowerCase() || '';
                                const balanceStatus = critique.structuredAnalysis.balance?.status?.toLowerCase() || '';
                                if (logicStatus.includes('fallacy') || factualStatus.includes('unverified')) critiqueStatus = 'danger';
                                else if (balanceStatus.includes('skewed') || balanceStatus.includes('echo')) critiqueStatus = 'warning';
                                else critiqueStatus = 'safe';
                            } else {
                                critiqueStatus = critique.isSafe ? 'safe' : 'danger';
                            }
                        }
                        return (
                            <div key={node.id} onPointerDown={(e) => handleNodePointerDown(e, node)} onDoubleClick={(e) => { 
                                e.stopPropagation(); 
                                if (node.noteId && onOpenChat) {
                                    onOpenChat(node.noteId);
                                } else {
                                    setEditingNodeId(node.id); setTempNodeTitle(node.title || ""); setTempNodeContent(node.content || ""); 
                                }
                            }} className={`absolute rounded-2xl border p-4 group hover:shadow-xl transition-shadow select-none h-auto min-h-[150px] ${interactionMode === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isSelected ? `ring-2 ${ringColor} z-50` : ''} ${isEditing ? 'ring-2 ring-blue-500 z-[100]' : ''} ${cardClasses} ${critiqueStatus === 'danger' && isCritiqueVisible ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : ''} ${critiqueStatus === 'safe' && isCritiqueVisible ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`} style={{ left: nodeX, top: nodeY, width: node.width || 250, zIndex: activeDragNode === node.id || isEditing ? 100 : (isSelected ? 50 : 1) }} >
                                <div className="absolute top-2 right-2 flex items-center space-x-2 z-50 opacity-0 group-hover:opacity-100 transition-all">
                                    {node.noteId && onOpenChat && (
                                        <button onClick={(e) => { e.stopPropagation(); onOpenChat(node.noteId!); }} className="p-1.5 bg-gray-900 text-white rounded-lg transition-all transform hover:scale-110 active:scale-95" title="Chat with Ko" > <MessageSquare size={10} /> </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }} className="bg-white/50 hover:bg-red-500 hover:text-white text-gray-400 rounded-full p-1 transition-all" title="Delete Node" > <X className="w-3.5 h-3.5" /> </button>
                                </div>
                                {isSelected && !isEditing && ( <div className="absolute bottom-3 right-3 w-6 h-6 cursor-se-resize z-50 flex items-end justify-end p-1 hover:bg-black/5 rounded-br-lg group/resize" onPointerDown={(e) => handleResizeStart(e, node)} > <div className="w-2 h-2 border-r-2 border-b-2 border-gray-300 group-hover/resize:border-blue-500 transition-colors"></div> </div> )}
                                {isCritiqueVisible && critiqueStatus === 'danger' && <div className="absolute -top-3 -right-2 z-20 bg-red-600 text-white px-3 py-1 text-[9px] font-bold tracking-wider rounded-full shadow-lg flex items-center gap-1 animate-in slide-in-from-bottom-2"><AlertTriangle size={10} fill="white" className="text-white" /> FALLACY DETECTED</div>}
                                {isCritiqueVisible && critiqueStatus === 'warning' && <div className="absolute -top-3 -right-2 z-20 bg-amber-500 text-white px-3 py-1 text-[9px] font-bold tracking-wider rounded-full shadow-lg flex items-center gap-1 animate-in slide-in-from-bottom-2"><Zap size={10} fill="white" className="text-white" /> COGNITIVE SKEW</div>}
                                {isCritiqueVisible && critiqueStatus === 'safe' && <div className="absolute -top-3 -right-2 z-20 bg-emerald-600 text-white px-3 py-1 text-[9px] font-bold tracking-wider rounded-full shadow-lg flex items-center gap-1 animate-in slide-in-from-bottom-1"><CheckCircle2 size={10} fill="white" className="text-white" /> SOLID LOGIC</div>}
                                {isBeingScanned && <div className="absolute inset-0 z-50 rounded-2xl bg-[#00FF41]/10 overflow-hidden pointer-events-none"><div className="absolute top-0 w-full h-1 bg-[#00FF41] shadow-[0_0_15px_#00FF41] animate-scanline"></div><div className="absolute bottom-2 right-2 text-[9px] font-mono font-bold text-[#00FF41] animate-pulse">LOGIC_SCANNING...</div></div>}
                                {isEditing ? (
                                    <div className="flex flex-col h-full space-y-2 relative z-50" onPointerDown={e => e.stopPropagation()}>
                                        <input value={tempNodeTitle} onChange={(e) => setTempNodeTitle(e.target.value)} className="font-bold text-sm bg-transparent border-b-2 border-blue-500 focus:outline-none pb-1 text-gray-900 w-full" placeholder="Title..." autoFocus />
                                        <textarea value={tempNodeContent} onChange={(e) => setTempNodeContent(e.target.value)} className="flex-1 text-[10px] bg-white/50 border border-gray-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[100px] text-gray-700 leading-relaxed" placeholder="Type your note here..." onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { handleSaveNodeEdit(); } }} />
                                        <div className="flex justify-end pt-2"><button onClick={handleSaveNodeEdit} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 flex items-center"><Check className="w-3 h-3 mr-1" /> Save</button></div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-black/5">
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isSpark ? 'text-amber-800 flex items-center' : isAlchemy ? 'text-emerald-800 flex items-center' : isCollider ? 'text-violet-800 flex items-center' : isNeuralDump ? 'text-blue-800 flex items-center' : 'text-blue-700 flex items-center'}`}>
                                                    {isSpark && <Sparkles className="w-3 h-3 mr-1 text-amber-500" />}
                                                    {isAlchemy && <FlaskConical className="w-3 h-3 mr-1 text-emerald-500" />}
                                                    {isCollider && <Zap className="w-3 h-3 mr-1 text-violet-500" />}
                                                    {isNeuralDump && <BrainCircuit className="w-3 h-3 mr-1 text-blue-500" />}
                                                    {label}
                                                </span>
                                            </div>
                                        </div>
                                        {node.question && <div className="mb-3 px-2 py-1.5 bg-white/50 rounded-lg border border-black/5"><p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Asked:</p><p className="text-[10px] text-gray-600 font-medium italic line-clamp-2">"{node.question}"</p></div>}
                                        <h4 className={`font-bold text-sm mb-2 leading-snug break-words ${isSpark ? 'text-amber-900' : isAlchemy ? 'text-emerald-900' : isCollider ? 'text-violet-900' : isNeuralDump ? 'text-blue-900' : 'text-gray-900'}`}>{node.title || 'Untitled'}</h4>
                                        {node.isThinking ? (
                                            <div className="bg-black/90 p-4 rounded-xl"><ReasoningTrace title="Processing" platform={isSpark ? "Spark" : isAlchemy ? "Alchemy" : "Collider"} type="synthesis" /></div>
                                        ) : (
                                            <>
                                                {node.imageUrl && (
                                                    <div className="mb-3 rounded-lg overflow-hidden border border-black/10 group/image relative cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setZoomedImage(node.imageUrl!); }}>
                                                        <img src={node.imageUrl} alt="Generated" className="w-full h-auto object-cover max-h-60" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100"><ZoomIn className="w-6 h-6 text-white drop-shadow-md" /></div>
                                                    </div>
                                                )}
                                                <div className={`text-[10px] whitespace-pre-wrap leading-relaxed break-words ${isSpark ? 'text-amber-800' : isAlchemy ? 'text-emerald-800' : isCollider ? 'text-violet-800' : isNeuralDump ? 'text-blue-800' : 'text-gray-500'}`}>{renderMarkdown(String(node.content || ""))}</div>
                                                {hasFiles && (
                                                    <div className="mt-3 pt-2 border-t border-dashed border-gray-200/50 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                        {linkedNote?.userFiles?.map((f, i) => (
                                                            <div key={i} onClick={(e) => { e.stopPropagation(); node.noteId && onOpenChat?.(node.noteId, i); }} className="w-8 h-8 flex-shrink-0 rounded border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors" title="Chat with this file">
                                                                {f.startsWith('data:image') ? (
                                                                    <img src={f} className="w-full h-full object-cover" alt="attachment" />
                                                                ) : (
                                                                    <FileText className="w-4 h-4 text-gray-400" />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {isCritiqueVisible && critique && (
                                            <div className="mt-3 bg-zinc-950 rounded-xl p-3 font-mono text-[9px] border border-zinc-800 shadow-lg relative overflow-hidden animate-slide-up text-zinc-300">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${critiqueStatus === 'safe' ? 'bg-emerald-500' : critiqueStatus === 'warning' ? 'bg-amber-500' : 'bg-red-600'}`}></div>
                                                <div className="flex flex-col gap-3 relative z-10 pl-2">
                                                    <div className="flex items-center text-[8px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 mb-1">🛡️ CRITIC SCAN RESULTS</div>
                                                    {critique.structuredAnalysis ? (
                                                        <>
                                                            <div><div className="text-[8px] font-bold text-zinc-500 uppercase">1. 📊 FACTUAL ACCURACY</div><div className="pl-1"><div><span className="text-zinc-500 font-bold">Status:</span> {critique.structuredAnalysis.factual.status}</div><div><span className="text-zinc-500 font-bold">Issue:</span> {critique.structuredAnalysis.factual.issue}</div></div></div>
                                                            <div className="mt-1"><div className="text-[8px] font-bold text-zinc-500 uppercase">2. ⚖️ COGNITIVE BALANCE</div><div className="pl-1"><div><span className="text-zinc-500 font-bold">Status:</span> {critique.structuredAnalysis.balance.status}</div><div><span className="text-zinc-500 font-bold">Check:</span> {critique.structuredAnalysis.balance.check}</div></div></div>
                                                            <div className="mt-1"><div className="text-[8px] font-bold text-zinc-500 uppercase">3. 🧠 LOGICAL INTEGRITY</div><div className="pl-1"><div><span className="text-zinc-500 font-bold">Status:</span> {critique.structuredAnalysis.logic.status}</div><div><span className="text-zinc-500 font-bold">Type:</span> {critique.structuredAnalysis.logic.type}</div><div><span className="text-zinc-500 font-bold">Explanation:</span> {critique.structuredAnalysis.logic.explanation}</div></div></div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-start"><span className={`${critique.isSafe ? 'text-emerald-500' : 'text-red-500'} font-bold mr-2 shrink-0`}>{'>'} {critique.isSafe ? 'STATUS:' : 'ISSUE:'}</span><span className="leading-tight">{critique.issue || "Analyzed"}</span></div>
                                                            <div className="flex items-start"><span className="text-blue-400 font-bold mr-2 shrink-0">{'>'} {critique.isSafe ? 'ACTION:' : 'FIX:'}</span><span className="leading-tight">{critique.fix || "No action needed."}</span></div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {nodeHasHistory && !node.isThinking && (
                                            <div className={`mt-3 flex items-center justify-between border-t border-black/5 pt-2`}>
                                                <div className="flex items-center space-x-1">
                                                    <button onClick={(e) => {e.stopPropagation(); navigateHistory(node, 'prev')}} disabled={!node.historyIndex || node.historyIndex === 0} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronLeft className="w-3 h-3" /></button>
                                                    <span className={`text-[8px] font-bold ${isSpark ? 'text-amber-400' : isAlchemy ? 'text-emerald-400' : 'text-violet-300'}`}>V{(node.historyIndex || 0) + 1}</span>
                                                    <button onClick={(e) => {e.stopPropagation(); navigateHistory(node, 'next')}} disabled={node.historyIndex === (node.synthesisHistory?.length || 1) - 1} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronRight className="w-3 h-3" /></button>
                                                    <button onClick={(e) => {e.stopPropagation(); regenerateNode(node)}} className={`p-1 hover:bg-black/5 rounded ml-1 ${isSpark ? 'text-amber-600' : isAlchemy ? 'text-emerald-600' : 'text-violet-500'}`} title="Regenerate"><RefreshCw className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                        )}
                                        {hasQuiz && (
                                            <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                                <div className="flex items-center justify-between mb-2"><span className="text-[9px] font-black text-blue-600 uppercase">Knowledge Check</span><HelpCircle className="w-3 h-3 text-blue-400" /></div>
                                                <p className="text-[10px] font-bold text-blue-900 mb-2">{canvasNodeQuizzes[node.id][0].question}</p>
                                                <div className="space-y-1">{canvasNodeQuizzes[node.id][0].options.map((opt, i) => (<div key={i} className="text-[9px] bg-white border border-blue-100 p-1.5 rounded text-gray-600">{opt}</div>))}</div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <motion.div drag dragMomentum={false} className="fixed bottom-8 left-1/2 z-50 flex flex-col items-center cursor-move" style={{ x: '-50%' }} onPointerDown={(e) => e.stopPropagation()} >
                 <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 rounded-full p-2 flex items-center space-x-1 pointer-events-auto">
                    <ToolbarButton onClick={onGoToLibrary} icon={<Brain className="w-5 h-5 text-pink-500" />} title="Library" description="View your knowledge archive" className="hover:bg-pink-50" />
                    <ToolbarButton onClick={onEnterMemoryLab} icon={<BrainCircuit className="w-5 h-5 text-blue-600" />} title="Memory Lab" description="Analyze retention and recall" className="hover:bg-blue-50" />
                    <ToolbarButton onClick={() => setInteractionMode(prev => prev === 'select' ? 'pan' : 'select')} icon={interactionMode === 'pan' ? <Move className="w-5 h-5" /> : <MousePointer2 className="w-5 h-5" />} title="Interact" description={interactionMode === 'pan' ? 'Switch to Select Mode' : 'Switch to Pan Mode'} active={interactionMode === 'pan'} />
                    <div className="w-px h-8 bg-gray-100 mx-1"></div>
                    <ToolbarButton onClick={handleAddNote} icon={<Plus className="w-5 h-5" />} title="New Note" description="Create a new memory node" />
                    <ToolbarButton onClick={handleQuickShift} icon={<LayoutGrid className="w-5 h-5" />} title="Auto Arrange" description="Organize chaos into order" />
                    <div className="w-px h-8 bg-gray-100 mx-1"></div>
                    <ToolbarButton onClick={() => handleCollider()} icon={<Zap className="w-5 h-5 fill-current text-purple-500" />} title="Collider" description="Synthesize two conflicting ideas" disabled={selectedNodeIds.size < 2} className="hover:bg-purple-50" />
                    <ToolbarButton onClick={handleAlchemy} icon={<FlaskConical className="w-5 h-5 text-emerald-500" />} title="Alchemy" description="Transform multiple notes into gold" disabled={selectedNodeIds.size < 2} className="hover:bg-green-50" />
                    <ToolbarButton onClick={handleSpark} icon={<Sparkles className="w-5 h-5 fill-current text-yellow-500" />} title="Spark" description="Find serendipitous connections" disabled={selectedNodeIds.size !== 1} className="hover:bg-yellow-50" />
                    <ToolbarButton onClick={handleLogicScan} icon={<Shield className="w-5 h-5 text-red-500" />} title="Logic Guard" description="Scan for logical fallacies" disabled={selectedNodeIds.size !== 1} className="hover:bg-red-50" />
                    <div className="w-px h-8 bg-gray-100 mx-1"></div>
                    <ToolbarButton onClick={undo} icon={<Undo2 className="w-5 h-5" />} title="Undo" description="Revert last change" disabled={historyIndex <= 0} />
                    <ToolbarButton onClick={redo} icon={<Redo2 className="w-5 h-5" />} title="Redo" description="Redo reverted change" disabled={historyIndex >= history.length - 1} />
                    <div className="w-px h-8 bg-gray-100 mx-1"></div>
                    <ToolbarButton onClick={() => setIsTrashOpen(true)} icon={<Trash2 className="w-5 h-5" />} title="Recycle Bin" description="View deleted items" />
                </div>
            </motion.div>
            <motion.div drag dragMomentum={false} className="fixed bottom-8 left-8 z-50 cursor-move" onPointerDown={(e) => e.stopPropagation()} >
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.2, 5) }))} className="p-3 bg-white rounded-full shadow-lg border border-gray-100 text-gray-600 hover:text-black transition-all" title="Zoom In"><ZoomIn className="w-5 h-5" /></button>
                    <button onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.2, 0.1) }))} className="p-3 bg-white rounded-full shadow-lg border border-gray-100 text-gray-600 hover:text-black transition-all" title="Zoom Out"><ZoomOut className="w-5 h-5" /></button>
                </div>
            </motion.div>
            {zoomedImage && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative max-w-full max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setZoomedImage(null)} className="absolute -top-12 right-0 text-white/70 hover:text-white transition p-2 bg-black/50 rounded-full"><X className="w-6 h-6" /></button>
                        <img src={zoomedImage} className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl object-contain" alt="Zoomed Visual" />
                        <div className="mt-6"><a href={zoomedImage} download={`kno-visual-${Date.now()}.png`} className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition shadow-lg flex items-center" onClick={(e) => e.stopPropagation()}><Download className="w-4 h-4 mr-2" /> Download Visual</a></div>
                    </div>
                </div>
            )}
            {isTrashOpen && (
                 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsTrashOpen(false)}>
                     <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
                         <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                             <h3 className="font-bold text-lg text-gray-900">Recycle Bin</h3>
                             <button onClick={() => setIsTrashOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
                         </div>
                         <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50 space-y-3">
                             {deletedNodes.map((node, i) => (
                                 <div key={i} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                                     <span className="text-sm font-bold truncate w-40">{node.title}</span>
                                     <button onClick={() => handleRestoreDeletedNode(node)} className="text-xs text-blue-500 font-bold">Restore</button>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
            )}
        </div>
    );
};

function isSynthesis(node: CanvasNode) {
    const t = node.type as string;
    return t === 'synthesis' || t === 'spark' || t === 'asset' || t === 'conflict' || (node.color && ['#F59E0B', '#10B981', '#A855F7'].includes(node.color));
}