
import React, { useState } from 'react';
import { ArrowRight, Zap, Brain, Sparkles, X, Terminal, Cpu, Layers, Activity, Mic, Binary, ShieldCheck, FlaskConical, Radio, Database, Search } from 'lucide-react';

interface WelcomeScreenProps {
  onEnter: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
  const [showWhitepaper, setShowWhitepaper] = useState(false);

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-fade-in selection:bg-black selection:text-white font-sans">
      <div className="max-w-md w-full text-center flex flex-col items-center z-10">
        
        {/* Floating Abstract Element */}
        <div className="mb-12 relative">
            <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-20 rounded-full animate-pulse-slow"></div>
            <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center shadow-2xl rotate-6 hover:rotate-12 transition-transform duration-700 ease-out cursor-default relative z-10">
                <Zap className="w-10 h-10 text-white fill-current" />
            </div>
            {/* Decorative elements */}
            <div className="absolute -right-8 -top-8 text-gray-200 animate-float" style={{ animationDelay: '1s' }}><Sparkles className="w-8 h-8" /></div>
            <div className="absolute -left-12 bottom-0 text-gray-200 animate-float" style={{ animationDelay: '2s' }}><Brain className="w-10 h-10" /></div>
        </div>

        {/* Typography */}
        <div className="space-y-4 mb-12">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-gray-900 leading-none">
            Kno.
            </h1>
            <div className="flex flex-col items-center space-y-2">
              <p className="text-2xl md:text-3xl font-bold text-gray-400 tracking-tight">
                From Feed to Knowledge.
              </p>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest mt-2 animate-pulse">
                <Sparkles className="w-3 h-3 mr-1.5" /> Powered by Gemini 3
              </div>
            </div>
        </div>

        {/* Product Description */}
        <div className="space-y-6 mb-16 max-w-xs mx-auto">
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
            A minimalist AI engine for your mind. <br/>
            Capture chaotic signals, distill wisdom, and internalize what matters.
            </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center space-y-4">
            <button 
                onClick={onEnter}
                className="group relative inline-flex items-center justify-center px-12 py-5 bg-black text-white rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-2xl overflow-hidden"
            >
                <span className="relative z-10 flex items-center">
                    Open Workspace <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gray-800 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </button>

