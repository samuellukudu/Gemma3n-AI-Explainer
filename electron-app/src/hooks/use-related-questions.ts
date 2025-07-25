import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '../lib/api-client'
import { ContentResponse, RelatedQuestion } from '../types/api'

interface RelatedQuestionsState {
  loading: boolean
  error: string | null
  questions: RelatedQuestion[]
  queryId: string | null
  createdAt: string | null
  processingTime: number | null
}

interface UseRelatedQuestionsReturn {
  state: RelatedQuestionsState
  fetchRelatedQuestions: (queryId: string) => Promise<void>
  clearError: () => void
  reset: () => void
  getQuestionsByCategory: (category: 'basic' | 'intermediate' | 'advanced') => RelatedQuestion[]
  getQuestionsByFocusArea: (focusArea: string) => RelatedQuestion[]
  getAllFocusAreas: () => string[]
}

export function useRelatedQuestions(): UseRelatedQuestionsReturn {
  const [state, setState] = useState<RelatedQuestionsState>({
    loading: false,
    error: null,
    questions: [],
    queryId: null,
    createdAt: null,
    processingTime: null,
  })

  const fetchRelatedQuestions = useCallback(async (queryId: string) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      queryId,
    }))

    try {
      const response: ContentResponse = await APIClient.getRelatedQuestions(queryId)
      
      // Validate that content is an array of questions
      if (!Array.isArray(response.content)) {
        throw new Error('Invalid response format: expected array of questions')
      }

      const questions: RelatedQuestion[] = response.content.map((item: any) => ({
        question: item.question || '',
        category: item.category || 'basic',
        focus_area: item.focus_area || 'General',
        relevance_score: item.relevance_score,
      }))

      setState(prev => ({
        ...prev,
        loading: false,
        questions,
        createdAt: response.created_at,
        processingTime: response.processing_time || null,
      }))

    } catch (error) {
      let errorMessage = 'Failed to fetch related questions'
      
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
      questions: [],
      queryId: null,
      createdAt: null,
      processingTime: null,
    })
  }, [])

  const getQuestionsByCategory = useCallback((category: 'basic' | 'intermediate' | 'advanced') => {
    return state.questions.filter(q => q.category === category)
  }, [state.questions])

  const getQuestionsByFocusArea = useCallback((focusArea: string) => {
    return state.questions.filter(q => q.focus_area === focusArea)
  }, [state.questions])

  const getAllFocusAreas = useCallback(() => {
    const focusAreas = new Set(state.questions.map(q => q.focus_area))
    return Array.from(focusAreas).sort()
  }, [state.questions])

  return {
    state,
    fetchRelatedQuestions,
    clearError,
    reset,
    getQuestionsByCategory,
    getQuestionsByFocusArea,
    getAllFocusAreas,
  }
}

// Hook for getting recent related questions
export function useRecentRelatedQuestions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentQuestions, setRecentQuestions] = useState<any[]>([])

  const fetchRecentQuestions = useCallback(async (limit: number = 20) => {
    setLoading(true)
    setError(null)

    try {
      const response = await APIClient.getRecentRelatedQuestions(limit)
      setRecentQuestions(response.items)
    } catch (error) {
      let errorMessage = 'Failed to fetch recent questions'
      
      if (error instanceof APIClientError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    recentQuestions,
    fetchRecentQuestions,
  }
} 