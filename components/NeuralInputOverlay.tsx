
import React, { useEffect, useState } from 'react';
import { NeuralStagedItem } from '../types';
import { Mic, Link, FileText, BrainCircuit, Image as ImageIcon, Zap } from 'lucide-react';

interface NeuralInputOverlayProps {
  isActive: boolean;
  isProcessing: boolean;
  stagedItems: NeuralStagedItem[];
  transcript?: string;
}

export const NeuralInputOverlay: React.FC<NeuralInputOverlayProps> = ({ 
  isActive, 
  isProcessing, 
  stagedItems,
  transcript 
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isActive || isProcessing) {
        setShouldRender(true);
        // Request animation frame to ensure mount before class transition
        requestAnimationFrame(() => setAnimateIn(true));
    } else {
        setAnimateIn(false);
        const timer = setTimeout(() => setShouldRender(false), 500); // Wait for exit transition
        return () => clearTimeout(timer);
    }
  }, [isActive, isProcessing]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-end pb-12">
        
        {/* Staged Items - Floating Above Bar */}
        <div className={`flex gap-3 mb-6 transition-all duration-500 ease-out ${stagedItems.length > 0 && animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {stagedItems.map((item) => (
                <div 
                    key={item.id}
                    className="w-20 h-20 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center relative animate-scale-in"
                >
                    {item.type === 'image' ? (
                        <img src={item.content} className="w-full h-full object-cover opacity-90" alt="staged" />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center">
                            {item.type === 'link' ? <Link className="w-6 h-6 text-blue-400 mb-1" /> : <FileText className="w-6 h-6 text-gray-400 mb-1" />}
                            <span className="text-[8px] text-zinc-400 font-bold truncate w-full max-w-[60px]">{item.meta}</span>
                        </div>
                    )}
                    {/* Badge */}
                    <div className="absolute top-1 right-1 w-2 h-2 bg-[#00FF41] rounded-full shadow-[0_0_8px_#00FF41]" />
                </div>
            ))}
        </div>

        {/* Ambient Input Bar (Dynamic Island style) */}
        <div 
            className={`
                bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) relative
                ${isActive ? 'w-[420px] h-20 rounded-[2.5rem]' : isProcessing ? 'w-[300px] h-16 rounded-full' : 'w-16 h-16 rounded-full opacity-0 scale-50'}
            `}
        >
            {/* Listening State */}
            <div className={`absolute inset-0 flex items-center justify-center space-x-4 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative">
                    <div className="absolute inset-0 bg-[#00FF41] blur-md opacity-40 animate-pulse" />
                    <Mic className="w-6 h-6 text-[#00FF41] relative z-10" />
                </div>
                
                <span className="font-mono text-sm font-bold text-white tracking-[0.2em]">LISTENING</span>
                
                {/* Waveform Visualization */}
                <div className="flex items-center gap-1 h-6">
                    {[...Array(5)].map((_, i) => (
                        <div 
                            key={i} 
                            className="w-1 bg-[#00FF41] rounded-full animate-wave"
                            style={{ 
                                height: '100%', 
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '0.8s' 
                            }} 
                        />
                    ))}
                </div>
            </div>

            {/* Processing State */}
            <div className={`absolute inset-0 flex items-center justify-center space-x-3 transition-opacity duration-300 ${!isActive && isProcessing ? 'opacity-100' : 'opacity-0'}`}>
                <BrainCircuit className="w-5 h-5 text-blue-400 animate-spin-slow" />
                <span className="font-mono text-xs font-bold text-blue-400 tracking-[0.15em] animate-pulse">SYNTHESIZING...</span>
            </div>
        </div>

        {/* Hints */}
        {isActive && (
            <div className="mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest animate-fade-in">
                Release Space to Process
            </div>
        )}

    </div>
  );
};
