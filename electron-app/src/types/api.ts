// API Request/Response Types matching backend Pydantic models

export interface QueryRequest {
  query: string
  user_id?: string
}

export interface QueryResponse {
  success: boolean
  message: string
  query_id?: string
}

export interface BackgroundTaskResponse {
  task_id: string
  status: string
  message: string
}

export interface TaskStatusResponse {
  task_id: string
  status: string
  result?: any
  error_message?: string
  created_at?: string
  completed_at?: string
}

export interface ContentResponse {
  query_id: string
  content: any // Can be Dict or List
  created_at: string
  processing_time?: number
}

export interface ContentListResponse {
  items: Array<Record<string, any>>
  total_count: number
}

// Content Generation Task Types
export enum ContentTaskType {
  LESSONS = 'lessons',
  FLASHCARDS = 'flashcards', 
  QUIZ = 'quiz',
  RELATED_QUESTIONS = 'related_questions'
}

export interface ContentGenerationTask {
  id: string
  type: ContentTaskType
  name: string
  description: string
  status: TaskStatus
  progress: number // 0-100
  startTime?: Date
  completedTime?: Date
  error?: string
  estimatedDuration: number // in seconds
}

export interface TaskTrackerState {
  queryId: string | null
  tasks: ContentGenerationTask[]
  overallProgress: number
  isComplete: boolean
  hasErrors: boolean
  startTime?: Date
  completedTime?: Date
}

// Lesson content structure (matches backend API)
export interface Lesson {
  title: string
  overview: string
  key_concepts: string[]
  examples: string[]
}

// Flashcard structure (matches backend API)
export interface Flashcard {
  term: string
  explanation: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

// Quiz question structures (matches backend API)
export interface TrueFalseQuestion {
  question: string
  correct_answer: boolean
  explanation: string
}

export interface MultipleChoiceQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

export interface Quiz {
  true_false_questions: TrueFalseQuestion[]
  multiple_choice_questions: MultipleChoiceQuestion[]
}

// Related questions structure
export interface RelatedQuestion {
  question: string
  category: 'basic' | 'intermediate' | 'advanced'
  focus_area: string
  relevance_score?: number
}

// API Error structure
export interface APIError {
  detail: string
  status_code: number
  timestamp?: string
}

// Health check response
export interface HealthCheckResponse {
  status: string
  service: string
  version: string
  database: string
  task_queue: Record<string, any>
}

// Performance metrics
export interface PerformanceMetrics {
  status: string
  metrics: Record<string, any>
  timestamp: number
}

// Task status enum
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// API endpoints enum
export enum APIEndpoints {
  QUERY = '/api/query',
  LESSONS = '/api/lessons',
  FLASHCARDS = '/api/flashcards',
  QUIZ = '/api/quiz',
  RELATED_QUESTIONS = '/api/related-questions',
  TASKS = '/api/tasks',
  HEALTH = '/api/health',
  PERFORMANCE = '/api/performance/metrics'
} 