            <button 
                onClick={() => setShowWhitepaper(true)}
                className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors py-2"
            >
                View Technical Whitepaper
            </button>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-10 left-0 right-0 text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Kno Product White &bull; v1.0</p>
      </div>

      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      {/* Technical Whitepaper Modal */}
      {showWhitepaper && (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-fade-in overflow-hidden">
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                  <div className="flex items-center space-x-3">
                      <Terminal className="w-5 h-5 text-gray-900" />
                      <span className="font-black text-xs uppercase tracking-[0.3em] text-gray-900">Technical Specifications</span>
                  </div>
                  <button onClick={() => setShowWhitepaper(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <X className="w-6 h-6 text-gray-400" />
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-20 selection:bg-blue-100 selection:text-blue-900">
                  <div className="max-w-4xl mx-auto space-y-24 pb-32">
                      
                      {/* Section 1: Architecture Overview */}
                      <section className="space-y-12">
                          <div className="space-y-2">
                              <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em]">Section 01</span>
                              <h2 className="text-4xl font-black text-gray-900 tracking-tight">The Neural Pipeline Architecture</h2>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-8 rounded-[32px] bg-gray-50 border border-gray-100 space-y-6">
                                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                      <Activity className="w-6 h-6" />
                                  </div>
                                  <div className="space-y-2">
                                      <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">System 1: Rapid Ingestion</h3>
                                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Engine: Gemini 3 Flash</p>
                                      <p className="text-sm text-gray-600 leading-relaxed">
                                          Handles the heavy lifting of OCR, semantic distillation, and high-velocity signals from URLs and PDFs with incredible speed and low latency.
                                      </p>
                                  </div>
                              </div>

                              <div className="p-8 rounded-[32px] bg-gray-900 border border-gray-800 space-y-6 text-white">
                                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
                                      <ShieldCheck className="w-6 h-6" />
                                  </div>
                                  <div className="space-y-2">
                                      <h3 className="font-black text-sm uppercase tracking-widest text-white">System 2: Logic Guard</h3>
                                      <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">Engine: Gemini 3 Pro + Thinking Config</p>
                                      <p className="text-sm text-gray-400 leading-relaxed">
                                          Forces adversarial reasoning to "double-check" the logical integrity of captured content before it enters the permanent knowledge graph.
                                      </p>
                                  </div>
                              </div>

                              <div className="p-8 rounded-[32px] bg-gray-50 border border-gray-100 space-y-6">
                                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                                      <FlaskConical className="w-6 h-6" />
                                  </div>
                                  <div className="space-y-2">
                                      <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Spatial Synthesis</h3>
                                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Engine: Gemini 3 Pro (Collider)</p>
                                      <p className="text-sm text-gray-600 leading-relaxed">
                                          Analyzes semantic distance between disparate nodes on a D3 canvas to generate "Serendipity Sparks" and fusions.
                                      </p>
                                  </div>
                              </div>

                              <div className="p-8 rounded-[32px] bg-blue-600 border border-blue-500 space-y-6 text-white">
                                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                                      <Radio className="w-6 h-6" />
                                  </div>
                                  <div className="space-y-2">
                                      <h3 className="font-black text-sm uppercase tracking-widest text-white">Real-Time Neural Dump</h3>
                                      <p className="text-xs text-white/70 font-bold uppercase tracking-widest">Engine: Gemini Flash Audio (Live API)</p>
                                      <p className="text-sm text-white/90 leading-relaxed">
                                          "God Mode" input processing simultaneous voice streams and image frames for zero-friction cognitive offloading.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </section>

                      {/* Section 2: How we built it */}
                      <section className="space-y-12">
                          <div className="space-y-2">
                              <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em]">Section 02</span>
                              <h2 className="text-4xl font-black text-gray-900 tracking-tight">How we built Kno: Technical Deep Dive</h2>
                          </div>

                          <div className="space-y-16">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                                  <div className="md:col-span-1">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">The Challenge</h4>
                                  </div>
                                  <div className="md:col-span-2">
                                      <p className="text-lg text-gray-700 leading-relaxed font-medium">
                                          Modern productivity tools are often just <span className="text-black italic">"graveyards for links."</span> We built Kno to move beyond storage and into internalization. We leveraged the Gemini 3 ecosystem to create a feedback loop between capture, critique, and synthesis.
                                      </p>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                                  <div className="md:col-span-1">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">Hybrid Reasoning</h4>
                                  </div>
                                  <div className="md:col-span-2">
                                      <p className="text-lg text-gray-700 leading-relaxed font-medium">
                                          Inspired by Kahneman's <span className="text-black font-bold">"Thinking, Fast and Slow,"</span> we implemented a dual-model logic strategy. <span className="text-black font-bold">System 1 (Perception)</span> uses Gemini Flash for speed. <span className="text-black font-bold">System 2 (Reasoning)</span> utilizes Gemini 3 Pro with the <span className="text-blue-600 font-bold">Thinking Config</span> to perform deep audits.
                                      </p>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                                  <div className="md:col-span-1">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">Knowledge Physics</h4>
                                  </div>
                                  <div className="md:col-span-2">
                                      <p className="text-lg text-gray-700 leading-relaxed font-medium">
                                          Unlike traditional linear note-takers, Kno uses a spatial canvas powered by D3. We used Gemini 3 Pro to power our <span className="text-purple-600 font-bold">"Collider" engine</span>. It analyzes semantic vectors to find non-obvious connections between disparate knowledge clusters.
                                      </p>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                                  <div className="md:col-span-1">
                                      <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">Live Multimodal</h4>
                                  </div>
                                  <div className="md:col-span-2">
                                      <p className="text-lg text-gray-700 leading-relaxed font-medium">
                                          We integrated the <span className="text-black font-bold">Gemini Live API</span> to create the Neural Dump. By streaming raw PCM audio and image frames directly to the model, users can speak chaotic thoughts while pasting screenshots—instantly populating the canvas with actionable assets.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </section>

                      {/* Conclusion */}
                      <section className="pt-20 border-t border-gray-100 text-center space-y-6">
                          <p className="text-gray-400 text-sm font-medium italic">
                              Kno is more than a tool; it's a cognitive partner. By combining high-speed distillation with deep, reasoned auditing, we’ve built the first knowledge engine that doesn't just store what you read—it helps you <span className="text-black font-bold">Kno</span> it.
                          </p>
                          <div className="flex justify-center space-x-8 pt-8 opacity-40 grayscale">
                              <Binary className="w-8 h-8" />
                              <Cpu className="w-8 h-8" />
                              <Layers className="w-8 h-8" />
                          </div>
                      </section>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
