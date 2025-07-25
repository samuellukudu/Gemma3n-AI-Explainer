import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  ContentGenerationTask, 
  TaskTrackerState, 
  ContentTaskType, 
  TaskStatus
} from '../types/api'

// Default task definitions with estimated durations
const DEFAULT_TASKS: Omit<ContentGenerationTask, 'id' | 'status' | 'progress' | 'startTime' | 'completedTime' | 'error'>[] = [
  {
    type: ContentTaskType.LESSONS,
    name: 'Generate Lessons',
    description: 'Creating comprehensive lessons with key concepts and examples',
    estimatedDuration: 45 // seconds
  },
  {
    type: ContentTaskType.RELATED_QUESTIONS,
    name: 'Find Related Questions', 
    description: 'Discovering related questions to deepen understanding (runs concurrently)',
    estimatedDuration: 30
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

    // Start the first task immediately
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, index) => 
        index === 0 
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
  }
}