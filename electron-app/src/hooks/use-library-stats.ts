import { useState, useEffect, useCallback } from 'react'
import { useLessonProgress } from './use-lesson-progress'

interface LibraryStats {
  totalTopicsExplored: number
  totalStepsCompleted: number
  totalQuizzesTaken: number
  averageQuizScore: number
  totalStudyTime: number
  streak: number
  lastStudyDate: string
  recentQuizResults: Array<{
    topic: string
    score: number
    date: string
  }>
}

export function useLibraryStats() {
  const [stats, setStats] = useState<LibraryStats>({
    totalTopicsExplored: 0,
    totalStepsCompleted: 0,
    totalQuizzesTaken: 0,
    averageQuizScore: 0,
    totalStudyTime: 0,
    streak: 0,
    lastStudyDate: "",
    recentQuizResults: []
  })
  const [loading, setLoading] = useState(true)
  
  const { lessonProgressList } = useLessonProgress()

  const calculateStats = useCallback(async () => {
    try {
      setLoading(true)
      
      // Calculate topics explored from lesson progress
      const totalTopicsExplored = lessonProgressList.length
      
      // Calculate total steps completed from lesson progress
      const totalStepsCompleted = lessonProgressList.reduce((total, lesson) => {
        return total + lesson.completedLessons
      }, 0)
      
      // Get quiz results from localStorage (fallback) and IndexedDB
      let allQuizResults: any[] = []
      try {
        // Try to get from localStorage first
        const localQuizResults = JSON.parse(localStorage.getItem("allQuizResults") || "[]")
        allQuizResults = localQuizResults
      } catch (error) {

      }
      
      // Calculate quiz statistics
      const totalQuizzesTaken = allQuizResults.length
      const averageQuizScore = totalQuizzesTaken > 0 
        ? Math.round(allQuizResults.reduce((sum, result) => sum + result.score, 0) / totalQuizzesTaken)
        : 0
      
      // Get recent quiz results (last 5)
      const recentQuizResults = allQuizResults
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(result => ({
          topic: result.topic,
          score: result.score,
          date: new Date(result.date).toLocaleDateString()
        }))
      
      // Calculate study time (estimate based on completed steps)
      // Assume each step takes about 5 minutes on average
      const totalStudyTime = totalStepsCompleted * 5
      
      // Calculate streak (days with study activity)
      const lastStudyDate = localStorage.getItem("lastStudyDate") || ""
      const streak = calculateStreak(allQuizResults, lessonProgressList)
      
      setStats({
        totalTopicsExplored,
        totalStepsCompleted,
        totalQuizzesTaken,
        averageQuizScore,
        totalStudyTime,
        streak,
        lastStudyDate,
        recentQuizResults
      })
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }, [lessonProgressList])

  const calculateStreak = (quizResults: any[], progressList: any[]): number => {
    // Get all activity dates (quiz dates and lesson access dates)
    const activityDates = new Set<string>()
    
    // Add quiz dates
    quizResults.forEach(result => {
      const date = new Date(result.date).toDateString()
      activityDates.add(date)
    })
    
    // Add lesson access dates
    progressList.forEach(lesson => {
      const date = new Date(lesson.createdAt).toDateString()
      activityDates.add(date)
    })
    
    if (activityDates.size === 0) return 0
    
    // Sort dates and calculate consecutive days
    const sortedDates = Array.from(activityDates)
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime())
    
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i])
      currentDate.setHours(0, 0, 0, 0)
      
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      
      if (currentDate.getTime() === expectedDate.getTime()) {
        streak++
      } else {
        break
      }
    }
    
    return streak
  }

  const refreshStats = useCallback(async () => {
    await calculateStats()
  }, [calculateStats])

  // Calculate stats when lesson progress changes
  useEffect(() => {
    calculateStats()
  }, [calculateStats])

  const formatStudyTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return {
    stats,
    loading,
    refreshStats,
    formatStudyTime
  }
}