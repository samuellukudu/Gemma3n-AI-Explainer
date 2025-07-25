import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '../lib/api-client'
import { QueryRequest, ContentResponse, ContentTaskType, TaskStatus } from '../types/api'
import { useTaskTracker } from './use-task-tracker'

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
      // First check if backend is reachable
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



      // Use the original working method but with task tracker updates
      const result = await APIClient.submitQueryAndWait(request, (progress) => {

        setState(prev => ({
          ...prev,
          progress,
        }))

        // Update task tracker based on progress messages
        if (progress.includes('submitted')) {

          taskTracker.updateTaskProgress(ContentTaskType.LESSONS, 20)
          taskTracker.updateTaskProgress(ContentTaskType.RELATED_QUESTIONS, 10)
        } else if (progress.includes('Lessons ready')) {

          taskTracker.markTaskCompleted(ContentTaskType.LESSONS)
          taskTracker.updateTaskProgress(ContentTaskType.RELATED_QUESTIONS, 50)
          // Start flashcards generation now that lessons are ready
          taskTracker.updateTaskProgress(ContentTaskType.FLASHCARDS, 10)
        } else if (progress.includes('Related questions ready')) {

          taskTracker.markTaskCompleted(ContentTaskType.RELATED_QUESTIONS)
          // Continue with flashcards if lessons are also done
          const lessonsTask = taskTracker.getTaskByType(ContentTaskType.LESSONS)
          if (lessonsTask?.status === TaskStatus.COMPLETED) {
            taskTracker.updateTaskProgress(ContentTaskType.FLASHCARDS, 30)
          }
        } else if (progress.includes('may take longer')) {

          taskTracker.markTaskFailed(ContentTaskType.RELATED_QUESTIONS, 'Related questions are taking longer than expected')
          // Continue with flashcards if lessons are done
          const lessonsTask = taskTracker.getTaskByType(ContentTaskType.LESSONS)
          if (lessonsTask?.status === TaskStatus.COMPLETED) {
            taskTracker.updateTaskProgress(ContentTaskType.FLASHCARDS, 30)
          }
        }
      })



      // Check if related questions failed to load
      if (result.lessons && !result.relatedQuestions) {

        const relatedQuestionsTask = taskTracker.getTaskByType(ContentTaskType.RELATED_QUESTIONS)
        if (relatedQuestionsTask?.status !== TaskStatus.COMPLETED && relatedQuestionsTask?.status !== TaskStatus.FAILED) {
          taskTracker.markTaskFailed(ContentTaskType.RELATED_QUESTIONS, 'Related questions could not be generated')
        }
      }

      // Start flashcards generation since lessons are ready
      if (result.lessons) {

        taskTracker.updateTaskProgress(ContentTaskType.FLASHCARDS, 50)
        
        // Simulate flashcards generation progress
        setTimeout(() => {
          taskTracker.updateTaskProgress(ContentTaskType.FLASHCARDS, 80)
          setTimeout(() => {
            taskTracker.markTaskCompleted(ContentTaskType.FLASHCARDS)

            
            // Start quiz generation after flashcards

            taskTracker.updateTaskProgress(ContentTaskType.QUIZ, 30)
            setTimeout(() => {
              taskTracker.updateTaskProgress(ContentTaskType.QUIZ, 70)
              setTimeout(() => {
                taskTracker.markTaskCompleted(ContentTaskType.QUIZ)

              }, 1500)
            }, 1000)
          }, 2000)
        }, 1000)
      }

      setState(prev => ({
        ...prev,
        loading: false,
        queryId: result.queryId,
        lessons: result.lessons || null,
        relatedQuestions: result.relatedQuestions || null,
        progress: 'Content ready!',
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