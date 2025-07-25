import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '../lib/api-client'
import { ContentResponse, Lesson } from '../types/api'

interface LessonsState {
  loading: boolean
  error: string | null
  lessons: Lesson[]
  processingTime: number | null
}

interface UseLessonsReturn {
  state: LessonsState
  fetchLessons: (queryId: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

export function useLessons(): UseLessonsReturn {
  const [state, setState] = useState<LessonsState>({
    loading: false,
    error: null,
    lessons: [],
    processingTime: null,
  })

  const fetchLessons = useCallback(async (queryId: string) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }))

    try {
      const response: ContentResponse = await APIClient.getLessons(queryId)
      

      
      // Parse the lessons content
      const lessons: Lesson[] = Array.isArray(response.content) 
        ? response.content 
        : response.content?.lessons || []



      setState(prev => ({
        ...prev,
        loading: false,
        lessons,
        processingTime: response.processing_time || null,
      }))

    } catch (error) {
      let errorMessage = 'Failed to fetch lessons'
      

      
      if (error instanceof APIClientError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
    }
  }, [])

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
      lessons: [],
      processingTime: null,
    })
  }, [])

  return {
    state,
    fetchLessons,
    clearError,
    reset,
  }
}