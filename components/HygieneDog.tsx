import React, { useEffect, useState } from 'react';

interface HygieneDogProps {
  itemCount: number;
  size?: 'sm' | 'md' | 'lg';
}

export const HygieneDog: React.FC<HygieneDogProps> = ({ itemCount, size = 'md' }) => {
  const [isHappy, setIsHappy] = useState(itemCount === 0);

  useEffect(() => {
    setIsHappy(itemCount === 0);
  }, [itemCount]);

  const pxSize = size === 'lg' ? 180 : size === 'md' ? 120 : 40;
  
  // Dirt logic: Caps at 5 items for max dirtiness
  const dirtCount = Math.min(itemCount, 5);
  
  // Specific dirt patches visibility
  const showDirt1 = itemCount > 0;
  const showDirt2 = itemCount > 1;
  const showDirt3 = itemCount > 2;
  const showDirt4 = itemCount > 3;
  const showDirt5 = itemCount > 4;

  return (
    <div className="relative flex flex-col items-center justify-center transition-all duration-500 group">
      
      <svg 
        width={pxSize} 
        height={pxSize} 
        viewBox="0 0 200 200" 
        className={`transition-transform duration-500`}
        style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }}
      >
        {/* Tail */}
        <g transform="translate(140, 120)">
           <path 
             d="M0 0 Q 30 -10 30 -30" 
             stroke="#d1d5db" 
             strokeWidth="12" 
             fill="none" 
             strokeLinecap="round"
             className=""
           />
        </g>

        {/* Body Base */}
        <ellipse cx="100" cy="130" rx="55" ry="45" fill="#f3f4f6" />
        
        {/* Legs */}
        <path d="M70 160 L70 180" stroke="#f3f4f6" strokeWidth="14" strokeLinecap="round" />
        <path d="M130 160 L130 180" stroke="#f3f4f6" strokeWidth="14" strokeLinecap="round" />
        
        {/* Head Group */}
        <g className="">
            {/* Ears */}
            <path d="M60 60 Q 40 20 80 40" fill="#9ca3af" />
            <path d="M140 60 Q 160 20 120 40" fill="#9ca3af" />
            
            {/* Face */}
            <circle cx="100" cy="80" r="45" fill="#ffffff" />
            
            {/* Eyes */}
            {isHappy ? (
                <>
                    <circle cx="85" cy="75" r="4" fill="#1f2937" />
                    <circle cx="115" cy="75" r="4" fill="#1f2937" />
                </>
            ) : (
                <>
                    {/* Sad Eyes */}
                    <circle cx="85" cy="75" r="3" fill="#374151" />
                    <circle cx="115" cy="75" r="3" fill="#374151" />
                    <path d="M80 65 Q 85 62 90 65" stroke="#374151" strokeWidth="1.5" fill="none" />
                    <path d="M110 65 Q 115 62 120 65" stroke="#374151" strokeWidth="1.5" fill="none" />
                </>
            )}

            {/* Snout */}
            <ellipse cx="100" cy="95" rx="14" ry="10" fill="#e5e7eb" />
            <circle cx="100" cy="92" r="5" fill="#111827" />
            
            {/* Mouth */}
            {isHappy ? (
                <path d="M92 100 Q 100 108 108 100" stroke="#111827" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
                <path d="M95 102 Q 100 100 105 102" stroke="#111827" strokeWidth="2" fill="none" strokeLinecap="round" />
            )}
            
            {/* Tongue if happy */}
            {isHappy && (
               <path d="M96 102 Q 100 115 104 102" fill="#f87171" />
            )}
        </g>

        {/* MUD / DIRT - The more items, the more mud */}
        {showDirt1 && <path d="M65 80 Q 55 90 70 100 Q 80 95 75 85" fill="#78350f" opacity="0.6" />}
        {showDirt2 && <path d="M125 70 Q 140 65 135 80 Q 120 85 125 70" fill="#78350f" opacity="0.7" />}
        {showDirt3 && <path d="M90 130 Q 80 150 100 145 Q 110 135 90 130" fill="#78350f" opacity="0.5" />}
        {showDirt4 && <circle cx="100" cy="60" r="8" fill="#78350f" opacity="0.6" />}
        {showDirt5 && <path d="M110 110 Q 120 120 130 110" fill="#78350f" opacity="0.6" />}
        
        {/* Sparkles if Clean */}
        {isHappy && (
            <g className="">
                <path d="M160 50 L163 55 L168 57 L163 59 L160 64 L157 59 L152 57 L157 55 Z" fill="#fbbf24" />
                <path d="M40 110 L42 115 L47 117 L42 119 L40 124 L38 119 L33 117 L38 115 Z" fill="#fbbf24" />
            </g>
        )}
      </svg>
      
      {/* Tooltip / Status Text */}
      {size !== 'sm' && (
          <div className="mt-6 text-center animate-slide-up">
            <div className={`font-bold text-lg mb-1 ${isHappy ? 'text-green-600' : 'text-amber-800'}`}>
                {isHappy ? "Sparky is Squeaky Clean!" : "Sparky needs a bath!"}
            </div>
            {!isHappy && (
                <p className="text-xs text-amber-600/70 font-medium bg-amber-50 px-3 py-1 rounded-full">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'} = {dirtCount} {dirtCount === 1 ? 'spot' : 'spots'} of mud
                </p>
            )}
          </div>
      )}
    </div>
  );
};