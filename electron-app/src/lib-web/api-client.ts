import {
  QueryRequest,
  QueryResponse,
  TaskStatusResponse,
  ContentResponse,
  ContentListResponse,
  HealthCheckResponse,
  PerformanceMetrics,
  APIError,
  APIEndpoints,
  TaskStatus,
  ContentStatusResponse
} from '../types/api'

// Configuration - Updated for Vite environment variables
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8420'
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second



// Custom error class for API errors
export class APIClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message)
    this.name = 'APIClientError'
  }
}

// Retry utility function
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on client errors (4xx) except 408, 429
      if (error instanceof APIClientError) {
        const shouldRetry = error.statusCode === 408 || error.statusCode === 429 || error.statusCode >= 500
        if (!shouldRetry || attempt === maxRetries) {
          throw error
        }
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError!
}

// Request wrapper with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  

  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  }

  try {
    const response = await fetch(url, config)
    

    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorDetails: any = null

      try {
        errorDetails = await response.json()
        errorMessage = errorDetails.detail || errorMessage

      } catch {
        // If response is not JSON, use status text
      }

      throw new APIClientError(errorMessage, response.status, errorDetails)
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json()

      return result
    } else {
      return {} as T
    }
  } catch (error) {
    if (error instanceof APIClientError) {
      throw error
    }
    
    // Handle network errors, timeouts, etc.
    if (error instanceof Error) {

      if (error.name === 'AbortError') {
        throw new APIClientError('Request timeout', 408)
      }
      throw new APIClientError(`Network error: ${error.message}`, 0)
    }
    
    throw new APIClientError('Unknown error occurred', 0)
  }
}

// API Client class
export class APIClient {
  // Submit a learning query
  static async submitQuery(request: QueryRequest): Promise<QueryResponse> {
    return withRetry(() =>
      apiRequest<QueryResponse>(APIEndpoints.QUERY, {
        method: 'POST',
        body: JSON.stringify(request),
      })
    )
  }

