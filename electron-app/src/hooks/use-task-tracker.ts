import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  ContentGenerationTask, 
  TaskTrackerState, 
  ContentTaskType, 
  TaskStatus,
  ContentStatusResponse
} from '../types/api'
import APIClient from '../lib-web/api-client'

// Default task definitions with estimated durations
const DEFAULT_TASKS: Omit<ContentGenerationTask, 'id' | 'status' | 'progress' | 'startTime' | 'completedTime' | 'error'>[] = [
  {
    type: ContentTaskType.LESSONS,
    name: 'Generate Lessons',
    description: 'Creating comprehensive lessons with key concepts and examples',
    estimatedDuration: 45 // seconds
  },
  {
    type: ContentTaskType.FLASHCARDS,
    name: 'Create Flashcards',
    description: 'Generating flashcards from lesson content for active recall practice',
    estimatedDuration: 35
  },
  {
    type: ContentTaskType.QUIZ,
    name: 'Build Quiz Questions',
    description: 'Creating quiz questions based on flashcards to test comprehension',
    estimatedDuration: 40
  }
]

interface UseTaskTrackerReturn {
  state: TaskTrackerState
  startTracking: (queryId: string) => void
  updateTaskProgress: (taskType: ContentTaskType, progress: number) => void
  markTaskCompleted: (taskType: ContentTaskType) => void
  markTaskFailed: (taskType: ContentTaskType, error: string) => void
  reset: () => void
  getTaskByType: (type: ContentTaskType) => ContentGenerationTask | undefined
  getCompletedTasks: () => ContentGenerationTask[]
  getPendingTasks: () => ContentGenerationTask[]
  getFailedTasks: () => ContentGenerationTask[]
  pollContentStatus: () => void
}

