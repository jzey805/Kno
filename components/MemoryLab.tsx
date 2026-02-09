
import React, { useState, useEffect, useMemo } from 'react';
import { Note, AppTheme, RetentionSummary, RetentionPrediction, DailyActivity } from '../types';
import { THEME_ACCENTS } from '../constants';
import { Brain, AlertCircle, Clock, CheckCircle, ArrowRight, RefreshCw, BarChart3, TrendingUp, ShieldAlert, Zap, Loader2, Sparkles, Binary, Calendar, Target, History, ChevronRight, Activity, AlertTriangle, X, CheckCircle2, PartyPopper, ArrowUpRight, ShieldAlert as ShieldIcon, ChevronLeft, ExternalLink, Hash, List, Terminal, RotateCw } from 'lucide-react';
import { analyzeMemoryRetention } from '../services/geminiService';
import { ReasoningTrace } from './Triage';
import { Heatmap } from './Heatmap';

interface MemoryLabProps {
  library: Note[];
  theme: AppTheme;
  onNavigateToNote: (noteId: string) => void;
  onGoToLibrary: () => void;
  data: RetentionSummary | null;
  onUpdateData: (data: RetentionSummary | null) => void;
  activity: DailyActivity[]; // Kept for interface compatibility, but we will derive internally
}

