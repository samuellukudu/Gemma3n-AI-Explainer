import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '../lib-web/api-client'
import { QueryRequest, ContentResponse, ContentTaskType, TaskStatus } from '../types/api'
import { useTaskTracker } from './use-task-tracker'
import { offlineManager } from '../lib/offline-manager'

interface QueryState {
  loading: boolean
  error: string | null
  queryId: string | null
  lessons: ContentResponse | null
  flashcards: ContentResponse | null
  quizzes: ContentResponse | null
  progress: string | null
  allContentReady: boolean
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
    flashcards: null,
    quizzes: null,
    progress: null,
    allContentReady: false,
  })

  const taskTracker = useTaskTracker()

  const submitQuery = useCallback(async (query: string, userId: string = 'user-001') => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: 'Submitting query...',
      allContentReady: false,
    }))

    try {
      const request: QueryRequest = {
        query,
        user_id: userId,
      }

      // Submit the initial query to get queryId
      const queryResponse = await APIClient.submitQuery(request)
      
      if (!queryResponse.success || !queryResponse.query_id) {
        throw new APIClientError('Query submission failed', 400)
      }

      const queryId = queryResponse.query_id
      
      // Start task tracking with the actual queryId
      taskTracker.startTracking(queryId)
      
      setState(prev => ({
        ...prev,
        queryId,
        progress: 'Content generation started...',
      }))

      // Use the improved polling mechanism
      const result = await APIClient.submitQueryAndWait(request, (message) => {
        setState(prev => ({
          ...prev,
          progress: message,
        }))
        
        // Update task tracker based on progress messages
        if (message.includes('Lessons ready')) {
          taskTracker.markTaskCompleted(ContentTaskType.LESSONS)
        }
        if (message.includes('Flashcards ready')) {
          taskTracker.markTaskCompleted(ContentTaskType.FLASHCARDS)
        }
        if (message.includes('Quizzes ready')) {
          taskTracker.markTaskCompleted(ContentTaskType.QUIZ)
        }
      })

      // Save topic info for offline access
      if (result.queryId && result.lessons) {
        await offlineManager.saveTopicInfo(result.queryId, query, result.lessons.content?.length || 0)
        console.log('Saved topic info for query ID:', result.queryId)
      }

      setState(prev => ({
        ...prev,
        loading: false,
        queryId: result.queryId,
        lessons: result.lessons || null,
        flashcards: result.flashcards || null,
        quizzes: result.quizzes || null,
        progress: 'All content generated successfully!',
        allContentReady: !!(result.lessons && result.flashcards && result.quizzes),
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
      flashcards: null,
      quizzes: null,
      progress: null,
      allContentReady: false,
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