export function useTaskTracker(): UseTaskTrackerReturn {
  const [state, setState] = useState<TaskTrackerState>({
    queryId: null,
    tasks: [],
    overallProgress: 0,
    isComplete: false,
    hasErrors: false,
  })

  // Initialize tasks for a new query
  const startTracking = useCallback((queryId: string) => {
    const now = new Date()
    const initialTasks: ContentGenerationTask[] = DEFAULT_TASKS.map((task, index) => ({
      ...task,
      id: `${queryId}-${task.type}`,
      status: TaskStatus.PENDING,
      progress: 0,
    }))

    setState({
      queryId,
      tasks: initialTasks,
      overallProgress: 0,
      isComplete: false,
      hasErrors: false,
      startTime: now,
    })

    // Only start lessons task initially (no dependencies)
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.type === ContentTaskType.LESSONS
          ? { ...task, status: TaskStatus.IN_PROGRESS, startTime: now }
          : task
      )
    }))
  }, [])

  // Update task progress  
  const updateTaskProgress = useCallback((taskType: ContentTaskType, progress: number) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.type === taskType
          ? { 
              ...task, 
              progress: Math.max(task.progress, progress),
              status: task.status === TaskStatus.PENDING ? TaskStatus.IN_PROGRESS : task.status,
              startTime: task.status === TaskStatus.PENDING ? new Date() : task.startTime
            }
          : task
      )
    }))
  }, [])

  // Mark task as completed
  const markTaskCompleted = useCallback((taskType: ContentTaskType) => {
    setState(prev => {
      const updatedTasks = prev.tasks.map(task =>
        task.type === taskType
          ? { 
              ...task, 
              status: TaskStatus.COMPLETED, 
              progress: 100, 
              completedTime: new Date(),
              startTime: task.startTime || new Date()
            }
          : task
      )
      
      const completedCount = updatedTasks.filter(t => t.status === TaskStatus.COMPLETED).length
      const overallProgress = (completedCount / updatedTasks.length) * 100
      const isComplete = completedCount === updatedTasks.length

      return {
        ...prev,
        tasks: updatedTasks,
        overallProgress,
        isComplete,
        completedTime: isComplete ? new Date() : prev.completedTime
      }
    })
  }, [])

  // Mark task as failed
  const markTaskFailed = useCallback((taskType: ContentTaskType, error: string) => {
    setState(prev => {
      const updatedTasks = prev.tasks.map(task =>
        task.type === taskType
          ? { ...task, status: TaskStatus.FAILED, error, completedTime: new Date() }
          : task
      )

      return {
        ...prev,
        tasks: updatedTasks,
        hasErrors: true,
      }
    })
  }, [])

  // Reset tracker
  const reset = useCallback(() => {
    setState({
      queryId: null,
      tasks: [],
      overallProgress: 0,
      isComplete: false,
      hasErrors: false,
    })
  }, [])

  // Utility functions
  const getTaskByType = useCallback((type: ContentTaskType): ContentGenerationTask | undefined => {
    return state.tasks.find(task => task.type === type)
  }, [state.tasks])

  const getCompletedTasks = useCallback((): ContentGenerationTask[] => {
    return state.tasks.filter(task => task.status === TaskStatus.COMPLETED)
  }, [state.tasks])

  const getPendingTasks = useCallback((): ContentGenerationTask[] => {
    return state.tasks.filter(task => task.status === TaskStatus.PENDING)
  }, [state.tasks])

  const getFailedTasks = useCallback((): ContentGenerationTask[] => {
    return state.tasks.filter(task => task.status === TaskStatus.FAILED)
  }, [state.tasks])

  // Poll content status and update tasks accordingly
  const pollContentStatus = useCallback(async () => {
    if (!state.queryId) return

    try {
      const contentStatus = await APIClient.getContentStatus(state.queryId)
      
      setState(prev => {
        const updatedTasks = prev.tasks.map(task => {
          // Check if dependencies are met for this task
          const isLessonsComplete = prev.tasks.find(t => t.type === ContentTaskType.LESSONS)?.status === TaskStatus.COMPLETED
          const isFlashcardsComplete = prev.tasks.find(t => t.type === ContentTaskType.FLASHCARDS)?.status === TaskStatus.COMPLETED
          
          switch (task.type) {
            case ContentTaskType.LESSONS:
              if (contentStatus.lessons_generated && task.status !== TaskStatus.COMPLETED) {
                return {
                  ...task,
                  status: TaskStatus.COMPLETED,
                  progress: 100,
                  completedTime: new Date()
                }
              }
              break
              
            case ContentTaskType.FLASHCARDS:
              // Only process flashcards if lessons are complete
              if (!isLessonsComplete) {
                return task // Keep current state if lessons aren't done
              }
              
              if (typeof contentStatus.flashcards_generated === 'boolean') {
                if (contentStatus.flashcards_generated && task.status !== TaskStatus.COMPLETED) {
                  return {
                    ...task,
                    status: TaskStatus.COMPLETED,
                    progress: 100,
                    completedTime: new Date()
                  }
                }
              } else {
                const flashcardEntries = Object.entries(contentStatus.flashcards_generated)
                const completedFlashcards = flashcardEntries.filter(([_, ready]) => ready).length
                const totalFlashcards = flashcardEntries.length
                const progress = totalFlashcards > 0 ? (completedFlashcards / totalFlashcards) * 100 : 0
                
                if (totalFlashcards > 0 && completedFlashcards === totalFlashcards && task.status !== TaskStatus.COMPLETED) {
                  return {
                    ...task,
                    status: TaskStatus.COMPLETED,
                    progress: 100,
                    completedTime: new Date()
                  }
                } else if (completedFlashcards > 0 && task.status === TaskStatus.PENDING) {
                  return {
                    ...task,
                    status: TaskStatus.IN_PROGRESS,
                    progress: Math.round(progress),
                    startTime: new Date()
                  }
                }
              }
              break
              
            case ContentTaskType.QUIZ:
              // Only process quizzes if flashcards are complete
              if (!isFlashcardsComplete) {
                return task // Keep current state if flashcards aren't done
              }
              
              if (typeof contentStatus.quizzes_generated === 'boolean') {
                if (contentStatus.quizzes_generated && task.status !== TaskStatus.COMPLETED) {
                  return {
                    ...task,
                    status: TaskStatus.COMPLETED,
                    progress: 100,
                    completedTime: new Date()
                  }
                }
              } else {
                const quizEntries = Object.entries(contentStatus.quizzes_generated)
                const completedQuizzes = quizEntries.filter(([_, ready]) => ready).length
                const totalQuizzes = quizEntries.length
                const progress = totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 0
                
                if (totalQuizzes > 0 && completedQuizzes === totalQuizzes && task.status !== TaskStatus.COMPLETED) {
                  return {
                    ...task,
                    status: TaskStatus.COMPLETED,
                    progress: 100,
                    completedTime: new Date()
                  }
                } else if (completedQuizzes > 0 && task.status === TaskStatus.PENDING) {
                  return {
                    ...task,
                    status: TaskStatus.IN_PROGRESS,
                    progress: Math.round(progress),
                    startTime: new Date()
                  }
                }
              }
              break
          }
          return task
        })
        
        // Start dependent tasks when their prerequisites are completed
        const finalTasks = updatedTasks.map(task => {
          if (task.status === TaskStatus.PENDING) {
            if (task.type === ContentTaskType.FLASHCARDS) {
              const lessonsComplete = updatedTasks.find(t => t.type === ContentTaskType.LESSONS)?.status === TaskStatus.COMPLETED
              if (lessonsComplete) {
                return { ...task, status: TaskStatus.IN_PROGRESS, startTime: new Date() }
              }
            } else if (task.type === ContentTaskType.QUIZ) {
              const flashcardsComplete = updatedTasks.find(t => t.type === ContentTaskType.FLASHCARDS)?.status === TaskStatus.COMPLETED
              if (flashcardsComplete) {
                return { ...task, status: TaskStatus.IN_PROGRESS, startTime: new Date() }
              }
            }
          }
          return task
        })
        
        const completedCount = finalTasks.filter(t => t.status === TaskStatus.COMPLETED).length
        const overallProgress = (completedCount / finalTasks.length) * 100
        const isComplete = completedCount === finalTasks.length
        
        return {
          ...prev,
          tasks: finalTasks,
          overallProgress,
          isComplete,
          completedTime: isComplete ? new Date() : prev.completedTime
        }
      })
    } catch (error) {
      console.error('Failed to poll content status:', error)
    }
  }, [state.queryId])

  // Update overall progress when tasks change
  useEffect(() => {
    if (state.tasks.length > 0) {
      const totalProgress = state.tasks.reduce((sum, task) => sum + task.progress, 0)
      const overallProgress = totalProgress / state.tasks.length
      
      setState(prev => ({
        ...prev,
        overallProgress
      }))
    }
  }, [state.tasks])

  return {
    state,
    startTracking,
    updateTaskProgress,
    markTaskCompleted,
    markTaskFailed,
    reset,
    getTaskByType,
    getCompletedTasks,
    getPendingTasks,
    getFailedTasks,
    pollContentStatus,
  }
}