import React, { useState, useEffect, useRef } from 'react';
import { InboxItem, Note, ViewState, AppTheme, ProcessingOptions, DailyActivity, QuizDifficulty, QuizFeedbackType, AgentAction, QuizAttempt as IQuizAttempt, RetentionSummary, CanvasDocument, CanvasState, QuizAttempt, Platform, CanvasNode, SparkInsight, CanvasEdge } from './types';
import { Library } from './components/Library';
import { LearningCanvas } from './components/LearningCanvas';
import { MemoryLab } from './components/MemoryLab';
import { KAiOrb } from './components/KAiOrb';
import { WelcomeScreen } from './components/WelcomeScreen';
import { processUrlContent, detectPlatform } from './services/geminiService';
import { saveToStorage, loadFromStorage } from './services/storage';
import { THEME_CLASSES, THEME_ACCENTS } from './constants';
import { useNeuralDump } from './hooks/useNeuralDump';
import { X } from 'lucide-react';

// --- MOCK ASSET GENERATOR ---
const svgToDataUri = (svgString: string) => {
    try {
        const encoded = encodeURIComponent(svgString).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            });
        return `data:image/svg+xml;base64,${btoa(encoded)}`;
    } catch (e) {
        console.error("SVG Encoding Failed", e);
        return "";
    }
};

