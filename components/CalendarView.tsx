
import React, { useState, useMemo, useEffect } from 'react';
import { Note, AppTheme } from '../types';
import { THEME_ACCENTS } from '../constants';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ExternalLink, Hash, Clock } from 'lucide-react';

interface CalendarViewProps {
  library: Note[];
  theme: AppTheme;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ library, theme, selectedDate, onDateSelect }) => {
  // State for the Month currently being VIEWED (not necessarily selected)
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  // Sync viewDate if selectedDate changes (e.g. set from Profile view)
  useEffect(() => {
    setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  // Helper: Get YYYY-MM-DD from a date object
  const getDayKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // 1. Organize Library data by date key
  const notesByDate = useMemo(() => {
    const map: Record<string, Note[]> = {};
    library.forEach(note => {
      const date = new Date(note.createdAt);
      const key = getDayKey(date);
      if (!map[key]) map[key] = [];
      map[key].push(note);
    });
    return map;
  }, [library]);

  // 2. Generate Calendar Grid
  const renderCalendarGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];
    
    // Empty cells for previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 md:h-14"></div>);
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateKey = getDayKey(date);
      const hasNotes = notesByDate[dateKey] && notesByDate[dateKey].length > 0;
      const isSelected = getDayKey(selectedDate) === dateKey;
      const isToday = getDayKey(new Date()) === dateKey;

      // Styling based on state
      let bgClass = "hover:bg-gray-50 bg-white";
      let textClass = "text-gray-700";
      
      if (isSelected) {
         // Use theme color for selection
         switch(theme) {
             case AppTheme.EMBER: bgClass = "bg-red-600 text-white shadow-md transform scale-105"; break;
             case AppTheme.SERENITY: bgClass = "bg-green-600 text-white shadow-md transform scale-105"; break;
             case AppTheme.BREEZE: bgClass = "bg-sky-600 text-white shadow-md transform scale-105"; break;
             case AppTheme.LAVENDER: bgClass = "bg-purple-600 text-white shadow-md transform scale-105"; break;
             default: bgClass = "bg-gray-900 text-white shadow-md transform scale-105";
         }
         textClass = "text-white font-bold";
      } else if (isToday) {
          bgClass = "bg-blue-50 border border-blue-200";
          textClass = "text-blue-600 font-bold";
      }

      days.push(
        <button
          key={d}
          onClick={() => onDateSelect(date)}
          className={`
            relative h-10 md:h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200
            ${bgClass}
          `}
        >
          <span className={`text-xs md:text-sm ${textClass}`}>{d}</span>
          {hasNotes && !isSelected && (
            <span className="absolute bottom-1 md:bottom-2 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-gray-400"></span>
          )}
          {hasNotes && isSelected && (
             <span className="absolute bottom-1 md:bottom-2 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/50"></span>
          )}
        </button>
      );
    }

    return days;
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  // Get notes for the selected list view
  const selectedDateKey = getDayKey(selectedDate);
  const selectedNotes = notesByDate[selectedDateKey] || [];
  const accentClass = THEME_ACCENTS[theme];

  return (
    <div className="h-full flex flex-col pt-20 px-4 md:px-8 max-w-7xl mx-auto w-full pb-24 md:pb-0 overflow-y-auto">
      
      <div className="flex items-center space-x-3 mb-6 animate-fade-in flex-shrink-0">
         <div className="p-3 bg-white rounded-2xl shadow-soft">
            <CalendarIcon className="w-6 h-6 text-gray-900" />
         </div>
         <div>
             <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
             <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                Review your journey
             </p>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 h-auto lg:h-full lg:overflow-hidden">
        
        {/* Calendar Widget */}
        <div className="lg:w-96 flex-shrink-0 bg-white rounded-3xl shadow-soft border border-gray-100 p-6 h-fit animate-slide-up">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-900">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-900">
                    {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-900">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['S','M','T','W','T','F','S'].map((day, i) => (
                    <div key={i} className="text-[10px] font-bold text-gray-400 uppercase">{day}</div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {renderCalendarGrid()}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-50">
                 <div className="flex justify-between items-center text-xs text-gray-400">
                     <span>Activity</span>
                     <div className="flex items-center space-x-2">
                         <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-gray-400 mr-1"></span> Saved</span>
                         <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span> Today</span>
                     </div>
                 </div>
            </div>
        </div>

        {/* Selected Date Content */}
        <div className="flex-1 flex flex-col h-full min-h-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                Entries for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                <span className="ml-3 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-500">
                    {selectedNotes.length}
                </span>
            </h3>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-20 lg:pb-0 space-y-4">
                {selectedNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-100 rounded-3xl opacity-60">
                         <Clock className="w-10 h-10 text-gray-300 mb-2" />
                         <p className="text-gray-400 font-medium">No knowledge captured on this day.</p>
                    </div>
                ) : (
                    selectedNotes.map(note => (
                        <div key={note.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                             <div className="flex justify-between items-start mb-2">
                                 <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-gray-50 text-gray-500 uppercase tracking-wider">
                                    {note.platform}
                                 </span>
                                 <span className="text-xs text-gray-300 font-mono">
                                     {new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                 </span>
                             </div>
                             
                             <h4 className="font-bold text-lg text-gray-900 mb-2">{note.title}</h4>
                             
                             <div className="text-sm text-gray-500 line-clamp-2 mb-4">
                                 {(note.summary || []).join(' ')}
                             </div>

                             <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                 <div className="flex gap-2">
                                     {note.tags && note.tags.slice(0, 3).map(tag => (
                                         <span key={tag} className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded-md flex items-center">
                                            <Hash className="w-2 h-2 mr-0.5" />{tag.replace('#', '')}
                                         </span>
                                     ))}
                                 </div>
                                 <a 
                                    href={note.sourceUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-gray-300 hover:text-gray-900 transition"
                                 >
                                     <ExternalLink className="w-4 h-4" />
                                 </a>
                             </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
};
