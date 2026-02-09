
import { useState, useEffect, useRef } from 'react';
import { CanvasNode } from '../types';
import { GoogleGenAI } from "@google/genai";

// --- HELPER 1: Visual Matcher (Fallback) ---
const getImageForKeyword = (text: string) => {
  const t = text.toLowerCase();
  if (t.includes('pink') && (t.includes('dog') || t.includes('dress') || t.includes('puppy'))) {
    return "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1000&auto=format&fit=crop"; 
  }
  if (t.includes('dog') || t.includes('puppy')) return "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=1000";
  if (t.includes('cat') || t.includes('kitten')) return "https://images.unsplash.com/photo-1529778873920-4da4926a7071?q=80&w=1000";
  if (t.includes('food') || t.includes('restaurant') || t.includes('dinner')) return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000";
  if (t.includes('tech') || t.includes('robot') || t.includes('ai')) return "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1000";
  if (t.includes('design') || t.includes('concept') || t.includes('map') || t.includes('architecture')) return "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000";
  return "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000";
};

// --- REAL AI GENERATION ---
const generateAIImage = async (prompt: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Strict usage of 'gemini-2.5-flash-image' (Nano Banana) as requested
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
              {
                parts: [{ text: prompt }] 
              }
            ],
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });
        
        // Iterate to find the image part in the candidates
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part && part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        console.warn("Gemini Image Gen: No image data found in response.");
    } catch (e: any) {
        console.error("Gemini Image Gen Failed:", e.message);
    }
    // Fallback if AI fails
    return getImageForKeyword(prompt);
};

interface UseNeuralDumpProps {
  onComplete: (nodes: CanvasNode[]) => void;
}

export const useNeuralDump = ({ onComplete }: UseNeuralDumpProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState(""); 
  
  const lastSpacePressRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef(""); 

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; 

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
             setTranscript(prev => {
                 const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
                 return prev + spacer + finalTranscript;
             });
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              console.warn("Speech recognition access denied or not available.");
              setIsListening(false);
          } else if (event.error === 'aborted') {
              // Ignore aborted errors as they happen during cleanup or manual stop
              return; 
          } else if (event.error !== 'no-speech') {
              console.error("Speech recognition error", event.error);
          }
        };

        recognition.onend = () => {
            // Automatically restart if supposed to be listening (handle intermittent drops)
            // But if stopped manually, isListening will be false
            if (isListening) {
                try { recognition.start(); } catch (e) { /* ignore */ }
            }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [isListening]); 

  useEffect(() => {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      if (isListening) {
          try { recognition.start(); } catch (e) { /* Already started */ }
      } else {
          try { recognition.stop(); } catch (e) { /* Already stopped */ }
      }
  }, [isListening]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const now = Date.now();
        const timeSinceLast = now - lastSpacePressRef.current;
        
        // Double tap detection (50ms - 300ms window)
        if (timeSinceLast < 300 && timeSinceLast > 50) {
           e.preventDefault(); // Prevent the second space from being typed
           e.stopPropagation();
           
           // Toggle UI visibility
           setIsInputOpen(prev => {
               const newState = !prev;
               // If closing the UI, also stop listening if active
               if (!newState) setIsListening(false);
               return newState;
           });
           lastSpacePressRef.current = 0; // Reset timer
        } else {
           lastSpacePressRef.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const processStaging = async (textToProcess?: string | any, contextItems?: any[]) => {
      // Robust check: If textToProcess is an Event object or not a string, use ref
      const validInput = typeof textToProcess === 'string' ? textToProcess : undefined;
      const finalTranscript = validInput || transcriptRef.current;
      
      if (!finalTranscript || typeof finalTranscript !== 'string' || !finalTranscript.trim()) return;
      
      setIsListening(false);
      setIsProcessing(true);

      const { processNeuralDump } = await import('../services/geminiService');
      const generatedNodes = await processNeuralDump(finalTranscript, contextItems);
      
      // Process nodes to attach images if requested
      const positionedNodes = await Promise.all(generatedNodes.map(async (n: any) => {
          let imageUrl = n.imageUrl;
          if (n.imagePrompt) {
              imageUrl = await generateAIImage(n.imagePrompt);
          }
          return {
              ...n,
              id: n.id || `gen-${Date.now()}-${Math.random()}`,
              x: 0,
              y: 0,
              width: 300,
              type: n.type || (imageUrl ? 'note' : 'note'), // Allow text+image note
              source: 'neural_dump',
              imageUrl: imageUrl,
              question: finalTranscript // Attach user question to the node
          };
      }));

      // If AI returned nothing (e.g. error), fallback to image gen for fun if short text
      if (positionedNodes.length === 0 && finalTranscript.length < 50) {
           const imageUrl = await generateAIImage(finalTranscript);
           positionedNodes.push({
             id: `img-${Date.now()}`,
             type: 'image',
             source: 'neural_dump',
             title: `Visual: ${finalTranscript.substring(0, 15)}...`,
             imageUrl: imageUrl, 
             content: finalTranscript,
             question: finalTranscript,
             x: 0, y: 0, width: 300
           });
      }

      onComplete(positionedNodes as CanvasNode[]);
      setTranscript(""); 
      setIsProcessing(false);
      setIsInputOpen(false); // Close UI on complete
  };

  return {
    isListening,
    setIsListening,
    isInputOpen,
    setIsInputOpen,
    isProcessing,
    transcript,
    setTranscript, 
    triggerProcessing: (text?: string, context?: any[]) => processStaging(text, context)
  };
};
