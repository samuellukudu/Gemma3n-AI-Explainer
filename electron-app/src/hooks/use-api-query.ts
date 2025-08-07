import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '../lib/api-client'
import { QueryRequest, ContentResponse, ContentTaskType, TaskStatus } from '../types/api'
import { useTaskTracker } from './use-task-tracker'
import { offlineManager } from '../lib/offline-manager'

interface QueryState {
  loading: boolean
  error: string | null
  queryId: string | null
  lessons: ContentResponse | null
  relatedQuestions: ContentResponse | null
  progress: string | null
}

interface UseApiQueryReturn {
  state: QueryState
  taskTracker: ReturnType<typeof useTaskTracker>
  submitQuery: (query: string, userId?: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

export function useApiQuery(): UseApiQueryReturn {
  const [state, setState] = useState<QueryState>({
    loading: false,
    error: null,
    queryId: null,
    lessons: null,
    relatedQuestions: null,
    progress: null,
  })

  const taskTracker = useTaskTracker()

  const submitQuery = useCallback(async (query: string, userId?: string) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: 'Checking backend connection...',
    }))

    try {
      // Check if backend is reachable
      try {
        await APIClient.healthCheck()
      } catch (healthError) {
        setState(prev => ({
          ...prev,
          progress: 'Backend connection failed. Is the server running?',
        }))
        // Continue anyway in case health endpoint doesn't exist
      }

      const request: QueryRequest = {
        query,
        user_id: userId,
      }

      setState(prev => ({
        ...prev,
        progress: 'Submitting query to backend...',
      }))

      // Start task tracking immediately
      taskTracker.startTracking(`query-${Date.now()}`)

      console.log('Submitting query:', request)

      // Use the simplified method - backend handles query deduplication
      const result = await APIClient.submitQueryAndWait(request, (progress) => {
        setState(prev => ({
          ...prev,
          progress,
        }))
      })

      // Simulate task completion for UI feedback
      if (result.queryId) {
        // Mark lessons as completed
        setTimeout(() => {
          taskTracker.markTaskCompleted(ContentTaskType.LESSONS)
          
          // Start flashcards task
          setTimeout(() => {
            taskTracker.updateTaskProgress(ContentTaskType.FLASHCARDS, 10)
            
            // Complete flashcards
            setTimeout(() => {
              taskTracker.markTaskCompleted(ContentTaskType.FLASHCARDS)
              
              // Start quiz task
              setTimeout(() => {
                taskTracker.updateTaskProgress(ContentTaskType.QUIZ, 10)
                
                // Complete quiz
                setTimeout(() => {
                  taskTracker.markTaskCompleted(ContentTaskType.QUIZ)
                }, 1500)
              }, 1000)
            }, 1500)
          }, 1000)
        }, 1000)
      }

      // Save topic info for offline access (but no query mapping needed)
      if (result.queryId && result.lessons) {
        await offlineManager.saveTopicInfo(result.queryId, query, result.lessons.content?.length || 0)
        console.log('Saved topic info for query ID:', result.queryId)
      }

      setState(prev => ({
        ...prev,
        loading: false,
        queryId: result.queryId,
        lessons: result.lessons || null,
        relatedQuestions: null, // Will be fetched separately when needed
        progress: 'Query completed!',
      }))

    } catch (error) {

      
      let errorMessage = 'An unexpected error occurred'
      
      if (error instanceof APIClientError) {
        if (error.statusCode === 0) {
          errorMessage = `Connection failed: ${error.message}. Is the backend server running on the correct port?`
        } else {
          errorMessage = `Backend error (${error.statusCode}): ${error.message}`
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        progress: null,
      }))

      // Reset task tracker on error
      taskTracker.reset()
    }
  }, [taskTracker])

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      queryId: null,
      lessons: null,
      relatedQuestions: null,
      progress: null,
    })
    taskTracker.reset()
  }, [taskTracker])

  return {
    state,
    taskTracker,
    submitQuery,
    clearError,
    reset,
  }
}

// Hook for getting additional content by query ID
interface UseQueryContentReturn {
  loading: boolean
  error: string | null
  getFlashcards: (queryId: string, lessonIndex?: number) => Promise<ContentResponse | null>
  getQuiz: (queryId: string, lessonIndex?: number) => Promise<ContentResponse | null>
}

export function useQueryContent(): UseQueryContentReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getFlashcards = useCallback(async (queryId: string, lessonIndex?: number): Promise<ContentResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const flashcards = lessonIndex !== undefined 
        ? await APIClient.getFlashcardsByLesson(queryId, lessonIndex)
        : await APIClient.getFlashcards(queryId)
      setLoading(false)
      return flashcards
    } catch (error) {
      let errorMessage = 'Failed to get flashcards'
      
      if (error instanceof APIClientError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setError(errorMessage)
      setLoading(false)
      return null
    }
  }, [])

  const getQuiz = useCallback(async (queryId: string, lessonIndex: number = 0): Promise<ContentResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const quiz = await APIClient.getQuiz(queryId, lessonIndex)
      setLoading(false)
      return quiz
    } catch (error) {
      let errorMessage = 'Failed to get quiz'
      
      if (error instanceof APIClientError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setError(errorMessage)
      setLoading(false)
      return null
    }
  }, [])

  return {
    loading,
    error,
    getFlashcards,
    getQuiz,
  }
}