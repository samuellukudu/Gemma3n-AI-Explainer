import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '../lib/api-client'
import { ContentResponse, Quiz, TrueFalseQuestion, MultipleChoiceQuestion } from '../types/api'

interface QuizState {
  loading: boolean
  error: string | null
  quiz: Quiz | null
  queryId: string | null
  lessonIndex: number | null
  createdAt: string | null
  processingTime: number | null
}

interface UseQuizReturn {
  state: QuizState
  fetchQuiz: (queryId: string, lessonIndex: number) => Promise<void>
  clearError: () => void
  reset: () => void
  getAllQuestions: () => Array<{ type: 'true_false' | 'multiple_choice', question: TrueFalseQuestion | MultipleChoiceQuestion }>
  getTotalQuestions: () => number
}

export function useQuiz(): UseQuizReturn {
  const [state, setState] = useState<QuizState>({
    loading: false,
    error: null,
    quiz: null,
    queryId: null,
    lessonIndex: null,
    createdAt: null,
    processingTime: null,
  })

  const fetchQuiz = useCallback(async (queryId: string, lessonIndex: number) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      queryId,
      lessonIndex,
    }))

    try {
      const response: ContentResponse = await APIClient.getQuiz(queryId, lessonIndex)
      
      // Validate that content has the expected structure
      if (!response.content || typeof response.content !== 'object') {
        throw new Error('Invalid response format: expected quiz object')
      }

      const quizContent = response.content as any

      const quiz: Quiz = {
        true_false_questions: Array.isArray(quizContent.true_false_questions) 
          ? quizContent.true_false_questions.map((item: any) => ({
              question: item.question || 'Unknown question',
              correct_answer: Boolean(item.correct_answer),
              explanation: item.explanation || 'No explanation available',
            }))
          : [],
        multiple_choice_questions: Array.isArray(quizContent.multiple_choice_questions)
          ? quizContent.multiple_choice_questions.map((item: any) => ({
              question: item.question || 'Unknown question',
              options: Array.isArray(item.options) ? item.options : [],
              correct_answer: typeof item.correct_answer === 'number' ? item.correct_answer : 0,
              explanation: item.explanation || 'No explanation available',
            }))
          : [],
      }

      setState(prev => ({
        ...prev,
        loading: false,
        quiz,
        createdAt: response.created_at,
        processingTime: response.processing_time || null,
      }))

    } catch (error) {
      let errorMessage = 'Failed to fetch quiz'
      
      if (error instanceof APIClientError) {
        if (error.statusCode === 404) {
          errorMessage = 'Quiz not found. It may still be generating.'
        } else {
          errorMessage = error.message
        }
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
      quiz: null,
      queryId: null,
      lessonIndex: null,
      createdAt: null,
      processingTime: null,
    })
  }, [])

  const getAllQuestions = useCallback(() => {
    if (!state.quiz) return []
    
    const questions: Array<{ type: 'true_false' | 'multiple_choice', question: TrueFalseQuestion | MultipleChoiceQuestion }> = []
    
    // Add true/false questions
    state.quiz.true_false_questions.forEach(q => {
      questions.push({ type: 'true_false', question: q })
    })
    
    // Add multiple choice questions
    state.quiz.multiple_choice_questions.forEach(q => {
      questions.push({ type: 'multiple_choice', question: q })
    })
    
    return questions
  }, [state.quiz])

  const getTotalQuestions = useCallback(() => {
    if (!state.quiz) return 0
    return state.quiz.true_false_questions.length + state.quiz.multiple_choice_questions.length
  }, [state.quiz])

  return {
    state,
    fetchQuiz,
    clearError,
    reset,
    getAllQuestions,
    getTotalQuestions,
  }
} 