const MOCK_ASSETS = {
  GIT: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" style="background-color:#ffffff;" width="1200" height="900">
      <style>
        .hand { font-family: "Comic Sans MS", "Chalkboard SE", sans-serif; fill: #333; }
        .box { fill: none; stroke: #333; stroke-width: 2; }
        .cmd { font-family: monospace; font-size: 14px; fill: #444; }
        .pink-t { fill: #e91e63; font-weight: bold; }
        .blue-t { fill: #2196f3; font-weight: bold; }
        .red-t { fill: #f44336; font-weight: bold; }
        .green-t { fill: #4caf50; font-weight: bold; }
      </style>
      <text x="600" y="50" text-anchor="middle" font-size="48" class="hand">git cheat sheet</text>
      <text x="600" y="80" text-anchor="middle" font-size="16" class="hand">Julia Evans - https://wizardzines.com</text>
      <g transform="translate(50, 100)">
        <rect width="250" height="150" class="box"/>
        <text x="20" y="30" class="hand red-t" font-size="20">getting started</text>
        <text x="20" y="60" class="hand">start a new repo:</text>
        <text x="20" y="80" class="cmd">git init</text>
        <text x="20" y="110" class="hand">clone existing repo:</text>
        <text x="20" y="130" class="cmd">git clone $URL</text>
      </g>
    </svg>
  `),
  CALCULUS: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" style="background-color:#fffef0;" width="800" height="1000">
      <style>
        .box { fill: none; stroke: #000; stroke-width: 2; }
        .text { font-family: "Comic Sans MS", "Chalkboard SE", sans-serif; fill: #000; }
        .math { font-family: "Times New Roman", serif; font-style: italic; font-weight: bold; }
      </style>
      <rect x="20" y="20" width="300" height="120" class="box"/>
      <text x="30" y="45" class="text" font-weight="bold" font-size="18" text-decoration="underline">ABSOLUTE VALUES</text>
      <text x="30" y="80" class="math" font-size="20">|x| = </text>
      <text x="80" y="70" class="math" font-size="18">{ x  if x ≥ 0</text>
      <text x="80" y="100" class="math" font-size="18">  -x if x < 0</text>
      <rect x="340" y="20" width="440" height="120" class="box"/>
      <text x="350" y="45" class="text" font-weight="bold" font-size="18">FACTORING SPECIAL POLYNOMIALS</text>
      <text x="350" y="75" class="math" font-size="18">A² - B² = (A+B)(A-B)</text>
      <text x="350" y="105" class="math" font-size="18">A³ - B³ = (A-B)(A²+AB+B²)</text>
      <rect x="20" y="160" width="760" height="100" class="box"/>
      <text x="30" y="185" class="text" font-weight="bold" font-size="18" text-decoration="underline">Limits at ∞</text>
      <text x="30" y="220" class="math" font-size="18">lim (x→∞) f(x) = lim (x→0+) F(1/x)</text>
      <text x="350" y="220" class="text" font-size="16">DIVIDE EACH TERM BY THE HIGHEST POWER OF X</text>
      <rect x="20" y="280" width="360" height="250" class="box"/>
      <text x="30" y="305" class="text" font-weight="bold" font-size="18" text-decoration="underline">LIMIT LAWS</text>
      <text x="30" y="340" class="math" font-size="16">1. lim [f(x) + g(x)] = lim f(x) + lim g(x)</text>
      <text x="30" y="380" class="math" font-size="16">2. lim [f(x) - g(x)] = lim f(x) - lim g(x)</text>
      <text x="30" y="420" class="math" font-size="16">3. lim [c f(x)] = c lim f(x)</text>
      <text x="30" y="460" class="math" font-size="16">4. lim [f(x)g(x)] = lim f(x) • lim g(x)</text>
      <rect x="400" y="280" width="380" height="250" class="box"/>
      <text x="410" y="305" class="text" font-weight="bold" font-size="18">ε - δ Notation</text>
      <text x="410" y="340" class="text" font-size="14">lim f(x)=L  for any ε>0 we can find δ>0</text>
      <text x="410" y="360" class="text" font-size="14">such that whenever 0 < |x-a| < δ</text>
      <text x="410" y="380" class="text" font-size="14">then |f(x) - L| < ε</text>
      <line x1="450" y1="500" x2="650" y2="500" stroke="black" stroke-width="2"/>
      <line x1="450" y1="500" x2="450" y2="400" stroke="black" stroke-width="2"/>
      <line x1="450" y1="500" x2="600" y2="420" stroke="black" stroke-width="2"/>
      <text x="660" y="505" class="math">x</text> <text x="440" y="390" class="math">y</text>
      <rect x="20" y="550" width="760" height="80" class="box"/>
      <text x="30" y="575" class="text" font-weight="bold" font-size="18">DERIVATIVE BY DEFINITION</text>
      <text x="30" y="610" class="math" font-size="20">f'(x) = lim(h→0) [f(x+h) - f(x)] / h</text>
      <rect x="20" y="650" width="400" height="200" class="box"/>
      <text x="30" y="675" class="text" font-weight="bold" font-size="18">SQUEEZE THEOREM</text>
      <path d="M50 780 Q 150 720 350 780" fill="none" stroke="black"/>
      <path d="M50 820 Q 150 720 350 820" fill="none" stroke="black"/>
      <path d="M50 800 Q 150 750 350 800" fill="none" stroke="black" stroke-dasharray="5,5"/>
      <text x="360" y="780" class="math">h(x)</text>
      <text x="360" y="820" class="math">f(x)</text>
      <text x="200" y="750" class="math">g(x)</text>
      <rect x="440" y="650" width="340" height="120" class="box"/>
      <text x="450" y="675" class="text" font-weight="bold" font-size="18">QUADRATIC FORMULA</text>
      <text x="460" y="710" class="text" font-size="16">If ax² + bx + c = 0 Then</text>
      <text x="480" y="750" class="math" font-size="24">x = (-b ± √b²-4ac) / 2a</text>
    </svg>
  `),
  SWIFT: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" style="background-color:#292a30;" width="1000" height="700">
      <style>
        .code { font-family: "Menlo", "Monaco", monospace; font-size: 14px; }
        .kwd { fill: #ff7ab2; } /* Keywords pink */
        .type { fill: #66d9ef; } /* Types blue */
        .str { fill: #ff857f; } /* Strings orange-ish */
        .num { fill: #d19a66; } /* Numbers */
        .prop { fill: #a6e22e; } /* Properties green */
        .plain { fill: #f8f8f2; }
        .comment { fill: #75715e; }
        .line-num { fill: #666; text-anchor: end; }
      </style>
      <rect width="1000" height="40" fill="#3a3b41"/>
      <circle cx="20" cy="20" r="6" fill="#ff5f57"/>
      <circle cx="40" cy="20" r="6" fill="#febc2e"/>
      <circle cx="60" cy="20" r="6" fill="#28c840"/>
      <text x="500" y="25" text-anchor="middle" fill="#aaa" font-family="sans-serif" font-size="12">TicTacToeSwiftUI — ContentView.swift</text>
      <rect x="0" y="40" width="1000" height="1" fill="#222"/>
      <rect x="0" y="41" width="200" height="660" fill="#252526"/>
      <text x="20" y="70" fill="#ccc" font-family="sans-serif" font-size="12">▼ TicTacToeSwiftUI</text>
      <text x="40" y="95" fill="#ccc" font-family="sans-serif" font-size="12">▶ TicTacToeSwiftUIApp</text>
      <rect x="0" y="105" width="200" height="25" fill="#37373d"/>
      <text x="40" y="120" fill="#fff" font-family="sans-serif" font-size="12">swift ContentView</text>
      <text x="40" y="145" fill="#ccc" font-family="sans-serif" font-size="12">swift GameState</text>
      <text x="40" y="170" fill="#ccc" font-family="sans-serif" font-size="12">swift Cell</text>
      <text x="40" y="195" fill="#ccc" font-family="sans-serif" font-size="12">xcassets Assets</text>
      <g transform="translate(250, 70)">
        <text x="-20" y="0" class="code line-num">1</text>
        <text x="-20" y="20" class="code line-num">2</text>
        <text x="-20" y="40" class="code line-num">3</text>
        <text x="-20" y="60" class="code line-num">4</text>
        <text x="-20" y="80" class="code line-num">5</text>
        <text x="-20" y="100" class="code line-num">6</text>
        <text x="-20" y="120" class="code line-num">7</text>
        <text x="-20" y="140" class="code line-num">8</text>
        <text x="-20" y="160" class="code line-num">9</text>
        <text x="-20" y="180" class="code line-num">10</text>
        <text x="-20" y="200" class="code line-num">11</text>
        <text x="-20" y="220" class="code line-num">12</text>
        <text x="-20" y="240" class="code line-num">13</text>
        <text x="-20" y="260" class="code line-num">14</text>
        <text x="-20" y="280" class="code line-num">15</text>
        <text x="-20" y="300" class="code line-num">16</text>
        <text x="-20" y="320" class="code line-num">17</text>
        <text x="-20" y="340" class="code line-num">18</text>
        <text x="-20" y="360" class="code line-num">19</text>
        <text x="-20" y="380" class="code line-num">20</text>
        <text x="-20" y="400" class="code line-num">21</text>
        <text x="-20" y="420" class="code line-num">22</text>
        <text x="0" y="0" class="code"><tspan class="kwd">import</tspan> <tspan class="plain">SwiftUI</tspan></text>
        <text x="0" y="40" class="code"><tspan class="kwd">struct</tspan> <tspan class="plain">ContentView</tspan><tspan class="plain">: </tspan><tspan class="type">View</tspan> <tspan class="plain">{</tspan></text>
        <text x="20" y="60" class="code"><tspan class="prop">@StateObject</tspan> <tspan class="kwd">var</tspan> <tspan class="plain">gameState = </tspan><tspan class="type">GameState</tspan><tspan class="plain">()</tspan></text>
        <text x="20" y="100" class="code"><tspan class="kwd">var</tspan> <tspan class="plain">body: </tspan><tspan class="kwd">some</tspan> <tspan class="type">View</tspan> <tspan class="plain">{</tspan></text>
        <text x="40" y="120" class="code"><tspan class="kwd">let</tspan> <tspan class="plain">borderSize = </tspan><tspan class="type">CGFloat</tspan><tspan class="plain">(</tspan><tspan class="num">5</tspan><tspan class="plain">)</tspan></text>
        <text x="40" y="160" class="code"><tspan class="type">Text</tspan><tspan class="plain">(gameState.turnText())</tspan></text>
        <text x="60" y="180" class="code"><tspan class="plain">.font(.</tspan><tspan class="prop">title</tspan><tspan class="plain">)</tspan></text>
        <text x="60" y="200" class="code"><tspan class="plain">.bold()</tspan></text>
        <text x="60" y="220" class="code"><tspan class="plain">.padding()</tspan></text>
        <text x="40" y="240" class="code"><tspan class="type">Spacer</tspan><tspan class="plain">()</tspan></text>
        <text x="40" y="280" class="code"><tspan class="type">Text</tspan><tspan class="plain">(</tspan><tspan class="type">String</tspan><tspan class="plain">(format: </tspan><tspan class="str">"Crosses: %d"</tspan><tspan class="plain">, gameState.crossesScore))</tspan></text>
        <text x="60" y="300" class="code"><tspan class="plain">.font(.</tspan><tspan class="prop">title</tspan><tspan class="plain">)</tspan></text>
        <text x="40" y="340" class="code"><tspan class="type">VStack</tspan><tspan class="plain">(spacing: borderSize) {</tspan></text>
        <text x="60" y="360" class="code"><tspan class="type">ForEach</tspan><tspan class="plain">(</tspan><tspan class="num">0</tspan><tspan class="plain">...</tspan><tspan class="num">2</tspan><tspan class="plain">, id: \.</tspan><tspan class="kwd">self</tspan><tspan class="plain">) { row </tspan><tspan class="kwd">in</tspan></text>
        <text x="80" y="380" class="code"><tspan class="type">HStack</tspan><tspan class="plain">(spacing: borderSize) {</tspan></text>
        <text x="100" y="400" class="code"><tspan class="type">ForEach</tspan><tspan class="plain">(</tspan><tspan class="num">0</tspan><tspan class="plain">...</tspan><tspan class="num">2</tspan><tspan class="plain">, id: \.</tspan><tspan class="kwd">self</tspan><tspan class="plain">) { column in</tspan></text>
        <text x="120" y="420" class="code"><tspan class="kwd">let</tspan> <tspan class="plain">cell = gameState.board[row][column]</tspan></text>
        <text x="120" y="440" class="code"><tspan class="type">Text</tspan><tspan class="plain">(cell.displayTile())</tspan></text>
        <rect x="60" y="330" width="300" height="20" fill="#264f78" opacity="0.5"/>
        <rect x="360" y="330" width="2" height="20" fill="#fff"/>
      </g>
    </svg>
  `),
  JS_NOTES: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" style="background-color:#ffffff;" width="800" height="1000">
      <defs>
        <pattern id="lines" x="0" y="0" width="100" height="40" patternUnits="userSpaceOnUse">
          <line x1="0" y1="39" x2="100" y2="39" stroke="#b0b0ff" stroke-width="1.5" />
        </pattern>
      </defs>
      <rect width="800" height="1000" fill="url(#lines)" />
      <line x1="80" y1="0" x2="80" y2="1000" stroke="#ffcccc" stroke-width="2" />
      <line x1="84" y1="0" x2="84" y2="1000" stroke="#ffcccc" stroke-width="2" />
      <style>
        .hand { font-family: "Comic Sans MS", "Chalkboard SE", sans-serif; fill: #2c3e50; font-size: 22px; }
        .red-ink { fill: #c0392b; }
        .blue-ink { fill: #2980b9; }
      </style>
      <text x="40" y="60" class="hand red-ink" font-weight="bold">1.2</text>
      <text x="100" y="60" class="hand red-ink" font-weight="bold" text-decoration="underline">Purpose of JavaScript:</text>
      <circle cx="95" cy="120" r="2" fill="#2c3e50" />
      <text x="110" y="125" class="hand blue-ink">JavaScript's primary purpose is to enable</text>
      <text x="110" y="165" class="hand blue-ink">client-side scripting on web pages.</text>
      <text x="110" y="205" class="hand blue-ink">This means it allows developers to</text>
      <text x="110" y="245" class="hand blue-ink">manipulate the content and behavior</text>
      <text x="110" y="285" class="hand blue-ink">of web pages directly within the user's</text>
      <text x="110" y="325" class="hand blue-ink">web browser.</text>
      <circle cx="95" cy="380" r="2" fill="#2c3e50" />
      <text x="110" y="385" class="hand blue-ink">With JavaScript, we can dynamically</text>
      <text x="110" y="425" class="hand blue-ink">update web pages elements, validate</text>
      <text x="110" y="465" class="hand blue-ink">form inputs, and respond to user</text>
      <text x="110" y="505" class="hand blue-ink">interactions like clicks, mouse movements,</text>
      <text x="110" y="545" class="hand blue-ink">and keyboard input.</text>
      <circle cx="95" cy="600" r="2" fill="#2c3e50" />
      <text x="110" y="605" class="hand blue-ink">Additionally, JavaScript can interact</text>
      <text x="110" y="645" class="hand blue-ink">with web servers through AJAX</text>
      <text x="110" y="685" class="hand blue-ink">(Asynchronous JavaScript and XML)</text>
      <text x="110" y="725" class="hand blue-ink">to fetch data without requiring a</text>
      <text x="110" y="765" class="hand blue-ink">page reload.</text>
      <text x="250" y="805" class="hand" font-size="16" fill="#7f8c8d">Copyrighted by CodeWithCurious.com</text>
      <text x="40" y="865" class="hand red-ink" font-weight="bold">1.3</text>
      <text x="100" y="865" class="hand red-ink" font-weight="bold" text-decoration="underline">Setting up the development environment:</text>
      <text x="110" y="915" class="hand blue-ink">To start coding in JavaScript, we</text>
      <text x="110" y="955" class="hand blue-ink">need a development environment set</text>
      <text x="110" y="995" class="hand blue-ink">up.</text>
    </svg>
  `),
  NEURAL: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" style="background-color:#ffffff;" width="1000" height="600">
      <style>
        .label { font-family: sans-serif; font-size: 24px; font-weight: bold; fill: #000; text-anchor: middle; }
        .var-label { font-family: sans-serif; font-size: 18px; font-weight: bold; fill: #000; text-anchor: end; }
        .sub { font-family: sans-serif; font-size: 14px; fill: #333; text-anchor: middle; }
      </style>
      <text x="350" y="50" class="label">Input Layer</text>
      <text x="600" y="50" class="label">Hidden Layer</text>
      <text x="850" y="50" class="label">Output Layer</text>
      <g stroke="#666" stroke-width="1">
        <line x1="350" y1="150" x2="600" y2="200"/><line x1="350" y1="150" x2="600" y2="300"/><line x1="350" y1="150" x2="600" y2="400"/>
        <line x1="350" y1="250" x2="600" y2="200"/><line x1="350" y1="250" x2="600" y2="300"/><line x1="350" y1="250" x2="600" y2="400"/>
        <line x1="350" y1="350" x2="600" y2="200"/><line x1="350" y1="350" x2="600" y2="300"/><line x1="350" y1="350" x2="600" y2="400"/>
        <line x1="350" y1="450" x2="600" y2="200"/><line x1="350" y1="450" x2="600" y2="300"/><line x1="350" y1="450" x2="600" y2="400"/>
        <line x1="600" y1="200" x2="850" y2="300"/><line x1="600" y1="300" x2="850" y2="300"/><line x1="600" y1="400" x2="850" y2="300"/>
        <line x1="850" y1="300" x2="950" y2="300" marker-end="url(#arrow)"/>
      </g>
      <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#000" /></marker></defs>
      <text x="300" y="155" class="var-label">Variable - #1</text>
      <circle cx="350" cy="150" r="40" fill="#dcccff" stroke="#999" stroke-width="2"/>
      <text x="300" y="255" class="var-label">Variable - #2</text>
      <circle cx="350" cy="250" r="40" fill="#dcccff" stroke="#999" stroke-width="2"/>
      <text x="300" y="355" class="var-label">Variable - #3</text>
      <circle cx="350" cy="350" r="40" fill="#dcccff" stroke="#999" stroke-width="2"/>
      <text x="300" y="455" class="var-label">Variable - #4</text>
      <circle cx="350" cy="450" r="40" fill="#dcccff" stroke="#999" stroke-width="2"/>
      <circle cx="600" cy="200" r="40" fill="#fffacd" stroke="#999" stroke-width="2"/>
      <circle cx="600" cy="300" r="40" fill="#fffacd" stroke="#999" stroke-width="2"/>
      <circle cx="600" cy="400" r="40" fill="#fffacd" stroke="#999" stroke-width="2"/>
      <circle cx="850" cy="300" r="40" fill="#6ba4b8" stroke="#333" stroke-width="2"/>
      <text x="960" y="305" font-family="sans-serif" font-weight="bold" font-size="18">Output</text>
      <text x="600" y="550" class="sub">An example of a Feed-forward Neural Network with one hidden layer (with 3 neurons)</text>
    </svg>
  `),
  WEALTH: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" style="background-color:#ffffff;" width="1000" height="700">
      <rect x="0" y="0" width="1000" height="15" fill="#ddd"/>
      <text x="50" y="50" font-family="sans-serif" font-size="10">Daiwa Securities Group Inc. Integrated Report 2025</text>
      <text x="500" y="50" font-family="sans-serif" font-size="10" fill="#999">Message from the CEO</text>
      <text x="700" y="50" font-family="sans-serif" font-size="10" fill="#0055aa" font-weight="bold">Maximizing Asset Value</text>
      <text x="50" y="100" font-family="serif" font-size="32" font-weight="bold">Wealth Management Strategy</text>
      <g transform="translate(50, 140)" font-family="sans-serif" font-size="14" fill="#333">
        <text x="0" y="0" font-weight="bold">The main sources of revenues in the Wealth Management Division are asset-based</text>
        <text x="0" y="20" font-weight="bold">revenues, mainly wrap fees and investment trust administration fees...</text>
        <text x="0" y="60" fill="#0055aa" font-weight="bold">Main Companies</text>
        <rect x="0" y="75" width="5" height="5" fill="#0055aa"/> <text x="10" y="80" font-size="12">Daiwa Securities Co. Ltd.</text>
        <rect x="0" y="95" width="5" height="5" fill="#0055aa"/> <text x="10" y="100" font-size="12">Daiwa Next Bank, Ltd.</text>
        <rect x="0" y="115" width="5" height="5" fill="#0055aa"/> <text x="10" y="120" font-size="12">Fintertech Co. Ltd.</text>
        <text x="0" y="160" fill="#0055aa" font-weight="bold">Awareness of Environment</text>
        <text x="0" y="180" font-size="12">▷ Growing inflationary pressure</text>
        <text x="0" y="200" font-size="12">▷ Growing needs for asset preservation as people live longer</text>
      </g>
      <g transform="translate(550, 180)">
        <text x="0" y="-30" text-anchor="middle" font-size="12" font-weight="bold">WM Division ordinary income</text>
        <circle cx="0" cy="0" r="60" fill="#eee"/>
        <path d="M0 0 L0 -60 A60 60 0 0 1 52 30 Z" fill="#0055aa"/>
        <circle cx="0" cy="0" r="30" fill="white"/>
        <text x="0" y="5" text-anchor="middle" font-size="10" font-weight="bold">FY2024</text>
        <text x="70" y="0" font-size="16" fill="#0055aa" font-weight="bold">¥80.6 billion</text>
        <text x="70" y="20" font-size="12" fill="#333">(36%)</text>
      </g>
      <g transform="translate(750, 140)">
        <rect x="0" y="0" width="100" height="120" fill="#ddd"/><rect x="0" y="80" width="100" height="40" fill="#333"/><circle cx="50" cy="50" r="30" fill="#f0d0b0"/>
        <text x="110" y="30" font-weight="bold" font-family="sans-serif">Junichi Serizawa</text>
        <text x="110" y="50" font-size="12" fill="#666">Deputy Head of</text>
        <text x="110" y="65" font-size="12" fill="#666">Wealth Management</text>
        <foreignObject x="0" y="140" width="220" height="300">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif; font-size:11px; line-height:1.4;">
            The WM Division posted ordinary income of ¥80.6 billion in FY2024, marking a significant 21.8% year-on-year increase. Asset-based revenues reached ¥111.7 billion.
          </div>
        </foreignObject>
      </g>
      <g transform="translate(450, 500)">
        <text x="0" y="-30" font-weight="bold" fill="#0055aa" font-family="sans-serif">Growth in net asset inflow</text>
        <line x1="0" y1="150" x2="300" y2="150" stroke="#000"/>
        <rect x="20" y="100" width="30" height="50" fill="#abc"/><rect x="20" y="130" width="30" height="20" fill="#0055aa"/><text x="35" y="90" text-anchor="middle" font-size="10">718.6</text>
        <rect x="100" y="90" width="30" height="60" fill="#abc"/><rect x="100" y="120" width="30" height="30" fill="#0055aa"/><text x="115" y="80" text-anchor="middle" font-size="10">737.4</text>
        <rect x="180" y="60" width="30" height="90" fill="#abc"/><rect x="180" y="100" width="30" height="50" fill="#0055aa"/><text x="195" y="50" text-anchor="middle" font-size="10">830.9</text>
        <rect x="260" y="20" width="30" height="130" fill="#abc"/><rect x="260" y="70" width="30" height="80" fill="#0055aa"/><text x="275" y="10" text-anchor="middle" font-size="12" font-weight="bold">1,573.3</text>
        <path d="M50 100 L 250 30" stroke="#ccc" stroke-width="10" opacity="0.3" marker-end="url(#arrow)"/>
      </g>
    </svg>
  `)
};

const DEFAULT_LIBRARY: Note[] = [
  {
    id: 'lib-note-2',
    sourceUrl: 'File Upload',
    platform: Platform.FILE,
    title: 'JavaScript Purpose & Setup',
    summary: [
      'Client-Side Scripting: Enables manipulation of content/behavior directly in browser.',
      'DOM Manipulation: Dynamically updates page elements, forms, and responses to user interaction.',
      'AJAX: Allows asynchronous communication with servers (fetching data without reload).',
      'Setup: Requires a development environment to start coding.'
    ],
    extractedText: `1.2 Purpose of JavaScript:
JavaScript's primary purpose is to enable client-side scripting on web pages.
This means it allows developers to manipulate the content and behavior of web pages directly within the user's web browser.

With JavaScript, we can dynamically update web pages elements, validate form inputs, and respond to user interactions like clicks, mouse movements, and keyboard input.

Additionally, JavaScript can interact with web servers through AJAX (Asynchronous JavaScript and XML) to fetch data without requiring a page reload.

1.3 Setting up the development environment:
To start coding in JavaScript, we need a development environment set up.`,
    tags: ['#Coding', '#JavaScript', '#WebDev'],
    createdAt: Date.now() - 86400000,
    lastReviewedAt: Date.now(),
    reviewCount: 0,
    quizAttempts: [],
    needsRevision: true,
    userFiles: [MOCK_ASSETS.JS_NOTES]
  },
  {
    id: 'lib-note-3',
    sourceUrl: 'File Upload',
    platform: Platform.FILE,
    title: 'SwiftUI TicTacToe Code',
    summary: [
      'ContentView structure defining the main game UI.',
      'State management using @StateObject for GameState.',
      'VStack layout with Text title "Tic Tac Toe".',
      'LazyVGrid implementation for the 3x3 game board.',
      'ForEach loop iterating 0...8 to create CellViews.'
    ],
    extractedText: `import SwiftUI

struct ContentView: View {
    @StateObject var gameState = GameState()
    
    var body: some View {
        let borderSize = CGFloat(5)
        
        Text(gameState.turnText())
            .font(.title)
            .bold()
            .padding()
        Spacer()
        
        Text(String(format: "Crosses: %d", gameState.crossesScore))
            .font(.title)
            
        VStack(spacing: borderSize) {
            ForEach(0...2, id: \\.self) { row in
                HStack(spacing: borderSize) {
                    ForEach(0...2, id: \\.self) { column in
                        let cell = gameState.board[row][column]
                        Text(cell.displayTile())
                            .font(.system(size: 60))
                            .foregroundColor(cell.tileColor())
                    }
                }
            }
        }
    }
}`,
    tags: ['#Coding', '#SwiftUI', '#iOS'],
    createdAt: Date.now() - 43200000,
    lastReviewedAt: Date.now(),
    reviewCount: 2,
    quizAttempts: [],
    needsRevision: false,
    userFiles: [MOCK_ASSETS.SWIFT]
  },
  {
    id: 'lib-note-4',
    sourceUrl: 'File Upload',
    platform: Platform.FILE,
    title: 'Neural Network Architecture',
    summary: [
      'Structure of a Feed-forward Neural Network.',
      'Input Layer: Takes 4 distinct variables.',
      'Hidden Layer: Contains 3 neurons processing inputs.',
      'Output Layer: Single neuron generating the final result.',
      'Connectivity: Fully connected mesh between layers.'
    ],
    extractedText: `Input Layer
Variable #1
Variable #2
Variable #3
Variable #4

Hidden Layer
(3 neurons fully connected to inputs)

Output Layer
(1 neuron connected to hidden layer) -> Output

An example of a Feed-forward Neural Network with one hidden layer (with 3 neurons)`,
    tags: ['#AI', '#NeuralNetworks', '#DataScience'],
    createdAt: Date.now() - 21600000,
    lastReviewedAt: Date.now(),
    reviewCount: 0,
    quizAttempts: [],
    needsRevision: false,
    userFiles: [MOCK_ASSETS.NEURAL]
  },
  {
    id: 'lib-note-5',
    sourceUrl: 'File Upload',
    platform: Platform.FILE,
    title: 'Daiwa Securities Group Integrated Report 2025',
    summary: [
      'Wealth Management Strategy targeting asset-based revenues.',
      'Ordinary income reached ¥80.6 billion (+21.8% YoY).',
      'Net asset inflow: ¥1,573.3 billion, significant growth.',
      'Focus on "Customer-centric total asset consulting".',
      'Key subsidiaries: Daiwa Next Bank, Fintertech (Digital Asset Loans).'
    ],
    extractedText: `Wealth Management Strategy
The main sources of revenues in the Wealth Management Division are asset-based revenues...

WM Division ordinary income: ¥80.6 billion (FY2024)
Net asset inflow: ¥1,573.3 billion

Main Companies:
Daiwa Securities Co. Ltd.
Daiwa Next Bank, Ltd.
Daiwa Connect Securities Co., Ltd.
Fintertech Co. Ltd.

Message from a branch manager: "By promoting total asset consulting, we have decisively taken the first step of gaining a deep understanding of our customers..."`,
    tags: ['#Finance', '#Wealth', '#Strategy'],
    createdAt: Date.now() - 3600000,
    lastReviewedAt: Date.now(),
    reviewCount: 0,
    quizAttempts: [],
    needsRevision: false,
    userFiles: [MOCK_ASSETS.WEALTH]
  }
];

const DEFAULT_INBOX: InboxItem[] = [
  {
    id: 'default-inbox-1',
    url: 'https://x.com/thedankoe/status/2012956603297964167?s=20',
    title: 'Dan Koe Tweet',
    platform: Platform.TWITTER,
    capturedAt: Date.now(),
    summary: [
      'Processing tweet thread content...',
      'Analyzing engagement metrics...',
      'Extracting core philosophy on focus.'
    ],
    isProcessing: false,
    userFiles: [] 
  },
  {
    id: 'default-inbox-2',
    url: 'https://abcnews.go.com/US/housecleaner-multiple-illnesses-tied-las-vegas-house-bio/story?id=129865238',
    title: 'Housecleaner Reports Illnesses Tied to Las Vegas Home with Possible Bio Lab',
    platform: Platform.GENERIC,
    capturedAt: Date.now() - 10000,
    summary: [
      'Housecleaner filed lawsuit alleging severe health issues after cleaning illegal bio-lab in Reedley, CA.',
      'Property contained infectious agents including malaria, HIV, and COVID-19.',
      'CDC investigation confirmed presence of biological hazards.'
    ],
    isProcessing: false,
    userFiles: []
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('canvas');
  const [theme, setTheme] = useState<AppTheme>(AppTheme.MINIMAL);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [inboxTrash, setInboxTrash] = useState<InboxItem[]>([]);
  const [library, setLibrary] = useState<Note[]>([]);
  const [trash, setTrash] = useState<Note[]>([]);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [canvases, setCanvases] = useState<CanvasDocument[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [canvasTrash, setCanvasTrash] = useState<CanvasDocument[]>([]);
  const [retentionData, setRetentionData] = useState<RetentionSummary | null>(null);

  const [showDeleteWarning, setShowDeleteWarning] = useState(true);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>('Medium');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatFileIndex, setChatFileIndex] = useState(0);
  const [activeChatContextId, setActiveChatContextId] = useState<string | null>(null);

  const [selectedCanvasNodes, setSelectedCanvasNodes] = useState<CanvasNode[]>([]);

  const handleNeuralDumpComplete = (newNodes: any[]) => {
      if (activeCanvasId) {
          const canvas = canvases.find(c => c.id === activeCanvasId);
          if (canvas) {
              let processedNodes = [...newNodes];
              let newEdges: CanvasEdge[] = [];
              if (selectedCanvasNodes.length === 1) {
                   const parent = selectedCanvasNodes[0];
                   processedNodes = newNodes.map((node, i) => ({
                       ...node,
                       x: parent.x + (parent.width || 250) + 100,
                       y: parent.y + (i * 300)
                   }));
                   newEdges = processedNodes.map(node => ({
                       id: `edge-${parent.id}-${node.id}`,
                       source: parent.id,
                       target: node.id,
                       type: 'neural'
                   }));
              }
              const updatedNodes = [...canvas.state.nodes, ...processedNodes];
              const updatedEdges = [...(canvas.state.edges || []), ...newEdges];
              const updatedCanvas = {
                  ...canvas,
                  lastModified: Date.now(),
                  state: { ...canvas.state, nodes: updatedNodes, edges: updatedEdges }
              };
              setCanvases(prev => prev.map(c => c.id === activeCanvasId ? updatedCanvas : c));
          }
      } else {
          const inboxItems = newNodes.map(n => ({
              id: n.id,
              url: 'neural://dump',
              title: n.title || "Neural Capture",
              platform: Platform.GENERIC,
              capturedAt: Date.now(),
              summary: [n.content || ""],
              isProcessing: false
          } as InboxItem));
          setInbox(prev => [...inboxItems, ...prev]);
      }
  };

  const { isListening, isProcessing, isInputOpen, setIsInputOpen, transcript, setTranscript, triggerProcessing, setIsListening } = useNeuralDump({ 
      onComplete: handleNeuralDumpComplete 
  });

  const sanitizeSummary = (summary: any): string[] => {
      if (Array.isArray(summary)) return summary;
      if (typeof summary === 'string') return summary.split('\n').filter(s => s.trim() !== '');
      return [];
  };

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const initData = async () => {
        const load = async <T,>(key: string, fallback: T): Promise<T> => {
            let data = await loadFromStorage<T>(key);
            // Strictly check for null/undefined to distinguish "first time" vs "empty list"
            return (data !== null && data !== undefined) ? data : fallback;
        };
        
        let [lInbox, lInboxTrash, lLibrary, lTrash, lActivity, lCanvases, lCTrash, lRetention] = await Promise.all([
            load<InboxItem[] | null>('kno_inbox', null),
            load<InboxItem[]>('kno_inbox_trash', []),
            load<Note[] | null>('kno_library', null),
            load<Note[]>('kno_trash', []),
            load<DailyActivity[]>('kno_activity', []),
            load<CanvasDocument[]>('kno_canvases', []),
            load<CanvasDocument[]>('kno_canvas_trash', []),
            load<RetentionSummary | null>('kno_memory_analytics', null)
        ]);

        // Bug 2 Fix: Only load defaults if the result from DB is strictly null
        const finalLibrary = lLibrary === null ? DEFAULT_LIBRARY : lLibrary;
        const finalInbox = lInbox === null ? DEFAULT_INBOX : lInbox;

        setInbox((finalInbox || []).map(item => ({ ...item, summary: sanitizeSummary(item.summary) })));
        setInboxTrash((lInboxTrash || []).map(item => ({ ...item, summary: sanitizeSummary(item.summary) })));
        setLibrary((finalLibrary || []).map(note => ({ ...note, summary: sanitizeSummary(note.summary) })));
        setTrash((lTrash || []).map(note => ({ ...note, summary: sanitizeSummary(note.summary) })));
        setActivity(lActivity || []);
        setCanvases(lCanvases || []);
        setCanvasTrash(lCTrash || []);
        setRetentionData(lRetention);
        setIsDataLoaded(true);
    };
    initData();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;
    saveToStorage('kno_inbox', inbox);
    saveToStorage('kno_inbox_trash', inboxTrash);
    saveToStorage('kno_library', library);
    saveToStorage('kno_trash', trash);
    saveToStorage('kno_activity', activity);
    saveToStorage('kno_canvases', canvases);
    saveToStorage('kno_canvas_trash', canvasTrash);
    saveToStorage('kno_memory_analytics', retentionData);
  }, [inbox, inboxTrash, library, trash, activity, canvases, canvasTrash, retentionData, isDataLoaded]);

  const handleCapture = async (url: string, options: ProcessingOptions) => {
    const finalUrl = url || (options.files && options.files.length > 0 ? "File Upload" : "");
    if (!finalUrl) return Promise.resolve();
    const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const platform = detectPlatform(finalUrl);
    const capturedFiles = options.files?.map(f => f.data) || [];
    const newItem: InboxItem = { 
        id: tempId, 
        url: finalUrl, 
        title: platform === Platform.FILE ? 'Analyzing Files...' : 'Processing Signal...', 
        platform: platform, 
        capturedAt: Date.now(), 
        summary: [], 
        tags: [], 
        isProcessing: true,
        userFiles: capturedFiles
    };
    setInbox(prev => [newItem, ...prev]);
    processUrlContent(finalUrl, { ...options, quizDifficulty })
        .then((processedData) => {
            setInbox(prev => prev.map(item => item.id === tempId ? { ...item, ...processedData, isProcessing: false } : item ));
        })
        .catch(err => {
            console.error("Processing failed for item", tempId, err);
            setInbox(prev => prev.map(item => item.id === tempId ? { 
                ...item, 
                title: "Processing Failed", 
                summary: ["Could not extract content. Please check URL."], 
                isProcessing: false 
            } : item));
        });
    return Promise.resolve();
  };

  const handleKeep = async (item: InboxItem, editedSummary?: string[], quizAnswers?: Record<number, number>, tags?: string[], editedTitle?: string) => {
    const quizAttempts: QuizAttempt[] = [];
    if (quizAnswers && Object.keys(quizAnswers).length > 0 && item.generatedQuiz) {
        let correctCount = 0;
        item.generatedQuiz.forEach((q, idx) => {
            if (quizAnswers[idx] === q.correctAnswerIndex) correctCount++;
        });
        quizAttempts.push({
            timestamp: Date.now(),
            score: correctCount,
            totalQuestions: item.generatedQuiz.length,
            answers: quizAnswers,
            questions: item.generatedQuiz
        });
    }
    const newNote: Note = { 
        id: item.id, 
        sourceUrl: item.url, 
        platform: item.platform, 
        title: editedTitle || item.title, 
        summary: editedSummary || item.summary || [], 
        tags: tags || item.tags || [], 
        createdAt: item.capturedAt, 
        lastReviewedAt: quizAttempts.length > 0 ? Date.now() : item.capturedAt, 
        reviewCount: quizAttempts.length, 
        generatedQuiz: item.generatedQuiz, 
        quizAttempts: quizAttempts, 
        needsRevision: false,
        suppressQuizFeedback: item.suppressQuizFeedback,
        userFiles: item.userFiles 
    };
    setLibrary(prev => [newNote, ...prev]);
    setInbox(prev => prev.filter(i => i.id !== item.id));
    recordActivity();
  };

  const handleKeepAllSignals = () => {
    const itemsToKeep = inbox.filter(i => !i.isProcessing);
    if (itemsToKeep.length === 0) return;
    const newNotes: Note[] = itemsToKeep.map(item => ({
        id: item.id,
        sourceUrl: item.url,
        platform: item.platform,
        title: item.title,
        summary: item.summary || [],
        tags: item.tags || [],
        createdAt: item.capturedAt,
        lastReviewedAt: item.capturedAt,
        reviewCount: 0,
        generatedQuiz: item.generatedQuiz,
        quizAttempts: [],
        needsRevision: false,
        suppressQuizFeedback: item.suppressQuizFeedback,
        userFiles: item.userFiles
    }));
    setLibrary(prev => [...newNotes, ...prev]);
    setInbox(prev => prev.filter(i => i.isProcessing));
    setActivity(prev => {
        const today = getLocalDateString();
        const existing = prev.find(d => d.date === today);
        const countToAdd = itemsToKeep.length;
        if (existing) return prev.map(d => d.date === today ? { ...d, count: (d.count || 0) + countToAdd } : d);
        return [...prev, { date: today, count: countToAdd }];
    });
  };

  const handleQuizFeedback = (id: string, type: QuizFeedbackType, suppress: boolean) => {
      setLibrary(prev => prev.map(n => n.id === id ? { ...n, quizFeedback: type, suppressQuizFeedback: suppress } : n));
  };

  const handleUpdateNote = (updatedNote: Note) => {
      setLibrary(prev => prev.map(old => old.id === updatedNote.id ? updatedNote : old));
  };

  const recordActivity = () => {
    const today = getLocalDateString();
    setActivity(prev => {
      const existing = (prev || []).find(d => d.date === today);
      if (existing) return prev.map(d => d.date === today ? { ...d, count: (d.count || 0) + 1 } : d);
      return [...(prev || []), { date: today, count: 1 }];
    });
  };

  const handleRestoreNote = (note: Note) => {
      setLibrary(prev => [note, ...prev]);
      setTrash(prev => prev.filter(n => n.id !== note.id));
  };

  const handleDuplicateNote = (note: Note) => {
      const newNote: Note = {
          ...note,
          id: Date.now().toString(),
          title: `${note.title} (Copy)`,
          createdAt: Date.now(),
          lastReviewedAt: Date.now(),
          quizAttempts: [],
          reviewCount: 0
      };
      setLibrary(prev => [newNote, ...prev]);
  };

  const handleDeleteForever = (id: string) => {
      setTrash(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteSignal = (id: string) => {
      const item = inbox.find(i => i.id === id);
      if (item) {
          setInboxTrash(prev => [item, ...prev]);
          setInbox(prev => prev.filter(i => i.id !== id));
      }
  };

  const handleRestoreSignal = (item: InboxItem) => {
      setInbox(prev => [item, ...prev]);
      setInboxTrash(prev => prev.filter(i => i.id !== item.id));
  };

  const handleDeleteSignalForever = (id: string) => {
      setInboxTrash(prev => prev.filter(i => i.id !== id));
  };

  const handleDeleteNote = (id: string) => {
      const n = library.find(x => x.id === id);
      if (n) {
          setLibrary(prev => prev.filter(x => x.id !== id));
          setTrash(prev => [n, ...prev]);
          setCanvases(prev => prev.map(c => ({
              ...c,
              state: {
                  ...c.state,
                  nodes: c.state.nodes.filter(node => node.noteId !== id)
              }
          })));
      }
  };

  const handleDeleteAllNotes = () => {
      setTrash(prev => [...library, ...prev]);
      setLibrary([]);
      setCanvases(prev => prev.map(c => ({
            ...c,
            state: {
                ...c.state,
                nodes: c.state.nodes.filter(node => !node.noteId)
            }
      })));
  };

  const handleSaveInsight = (question: string, answer: string, sourceTitle?: string) => {
      const activeItem = getActiveContextItem();
      const newInsight: SparkInsight = {
          id: `spark-${Date.now()}`,
          question,
          answer,
          timestamp: Date.now()
      };
      if (activeItem) {
          const updatedNote = {
              ...activeItem,
              sparkInsights: [...(activeItem.sparkInsights || []), newInsight]
          };
          setLibrary(prev => prev.map(n => n.id === activeItem.id ? updatedNote : n));
      } else {
          const tags = ['#Insight', '#AI-Chat'];
          if (sourceTitle) {
              const cleanSource = sourceTitle.replace(/[#]/g, '').substring(0, 20);
              tags.push(`#${cleanSource}...`);
          }
          const newNote: Note = {
              id: `insight-${Date.now()}`,
              sourceUrl: 'chat://insight',
              platform: Platform.GENERIC,
              title: question.trim(), 
              summary: [answer],
              tags: tags,
              createdAt: Date.now(),
              lastReviewedAt: Date.now(),
              reviewCount: 0,
              quizAttempts: [],
              needsRevision: false,
              type: 'insight'
          };
          setLibrary(prev => [newNote, ...prev]);
      }
      if (view === 'canvas' && activeCanvasId) {
          const canvas = canvases.find(c => c.id === activeCanvasId);
          if (canvas) {
              const sourceNode = selectedCanvasNodes.length === 1 ? selectedCanvasNodes[0] : null;
              const newNodeId = `spark-node-${Date.now()}`;
              const insightNode: CanvasNode = {
                  id: newNodeId,
                  type: 'spark',
                  title: question.substring(0, 30) + (question.length > 30 ? '...' : ''),
                  content: `**Q:** ${question}\n\n**A:** ${answer}`,
                  x: sourceNode ? sourceNode.x + (sourceNode.width || 250) + 50 : (-canvas.state.viewport.x + 100) / canvas.state.viewport.zoom,
                  y: sourceNode ? sourceNode.y : (-canvas.state.viewport.y + 100) / canvas.state.viewport.zoom,
                  width: 300,
                  color: '#F59E0B'
              };
              let newEdges = [...canvas.state.edges];
              if (sourceNode) {
                  newEdges.push({
                      id: `edge-${sourceNode.id}-${newNodeId}`,
                      source: sourceNode.id,
                      target: newNodeId,
                      type: 'spark'
                  });
              }
              const updatedCanvas = {
                  ...canvas,
                  lastModified: Date.now(),
                  state: {
                      ...canvas.state,
                      nodes: [...canvas.state.nodes, insightNode],
                      edges: newEdges
                  }
              };
              setCanvases(prev => prev.map(c => c.id === activeCanvasId ? updatedCanvas : c));
          }
      }
      recordActivity();
  };

  const getActiveContextItem = (): Note | null => {
      // Prioritize explicit context set via card interaction
      if (isChatOpen && activeChatContextId) {
          const contextItem = library.find(n => n.id === activeChatContextId);
          if (contextItem) return contextItem;
      }
      
      // Fallback to active selection if chat is open but no specific context is hard-set
      if (view === 'canvas' && selectedCanvasNodes.length === 1) {
          const node = selectedCanvasNodes[0];
          if (node.noteId) return library.find(n => n.id === node.noteId) || null;
          if (node.content) {
              return {
                  id: node.id,
                  title: node.title || "Canvas Node",
                  summary: [node.content],
                  tags: [],
                  platform: Platform.GENERIC,
                  createdAt: Date.now(),
                  lastReviewedAt: Date.now(),
                  reviewCount: 0,
                  quizAttempts: [],
                  needsRevision: false,
                  sourceUrl: ''
              };
          }
      }

      if (focusedNoteId) {
          return library.find(n => n.id === focusedNoteId) || null;
      }
      
      return null;
  };

  const handleOpenChat = (noteId?: string, fileIndex?: number) => {
    if (noteId) {
        setFocusedNoteId(noteId);
        setActiveChatContextId(noteId);
    }
    if (fileIndex !== undefined) setChatFileIndex(fileIndex);
    else setChatFileIndex(0);
    setIsChatOpen(true);
  };

  // Sync activeChatContextId to the single selected node to solve "same card" bug
  useEffect(() => {
    if (view === 'canvas' && selectedCanvasNodes.length === 1) {
        const node = selectedCanvasNodes[0];
        if (node.noteId) {
            setActiveChatContextId(node.noteId);
        } else {
            setActiveChatContextId(node.id);
        }
    }
  }, [selectedCanvasNodes, view]);

  if (showWelcome) {
    return <WelcomeScreen onEnter={() => setShowWelcome(false)} />;
  }

  return (
    <div className={`h-screen overflow-hidden flex flex-col ${THEME_CLASSES[theme]} font-sans animate-fade-in`}>
      <main className="flex-1 h-full relative overflow-hidden">
        {view === 'canvas' && (
            <LearningCanvas 
                library={library || []} 
                inbox={inbox || []}
                inboxTrash={inboxTrash || []}
                noteTrash={trash || []}
                theme={theme} 
                canvases={canvases || []} 
                onUpdateCanvases={setCanvases} 
                canvasTrash={canvasTrash || []} 
                onMoveCanvasToTrash={(id) => {const c = canvases.find(x => x.id === id); if(c) {setCanvases(prev => prev.filter(x => x.id !== id)); setCanvasTrash(prev => [c, ...prev]);}}} 
                onRestoreCanvas={(id) => {const c = canvasTrash.find(x => x.id === id); if(c) {setCanvasTrash(prev => prev.filter(x => x.id !== id)); setCanvases(prev => [c, ...prev]);}}} 
                onDeleteCanvasForever={(id) => setCanvasTrash(prev => prev.filter(x => x.id !== id))} 
                activeCanvasId={activeCanvasId} 
                onSelectCanvas={setActiveCanvasId} 
                onOpenNeuralDump={() => setIsInputOpen(prev => !prev)}
                onEnterMemoryLab={() => setView('memory')}
                onGoToLibrary={() => setView('library')}
                onCapture={handleCapture}
                onDeleteSignal={handleDeleteSignal}
                onRestoreSignal={handleRestoreSignal}
                onDeleteSignalForever={handleDeleteSignalForever}
                onKeepSignal={handleKeep}
                onKeepAllSignals={handleKeepAllSignals}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onRestoreNote={handleRestoreNote}
                onDeleteNoteForever={handleDeleteForever}
                onSelectionChange={setSelectedCanvasNodes}
                onExitWorkspace={() => setShowWelcome(true)}
                onOpenChat={handleOpenChat}
            />
        )}
        
        {view === 'library' && (
             <div className="relative h-full w-full">
                <button 
                    onClick={() => setView('canvas')} 
                    className="absolute top-6 left-6 z-50 p-2 bg-white/10 backdrop-blur-md rounded-full text-black hover:bg-white/20 transition-all border border-black/10"
                >
                    <X className="w-6 h-6" />
                </button>
                <Library 
                    library={library || []} 
                    theme={theme} 
                    onUpdateNote={handleUpdateNote} 
                    onDeleteNote={handleDeleteNote}
                    onDeleteAll={handleDeleteAllNotes}
                    showDeleteWarning={showDeleteWarning}
                    onToggleDeleteWarning={setShowDeleteWarning}
                    usedNoteIds={new Set(canvases.flatMap(c => c.state.nodes.filter(n => n.noteId).map(n => n.noteId as string)))}
                    onQuizFeedback={handleQuizFeedback}
                    initialFocusedNoteId={focusedNoteId}
                    onFocusCleared={() => setFocusedNoteId(null)}
                    trash={trash}
                    onRestoreNote={handleRestoreNote}
                    onDeleteForever={handleDeleteForever}
                    onDuplicateNote={handleDuplicateNote}
                    onOpenMemoryLab={() => setView('memory')}
                    onOpenNeuralDump={() => setIsInputOpen(prev => !prev)}
                    onOpenChat={handleOpenChat}
                />
             </div>
        )}

        {view === 'memory' && (
             <div className="relative h-full w-full">
                <button 
                    onClick={() => setView('canvas')} 
                    className="absolute top-6 left-6 z-50 p-2 bg-white/10 backdrop-blur-md rounded-full text-black hover:bg-white/20 transition-all border border-black/10"
                >
                    <X className="w-6 h-6" />
                </button>
                <MemoryLab 
                    library={library || []}
                    theme={theme}
                    onNavigateToNote={(id) => { setFocusedNoteId(id); setView('library'); }}
                    onGoToLibrary={() => setView('library')}
                    data={retentionData}
                    onUpdateData={setRetentionData}
                    activity={activity}
                />
             </div>
        )}
      </main>

      <KAiOrb 
        theme={theme} 
        library={library || []}
        isOpen={isChatOpen}
        onSetOpen={(open) => {
            setIsChatOpen(open);
        }}
        isListening={isListening}
        isInputOpen={isInputOpen}
        onToggleInput={setIsInputOpen}
        isProcessing={isProcessing}
        transcript={transcript}
        setTranscript={setTranscript}
        onProcess={(text, context) => triggerProcessing(text, context)}
        selectedNodes={view === 'canvas' ? selectedCanvasNodes : []}
        activeContextItem={getActiveContextItem()} 
        onSaveInsight={handleSaveInsight} 
        startAtIndex={chatFileIndex} 
        showNeuralInput={view === 'canvas'} 
        onUpdateNote={handleUpdateNote} 
      />
    </div>
  );
};

export default App;