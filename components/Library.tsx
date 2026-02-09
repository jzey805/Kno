
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Note, AppTheme, QuizFeedbackType, Platform } from '../types';
import { Search, Brain, BrainCircuit, ArrowRight, Sparkles, LayoutGrid, AlertTriangle, Trash2, RotateCw, FileUp, HelpCircle } from 'lucide-react';
import { SmartCard } from './SmartCard';

interface LibraryProps {
  library: Note[];
  theme: AppTheme;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  showDeleteWarning: boolean;
  onToggleDeleteWarning: (show: boolean) => void;
  usedNoteIds: Set<string>; 
  onQuizFeedback?: (itemId: string, feedback: QuizFeedbackType, suppress: boolean) => void;
  initialFocusedNoteId?: string | null;
  onFocusCleared?: () => void;
  trash: Note[];
  onRestoreNote: (note: Note) => void;
  onDeleteForever: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
  onOpenMemoryLab: () => void;
  onOpenNeuralDump: () => void;
  onOpenChat: (noteId?: string, fileIndex?: number) => void; // Updated
}

export const Library: React.FC<LibraryProps> = ({ library, theme, onUpdateNote, onDeleteNote, showDeleteWarning, onToggleDeleteWarning, usedNoteIds, onQuizFeedback, initialFocusedNoteId, onFocusCleared, trash, onRestoreNote, onDeleteForever, onDuplicateNote, onOpenMemoryLab, onOpenNeuralDump, onOpenChat }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'revision'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // Updated state to hold an array of selected tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  
  // Delete Modal State
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Handle initial focus for deep-linking
  useEffect(() => {
    if (initialFocusedNoteId) {
        setExpandedId(initialFocusedNoteId);
        // Scroll to the item
        setTimeout(() => {
          const el = document.getElementById(`note-${initialFocusedNoteId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        if (onFocusCleared) onFocusCleared();
    }
  }, [initialFocusedNoteId, library]);

  // Get all unique tags from library
  const allTags = useMemo(() => {
      const tags = new Set<string>();
      (library || []).forEach(note => {
          if (note.tags) (note.tags || []).forEach(t => tags.add(t));
      });
      return Array.from(tags).sort();
  }, [library]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  // New handler for toggling tags
  const toggleTag = (tag: string) => {
      setSelectedTags(prev => 
          prev.includes(tag) 
              ? prev.filter(t => t !== tag) 
              : [...prev, tag]
      );
  };

  const handleDeleteRequest = (id: string) => {
    if (showDeleteWarning) {
        setPendingDeleteId(id);
        setDontShowAgain(false);
    } else {
        performDelete(id);
    }
  };

  const performDelete = (id: string) => {
    onDeleteNote(id);
    if (expandedId === id) setExpandedId(null);
    setPendingDeleteId(null);
  };

  const filteredLibrary = (library || []).filter(note => {
    const matchesSearch = (note.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    // Updated Logic: OR Filter (Match if note has ANY of the selected tags)
    // If no tags selected, match all.
    const matchesTag = selectedTags.length === 0 
        ? true 
        : selectedTags.some(t => (note.tags || []).includes(t));

    if (filterMode === 'revision') return matchesSearch && matchesTag && note.needsRevision;
    return matchesSearch && matchesTag;
  });

  return (
    // Outer container handles scrolling for the entire page. 
    <div className="h-full w-full overflow-y-auto bg-white/50 scroll-smooth">
      <div className="flex flex-col pt-4 md:pt-20 px-4 md:px-10 max-w-7xl mx-auto w-full pb-32 min-h-full">
          
          {/* Header & Controls */}
          <div className="flex flex-col space-y-6 mb-8 animate-fade-in pt-12 md:pt-0">
              {/* Header Row */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-end">
                  <div>
                      <div className="flex items-center space-x-2 text-gray-400 mb-1">
                          <Brain className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                              {viewMode === 'active' ? `${filteredLibrary.length} Neural Nodes` : 'Data Purge Sector'}
                          </span>
                      </div>
                      <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                          {viewMode === 'active' ? 'My Brain' : 'Recycle Bin'}
                      </h1>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-4 md:mt-0">
                      <button 
                          onClick={onOpenMemoryLab} 
                          className="group flex items-center px-5 py-2.5 bg-gray-100 hover:bg-gray-900 rounded-xl transition-all duration-300"
                      >
                          <BrainCircuit className="w-4 h-4 mr-2 text-gray-600 group-hover:text-white transition-colors" />
                          <span className="text-xs font-black uppercase tracking-widest text-gray-600 group-hover:text-white transition-colors">Memory Lab</span>
                          <ArrowRight className="w-3 h-3 ml-2 text-gray-400 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                  </div>
              </div>

              {/* Neural Status Card */}
              {viewMode === 'active' ? (
                <div 
                    onClick={onOpenMemoryLab}
                    className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all hover:scale-[1.01]"
                >
                     <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-700">
                         <Brain className="w-32 h-32" />
                     </div>
                     <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                         <div>
                             <h3 className="text-lg font-bold mb-1 flex items-center"><Sparkles className="w-4 h-4 text-yellow-400 mr-2" /> Neural Engine Online</h3>
                             <p className="text-sm text-gray-400 max-w-md">Your second brain is active. Knowledge is being indexed for long-term retention.</p>
                         </div>
                         <div className="flex gap-4">
                             <div className="bg-white/10 rounded-2xl p-3 px-5 backdrop-blur-sm border border-white/5">
                                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Memories</div>
                                 <div className="text-2xl font-black">{library.length}</div>
                             </div>
                             <div className="bg-white/10 rounded-2xl p-3 px-5 backdrop-blur-sm border border-white/5">
                                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Reviews</div>
                                 <div className="text-2xl font-black">{library.reduce((acc, n) => acc + (n.reviewCount || 0), 0)}</div>
                             </div>
                         </div>
                     </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl p-6 text-gray-900 shadow-inner relative overflow-hidden">
                     <div className="relative z-10 flex items-center justify-between">
                         <div>
                            <h3 className="text-lg font-bold mb-1 flex items-center text-red-500"><Trash2 className="w-4 h-4 mr-2" /> Recovery Protocol</h3>
                            <p className="text-sm text-gray-500">Items here can be restored or permanently deleted.</p>
                         </div>
                         <button onClick={() => setViewMode('active')} className="px-4 py-2 bg-white rounded-xl text-xs font-bold shadow-sm">Back to Brain</button>
                     </div>
                </div>
              )}
          </div>

          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row gap-8">
              
              {/* Sidebar Filters */}
              <div className="lg:w-64 flex-shrink-0 space-y-6 lg:sticky lg:top-6 lg:h-fit">
                  {/* Search */}
                  <div className="relative group">
                      <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                          type="text" 
                          placeholder="Search neural paths..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-50 transition-all shadow-sm"
                      />
                  </div>

                  {/* Filter View Toggles */}
                  <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                        <button 
                            onClick={() => { setViewMode('active'); setFilterMode('all'); }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold mb-1 flex items-center ${viewMode === 'active' && filterMode === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5 mr-2" /> All Memories
                        </button>
                        <button 
                            onClick={() => { setViewMode('active'); setFilterMode('revision'); }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold mb-1 flex items-center ${filterMode === 'revision' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Needs Review
                        </button>
                        <div className="h-px bg-gray-100 my-2"></div>
                        <button 
                            onClick={() => setViewMode('trash')}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center ${viewMode === 'trash' ? 'bg-gray-100 text-red-500' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Recycle Bin
                        </button>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Knowledge Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => (
                            <button 
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedTags.includes(tag) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'}`}
                            >
                                {tag.replace('#', '')}
                            </button>
                        ))}
                        {selectedTags.length > 0 && (
                            <button 
                                onClick={() => setSelectedTags([])}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                  </div>
              </div>

              {/* Notes Grid */}
              <div className="flex-1">
                  {viewMode === 'trash' ? (
                        trash.length === 0 ? (
                            <div className="flex flex-col items-center justify-center pt-20 opacity-30">
                                <Sparkles className="w-16 h-16 mb-4" />
                                <p className="font-bold uppercase tracking-widest">Bin is empty</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {trash.map(note => (
                                    <div key={note.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm opacity-60 hover:opacity-100 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-2 py-1 rounded-md text-[10px] font-black bg-gray-100 text-gray-500 uppercase tracking-wider">{note.platform}</span>
                                            <div className="flex space-x-2">
                                                <button onClick={() => onRestoreNote(note)} className="p-2 text-blue-500 bg-blue-50 rounded-full hover:bg-blue-100 transition text-xs font-bold flex items-center"><RotateCw className="w-3 h-3 mr-1" /> Restore</button>
                                                <button onClick={() => onDeleteForever(note.id)} className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition text-xs font-bold flex items-center"><Trash2 className="w-3 h-3 mr-1" /> Delete Forever</button>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold mb-2 line-through decoration-red-300">{note.title}</h3>
                                        <p className="text-sm text-gray-400">Deleted content.</p>
                                    </div>
                                ))}
                            </div>
                        )
                  ) : (
                        filteredLibrary.length === 0 ? (
                            <div className="flex flex-col items-center justify-center pt-20 opacity-30">
                                <Brain className="w-16 h-16 mb-4" />
                                <p className="font-bold uppercase tracking-widest">No Memories Found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {filteredLibrary.map(note => (
                                    <div key={note.id} className="relative group">
                                        {/* External Badge for Quizzes if not expanded */}
                                        {note.generatedQuiz && note.generatedQuiz.length > 0 && expandedId !== note.id && (
                                            <div className="absolute top-4 right-16 z-20 flex items-center space-x-1 bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full text-[9px] font-bold border border-yellow-200">
                                                <HelpCircle className="w-3 h-3" />
                                                <span>Quiz Ready</span>
                                            </div>
                                        )}
                                        <SmartCard 
                                            note={note}
                                            theme={theme}
                                            isExpanded={expandedId === note.id}
                                            onToggleExpand={() => toggleExpand(note.id)}
                                            onUpdateNote={onUpdateNote}
                                            onDeleteNote={handleDeleteRequest}
                                            onOpenChat={(fileIndex) => onOpenChat(note.id, fileIndex)} // Pass the index
                                        />
                                    </div>
                                ))}
                            </div>
                        )
                  )}
              </div>
          </div>
          
          {/* Delete Confirmation Modal */}
          {pendingDeleteId && (
              <div 
                className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
                onClick={() => setPendingDeleteId(null)}
              >
                  <div 
                    className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                      <div className="flex items-center space-x-3 mb-4 text-red-600">
                          <Trash2 className="w-6 h-6" />
                          <h3 className="text-lg font-black uppercase tracking-tight">Delete Memory?</h3>
                      </div>
                      <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
                          This will move the selected note to the recycle bin. You can restore it later if needed.
                      </p>
                      <div className="flex justify-end space-x-3">
                          <button 
                              onClick={() => setPendingDeleteId(null)} 
                              className="px-6 py-3 rounded-xl text-gray-500 hover:bg-gray-100 font-bold text-xs uppercase tracking-widest transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={() => performDelete(pendingDeleteId)} 
                              className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all hover:scale-105 active:scale-95"
                          >
                              Delete
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