export const MemoryLab: React.FC<MemoryLabProps> = ({ library, theme, onNavigateToNote, onGoToLibrary, data, onUpdateData, activity }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'log'>('audit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [optimisticScore, setOptimisticScore] = useState(data?.summary?.brain_score || 0);

  useEffect(() => {
    if (data?.summary) setOptimisticScore(data.summary.brain_score || 0);
  }, [data?.summary?.brain_score]);

  const getDayKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Derived Activity Data for Heatmap to ensure 1:1 sync with Library content
  const derivedActivity: DailyActivity[] = useMemo(() => {
      const counts: Record<string, number> = {};
      (library || []).forEach(note => {
          // Ensure we use the exact same date construction logic as the calendar
          const d = new Date(note.createdAt);
          const dateKey = getDayKey(d);
          counts[dateKey] = (counts[dateKey] || 0) + 1;
      });
      return Object.keys(counts).map(date => ({ date, count: counts[date] }));
  }, [library]);

  const notesByDate = useMemo(() => {
    const map: Record<string, Note[]> = {};
    (library || []).forEach(note => {
      const date = new Date(note.createdAt);
      const key = getDayKey(date);
      if (!map[key]) map[key] = [];
      map[key].push(note);
    });
    return map;
  }, [library]);

  // Frontend Deduplication of Predictions to ensure UI safety & Filter for only existing notes
  const uniquePredictions = useMemo(() => {
      if (!data || !data.predictions) return [];
      const seen = new Set();
      const validIds = new Set(library.map(n => n.id));
      
      return data.predictions.filter(p => {
          if (!validIds.has(p.noteId)) return false; // Filter out deleted notes
          if (seen.has(p.noteId)) return false;
          seen.add(p.noteId);
          return true;
      });
  }, [data, library]);

  // Derived Urgent Targets List
  const urgentItems = useMemo(() => {
      return uniquePredictions.filter(p => 
          p.risk_level === 'critical' || 
          p.risk_level === 'high' || 
          p.days_since_reviewed === 0 ||
          (p.forgetting_probability || 0) > 0.8
      );
  }, [uniquePredictions]);

  const stats = useMemo(() => {
      const crit = uniquePredictions.filter(p => p.risk_level === 'critical' || p.risk_level === 'high').length;
      const med = uniquePredictions.filter(p => p.risk_level === 'medium').length;
      const low = uniquePredictions.filter(p => p.risk_level === 'low').length;
      return { crit, med, low };
  }, [uniquePredictions]);

  const performAnalysis = async () => {
    if (!library || library.length === 0) {
        setError("Your library is empty. Capture signals first to perform a forensic audit.");
        return;
    }
    setLoading(true);
    setError(null);
    try {
        const result = await analyzeMemoryRetention(library);
        if (result && result.summary) {
            await new Promise(r => setTimeout(r, 4500));
            onUpdateData({ ...result, timestamp: Date.now() });
        } else {
            setError("The Neural Engine returned a partial or malformed signal. Please recalibrate.");
        }
    } catch (e: any) {
        console.error("Analysis Failed:", e);
        setError(e.message === "REQUEST_TIMEOUT" ? "Neural link timed out. Signal quality too low." : "Neural forensic link interrupted.");
    } finally {
        setLoading(false);
    }
  };

  const formatLastReview = (days: number) => {
      if (days === 0) return "TODAY";
      if (days === 1) return "YESTERDAY";
      return `${days} DAYS AGO`;
  };

  const renderHealthFactor = (text: string) => {
      const parts = text.split(/(\d+(?:%|\spercent)?)/i);
      return (
          <p className="text-xs font-bold text-gray-600 leading-relaxed">
              {parts.map((part, i) => 
                  /\d/.test(part) ? <span key={i} className="text-gray-900 font-black">{part}</span> : part
              )}
          </p>
      );
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const days = [];

    for (let i = 0; i < startDay; i++) days.push(<div key={`e-${i}`} />);
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const key = getDayKey(date);
        const isSelected = getDayKey(selectedDate) === key;
        const hasNotes = notesByDate[key]?.length > 0;
        days.push(
            <button 
                key={d} 
                onClick={() => setSelectedDate(date)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-[11px] font-black transition-all relative ${isSelected ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-400'}`}
            >
                {d}
                {hasNotes && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />}
            </button>
        );
    }
    return days;
  };

  return (
    <div className="h-full flex flex-col pt-24 pb-10 px-6 md:px-10 overflow-hidden relative">
      {loading && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
              <div className="max-w-xs w-full space-y-4 scale-90">
                  <div className="flex items-center space-x-3 text-[#00FF41] animate-pulse justify-center">
                      <Terminal className="w-6 h-6" />
                      <span className="text-sm font-black uppercase tracking-[0.2em]">Neural Forensic Register</span>
                  </div>
                  <div className="bg-[#0c1117] border border-gray-800 rounded-2xl p-6 shadow-2xl">
                    <ReasoningTrace title="Library Forensic Audit" platform="Neural Store" type="forensic" />
                  </div>
                  <div className="text-center">
                    <button onClick={() => setLoading(false)} className="mt-4 text-[10px] font-black text-white/40 hover:text-white transition uppercase tracking-widest">Abort Process</button>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8">
          <div>
            <div className="flex items-center space-x-2 text-gray-400 mb-1">
              <Binary className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Engine v4.0</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Memory Lab</h1>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
             <button onClick={onGoToLibrary} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900" title="Back to My Brain">
                <Brain className="w-5 h-5" />
             </button>

             <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl">
                <button onClick={() => setActiveTab('audit')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-white shadow-soft text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>Forensic Audit</button>
                <button onClick={() => setActiveTab('log')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'log' ? 'bg-white shadow-soft text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>Neural Log</button>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'audit' ? (
                <div className="h-full overflow-y-auto no-scrollbar pb-10 space-y-8 animate-fade-in">
                    {error && (
                        <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center space-x-4 text-rose-700 shadow-sm">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                            <button onClick={performAnalysis} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition">Retry Audit</button>
                        </div>
                    )}

                    {data && data.summary ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-gray-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute -top-10 -right-10 opacity-10 group-hover:opacity-20 transition-all duration-700"><Brain className="w-48 h-48" /></div>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Integrity Score</h3>
                                    <div className="flex items-end space-x-2 mb-8">
                                        <span className="text-7xl font-black tracking-tighter">{optimisticScore}</span>
                                        <span className="text-gray-600 font-black mb-2 text-xl">/ 100</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[9px] font-black text-rose-500 mb-1">CRIT</p>
                                            <p className="text-lg font-black">{stats.crit}</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[9px] font-black text-blue-500 mb-1">MED</p>
                                            <p className="text-lg font-black">{stats.med}</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[9px] font-black text-green-500 mb-1">LOW</p>
                                            <p className="text-lg font-black">{stats.low}</p>
                                        </div>
                                    </div>
                                    <button onClick={performAnalysis} className="w-full mt-8 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Recalibrate Analytics
                                    </button>
                                </div>
                                
                                <div className="bg-white rounded-[40px] p-8 shadow-soft border border-gray-100">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center">
                                        <Target className="w-3.5 h-3.5 mr-2" /> Urgent Targets
                                    </h3>
                                    <div className="space-y-4">
                                        {urgentItems.length > 0 ? urgentItems.slice(0, 5).map((p, i) => (
                                            <div key={i} onClick={() => p.noteId && onNavigateToNote(p.noteId)} className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-2xl group hover:shadow-md transition-all cursor-pointer">
                                                <span className="text-xs font-bold text-rose-900 truncate pr-4">{p.topic}</span>
                                                <ChevronRight className="w-4 h-4 text-rose-300 group-hover:text-rose-600" />
                                            </div>
                                        )) : (
                                            <p className="text-xs text-gray-400 italic text-center py-4">No urgent targets identified.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-8 space-y-6">
                                {uniquePredictions.length > 0 ? uniquePredictions.map((p, i) => (
                                    <div key={p.noteId || i} className="bg-white rounded-[40px] p-10 shadow-soft border border-gray-100 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                                        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${p.risk_level === 'critical' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                    {p.risk_level} Risk
                                                </div>
                                                <div className="px-4 py-1.5 rounded-full border border-gray-100 bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                    Decay: {Math.round((p.forgetting_probability || 0) * 100)}%
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] font-bold tracking-wider">
                                                <span className="text-rose-500 bg-rose-50 px-3 py-1 rounded-lg flex items-center"><Clock className="w-3 h-3 mr-1.5" /> REVIEW REQUIRED TODAY</span>
                                                <span className="text-gray-300 flex items-center"><History className="w-3 h-3 mr-1.5" /> LAST REVIEW: {formatLastReview(p.days_since_reviewed)}</span>
                                            </div>
                                        </div>

                                        <div className="mb-8">
                                            <h4 className="text-2xl font-black text-gray-900 leading-tight mb-4 group-hover:text-blue-600 transition-colors">{p.topic}</h4>
                                            <p className="text-sm font-medium text-gray-500 italic leading-relaxed border-l-4 border-gray-200 pl-4">"{p.reason}"</p>
                                        </div>

                                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8">
                                            <h5 className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                                                <AlertTriangle className="w-3 h-3 mr-2" /> Memory Health Factors
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {(p.why_factors && p.why_factors.length > 0 ? p.why_factors : ["Initial encoding is functionally non-existent.", "High speed impulsivity detected."]).map((factor, idx) => (
                                                    <div key={idx} className="flex items-start">
                                                        <div className="w-1 h-4 bg-gray-300 rounded-full mr-3 mt-1 flex-shrink-0" />
                                                        {renderHealthFactor(factor)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                            <div className="flex items-center text-xs font-bold text-gray-400">
                                                <span className="uppercase tracking-widest mr-2 text-gray-300">Action:</span>
                                                {p.recommended_action}
                                            </div>
                                            <button 
                                                onClick={() => p.noteId && onNavigateToNote(p.noteId)} 
                                                className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-200 text-xs font-black uppercase tracking-widest flex items-center transition-all hover:scale-105 active:scale-95"
                                            >
                                                Start Revision Quiz <ArrowRight className="w-4 h-4 ml-2" />
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-gray-200 rounded-[40px] opacity-40">
                                        <CheckCircle2 className="w-12 h-12 mb-4 text-green-500" />
                                        <p className="text-xs font-black uppercase tracking-widest">All knowledge is currently stable.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-40">
                            <div className="opacity-30 flex flex-col items-center">
                                <RefreshCw className="w-12 h-12 mb-4 animate-spin-slow" />
                                <p className="text-xs font-black uppercase tracking-[0.3em] mb-6">Neural Bridge Ready</p>
                            </div>
                            <button onClick={performAnalysis} className="px-10 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl z-10">Initiate Forensic Audit</button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-full flex gap-8 animate-fade-in overflow-hidden">
                    {/* Log Calendar Sidebar */}
                    <div className="w-80 flex-shrink-0 bg-white rounded-[40px] border border-gray-100 shadow-soft p-8 flex flex-col h-full overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                            <div className="flex space-x-2">
                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-400"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[9px] font-black text-gray-300 text-center uppercase">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendar()}
                        </div>
                        <div className="mt-10 pt-8 border-t border-gray-50 flex-shrink-0">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Daily Statistics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Signals</p>
                                    <p className="text-xl font-black text-gray-900">{notesByDate[getDayKey(selectedDate)]?.length || 0}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Integrity</p>
                                    <p className="text-xl font-black text-green-600">{optimisticScore}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Log Entries */}
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10">
                        {/* Heatmap Section */}
                        <div className="mb-6 bg-white rounded-[40px] p-6 shadow-soft border border-gray-100">
                             <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Engagement Map</h3>
                                <span className="text-[10px] text-gray-300 font-bold uppercase">Last 7 Days</span>
                             </div>
                             <Heatmap 
                                data={derivedActivity} 
                                theme={theme} 
                                onDayClick={(date) => setSelectedDate(date)} // Sync heatmap click to date selection
                             />
                        </div>

                        <div className="flex items-center justify-between mb-6 px-4">
                            <h3 className="text-lg font-black text-gray-900">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">{notesByDate[getDayKey(selectedDate)]?.length || 0} Neural Entries</span>
                        </div>
                        
                        {(notesByDate[getDayKey(selectedDate)] || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                <Sparkles className="w-12 h-12 mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest text-center leading-relaxed">Neural stems missing for this date.<br/>Capture more signals in Triage.</p>
                            </div>
                        ) : (
                            (notesByDate[getDayKey(selectedDate)] || []).map(note => (
                                <div key={note.id} className="bg-white rounded-[32px] p-8 shadow-soft border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center space-x-3">
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-gray-900 text-white uppercase tracking-widest">{note.platform}</span>
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <button onClick={() => onNavigateToNote(note.id)} className="p-2 text-gray-300 hover:text-gray-900 transition-colors"><ExternalLink className="w-5 h-5" /></button>
                                    </div>
                                    <h4 className="text-xl font-black text-gray-900 mb-4 leading-tight">{note.title}</h4>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {note.tags?.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase"><Hash className="w-3 h-3 mr-1 inline opacity-50" />{tag.replace('#', '')}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center space-x-8 pt-6 border-t border-gray-50">
                                        <div className="flex items-center space-x-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recollection Stable</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Activity className="w-4 h-4 text-blue-400" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{note.reviewCount} Engagements</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
