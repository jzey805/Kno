

export enum AppTheme {
  MINIMAL = 'minimal',
  SERENITY = 'serenity',
  EMBER = 'ember',
  BREEZE = 'breeze',
  LAVENDER = 'lavender',
}

export enum Platform {
  YOUTUBE = 'YouTube',
  TIKTOK = 'TikTok',
  TWITTER = 'Twitter/X',
  INSTAGRAM = 'Instagram',
  DOUYIN = 'Douyin',
  XIAOHONGSHU = 'Xiaohongshu',
  BILIBILI = 'Bilibili',
  ZHIHU = 'Zhihu',
  WECHAT = 'WeChat',
  GENERIC = 'Web',
  FILE = 'File', 
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface QuizAttempt {
  timestamp: number;
  score: number;
  totalQuestions: number;
  answers: Record<number, number>; 
  questions?: QuizQuestion[]; 
  responseTimeSeconds?: number;
}

export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface FileData {
  mimeType: string;
  data: string; // base64
  name?: string;
}

export interface ProcessingOptions {
  summaryPoints: number; 
  quizCount: number; 
  targetLanguage: string;
  sourceLanguage?: string; 
  contextText?: string; 
  quizDifficulty?: QuizDifficulty; 
  files?: FileData[]; 
}

export type QuizFeedbackType = 'easy' | 'hard' | 'good' | 'bad' | 'error';

export interface InboxItem {
  id: string;
  url: string;
  title: string; 
  platform: Platform;
  capturedAt: number; 
  summary: string[]; 
  tags?: string[]; 
  generatedQuiz?: QuizQuestion[];
  isProcessing: boolean;
  thinking?: string; 
  quizFeedback?: QuizFeedbackType; 
  suppressQuizFeedback?: boolean; 
  userFiles?: string[]; // Added to carry file data
}

export interface CritiqueResult {
  issue: string;
  fix: string;
  confidence: string;
  isSafe: boolean;
  // Detailed Analysis Structure
  structuredAnalysis?: {
    factual: { status: string; issue: string };
    balance: { status: string; check: string };
    logic: { status: string; type: string; explanation: string };
  };
}

export interface SparkInsight {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
}

export interface Note {
  id: string;
  sourceUrl: string;
  platform: Platform;
  title: string;
  summary: string[];
  tags: string[];
  createdAt: number;
  lastReviewedAt: number;
  reviewCount: number;
  userThoughts?: string;
  userFiles?: string[]; 
  generatedQuiz?: QuizQuestion[];
  quizAttempts: QuizAttempt[]; 
  needsRevision: boolean;
  quizFeedback?: QuizFeedbackType; 
  suppressQuizFeedback?: boolean;
  
  // Logic Guard
  detectedFallacies?: string[];
  critique?: CritiqueResult;

  // Agentic Insights (Sparks)
  sparkInsights?: SparkInsight[];

  // Added type field for specialized notes (spark, collision, asset)
  type?: string;

  // OCR Data
  extractedText?: string;
}

export interface RetentionPrediction {
  topic: string;
  noteId: string;
  forgetting_probability: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  last_review_date: string;
  days_since_reviewed: number;
  reason: string;
  why_factors: string[]; // e.g., ["0/3 correct", "Slow response (18s)", "23 days elapsed"]
  recommended_action: string;
  optimal_review_date: string;
  urgency_status: 'overdue' | 'due' | 'stable';
}

export interface RetentionSummary {
  timestamp?: number; // For caching
  predictions: RetentionPrediction[];
  summary: {
    brain_score: number;
    score_prediction_7d: number;
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
    urgent_topics: string[];
    next_milestone_improvement: string;
  }
}

export type ViewState = 'triage' | 'library' | 'calendar' | 'profile' | 'canvas' | 'memory';

export interface DailyActivity {
  date: string; 
  count: number;
}

export interface AgentAction {
  label: string;
  actionId: string;
  style?: 'primary' | 'secondary';
  payload?: any;
}

export interface ProactiveIntervention {
  message: string;
  relatedNoteIds: string[];
  generatedQuiz?: QuizQuestion[];
  actions: AgentAction[];
}

export type NodeType = 'note' | 'insight' | 'synthesis' | 'cluster_label' | 'video' | 'image' | 'group' | 'asset' | 'spark' | 'conflict';
export type NodeSource = 'manual' | 'layout' | 'collider' | 'magnet' | 'alchemy' | 'publish' | 'insight' | 'course' | 'neural_dump';

export interface CanvasNode {
  id: string; 
  type: NodeType;
  source?: NodeSource; 
  noteId?: string; 
  title?: string;
  content?: string;
  question?: string; // The user prompt that generated this node
  steps?: string[]; 
  imageUrl?: string; 
  videoUrl?: string;
  x: number;
  y: number;
  width?: number; 
  height?: number; 
  highlighted?: boolean;
  color?: string;
  
  // The Architect
  clusterId?: string;
  
  // Logic Guard
  fallacies?: string[];
  critique?: CritiqueResult;

  // Collider History
  synthesisHistory?: { title: string; content: string; timestamp: number }[];
  historyIndex?: number;
  isThinking?: boolean; // Transient state for UI
}

export interface CanvasEdge {
  id: string;
  source: string; 
  target: string; 
  label?: string; 
  type?: 'dependency' | 'related' | 'sequence' | 'synthesis' | 'conflict' | 'spark' | 'neural';
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface CanvasDocument {
    id: string;
    title: string;
    lastModified: number;
    state: CanvasState;
    thumbnailNodes?: number; 
}

// Added Course Interfaces
export interface CourseModule {
  title: string;
  keyTakeaway: string;
  lessons: string[];
}

export interface CourseMeta {
  courseTitle: string;
  description: string;
  learningObjectives: string[];
  curriculum: CourseModule[];
}

// Neural Dump Types
export type NeuralItemType = 'image' | 'link' | 'text';

export interface NeuralStagedItem {
  id: string;
  type: NeuralItemType;
  content: string; // URL or Base64 or Text
  thumbnail?: string;
  meta?: string;
}