  // Get task status
  static async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    return withRetry(() =>
      apiRequest<TaskStatusResponse>(`${APIEndpoints.TASKS}/${taskId}`)
    )
  }

  // Get lessons by query ID
  static async getLessons(queryId: string): Promise<ContentResponse> {
    return withRetry(() =>
      apiRequest<ContentResponse>(`${APIEndpoints.LESSONS}/${queryId}`)
    )
  }

  // Get flashcards by query ID
  static async getFlashcards(queryId: string): Promise<ContentResponse> {
    return withRetry(() =>
      apiRequest<ContentResponse>(`${APIEndpoints.FLASHCARDS}/${queryId}`)
    )
  }

  // Get flashcards by query ID and lesson index
  static async getFlashcardsByLesson(queryId: string, lessonIndex: number): Promise<ContentResponse> {
    return withRetry(() =>
      apiRequest<ContentResponse>(`${APIEndpoints.FLASHCARDS}/${queryId}/${lessonIndex}`)
    )
  }

  // Get quiz by query ID and lesson index
  static async getQuiz(queryId: string, lessonIndex: number): Promise<ContentResponse> {
    return withRetry(() =>
      apiRequest<ContentResponse>(`${APIEndpoints.QUIZ}/${queryId}/${lessonIndex}`)
    )
  }



  // Get recent lessons
  static async getRecentLessons(limit: number = 50): Promise<ContentListResponse> {
    return withRetry(() =>
      apiRequest<ContentListResponse>(`${APIEndpoints.LESSONS}?limit=${limit}`)
    )
  }

  // Get recent flashcards
  static async getRecentFlashcards(limit: number = 50): Promise<ContentListResponse> {
    return withRetry(() =>
      apiRequest<ContentListResponse>(`${APIEndpoints.FLASHCARDS}?limit=${limit}`)
    )
  }



  // Health check
  static async healthCheck(): Promise<HealthCheckResponse> {
    return apiRequest<HealthCheckResponse>(APIEndpoints.HEALTH)
  }

  // Get performance metrics
  static async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return apiRequest<PerformanceMetrics>(APIEndpoints.PERFORMANCE)
  }

  // Get content generation status
  static async getContentStatus(queryId: string): Promise<ContentStatusResponse> {
    return withRetry(() =>
      apiRequest<ContentStatusResponse>(`${APIEndpoints.CONTENT_STATUS}/${queryId}`)
    )
  }

  // Poll task status until completion
  static async pollTaskStatus(
    taskId: string,
    onProgress?: (status: TaskStatusResponse) => void,
    pollInterval: number = 2000,
    maxPolls: number = 450 // 15 minutes max
  ): Promise<TaskStatusResponse> {
    let polls = 0
    
    while (polls < maxPolls) {
      try {
        const status = await this.getTaskStatus(taskId)
        
        if (onProgress) {
          onProgress(status)
        }

        // Check if task is completed
        if (status.status === TaskStatus.COMPLETED || 
            status.status === TaskStatus.FAILED) {
          return status
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        polls++
      } catch (error) {

        polls++
        
        if (polls >= maxPolls) {
          throw new APIClientError('Task polling timeout', 408)
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval))
      }
    }

    throw new APIClientError('Task polling timeout', 408)
  }

  // Submit query and wait for completion
  static async submitQueryAndWait(
    request: QueryRequest,
    onProgress?: (message: string) => void
  ): Promise<{ queryId: string; lessons?: ContentResponse; flashcards?: ContentResponse; quizzes?: ContentResponse }> {
    // Submit initial query
    const queryResponse = await this.submitQuery(request)
    
    if (!queryResponse.success || !queryResponse.query_id) {
      throw new APIClientError('Query submission failed', 400)
    }

    const queryId = queryResponse.query_id
    
    if (onProgress) {
      onProgress('Query submitted, generating content...')
    }

    // Wait a bit for tasks to be created
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Poll content status until all content is ready
    const maxAttempts = 300 // 10 minutes with 2-second intervals
    let attempts = 0
    let contentStatus: ContentStatusResponse | null = null

    while (attempts < maxAttempts) {
      try {
        contentStatus = await this.getContentStatus(queryId)
        
        // Check if lessons are ready
        if (contentStatus.lessons_generated && onProgress) {
          onProgress('Lessons ready!')
        }
        
        // Handle flashcards progress
        let allFlashcardsReady = false
        if (typeof contentStatus.flashcards_generated === 'boolean') {
          allFlashcardsReady = contentStatus.flashcards_generated
          if (allFlashcardsReady && onProgress) {
            onProgress('Flashcards ready!')
          }
        } else {
          const flashcardEntries = Object.entries(contentStatus.flashcards_generated)
          const completedFlashcards = flashcardEntries.filter(([_, ready]) => ready).length
          const totalFlashcards = flashcardEntries.length
          allFlashcardsReady = totalFlashcards > 0 && completedFlashcards === totalFlashcards
          
          if (onProgress) {
            if (allFlashcardsReady) {
              onProgress('Flashcards ready!')
            } else if (completedFlashcards > 0) {
              onProgress(`Flashcards: ${completedFlashcards}/${totalFlashcards} ready`)
            }
          }
        }
        
        // Handle quizzes progress
        let allQuizzesReady = false
        if (typeof contentStatus.quizzes_generated === 'boolean') {
          allQuizzesReady = contentStatus.quizzes_generated
          if (allQuizzesReady && onProgress) {
            onProgress('Quizzes ready!')
          }
        } else {
          const quizEntries = Object.entries(contentStatus.quizzes_generated)
          const completedQuizzes = quizEntries.filter(([_, ready]) => ready).length
          const totalQuizzes = quizEntries.length
          allQuizzesReady = totalQuizzes > 0 && completedQuizzes === totalQuizzes
          
          if (onProgress) {
            if (allQuizzesReady) {
              onProgress('Quizzes ready!')
            } else if (completedQuizzes > 0) {
              onProgress(`Quizzes: ${completedQuizzes}/${totalQuizzes} ready`)
            }
          }
        }
        
        // If all content is ready, break out of the loop
        if (contentStatus.lessons_generated && allFlashcardsReady && allQuizzesReady) {
          break
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 2000))
        attempts++
      } catch (error) {
        attempts++
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // If we couldn't get content status or content isn't ready, throw error
    if (!contentStatus) {
      throw new APIClientError('Failed to get content status after polling', 408)
    }
    
    const flashcardValues = Object.values(contentStatus.flashcards_generated)
    const allFlashcardsReady = flashcardValues.length > 0 && flashcardValues.every(ready => ready)
    
    const quizValues = Object.values(contentStatus.quizzes_generated)
    const allQuizzesReady = quizValues.length > 0 && quizValues.every(ready => ready)
    
    if (!contentStatus.lessons_generated || !allFlashcardsReady || !allQuizzesReady) {
      throw new APIClientError('Content generation incomplete after polling timeout', 408)
    }

    // Now fetch the actual content
    const results: { queryId: string; lessons?: ContentResponse; flashcards?: ContentResponse; quizzes?: ContentResponse } = {
      queryId
    }

    try {
      results.lessons = await this.getLessons(queryId)
      results.flashcards = await this.getFlashcards(queryId)
      results.quizzes = await this.getQuiz(queryId, 0)
    } catch (error) {
      throw new APIClientError('Failed to fetch content after status confirmed ready', 500)
    }

    if (onProgress) {
      onProgress('All content ready!')
    }

    return results
  }
}

// Export default instance
export default APIClient