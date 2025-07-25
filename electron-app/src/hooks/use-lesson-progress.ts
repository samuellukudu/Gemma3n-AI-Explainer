import { useState, useCallback, useEffect } from 'react'
import { offlineManager } from '../lib/offline-manager'

// Helper function to determine if a topic is likely a user query vs an individual lesson step
function isLikelyUserQuery(topic: string): boolean {
  // User queries typically:
  // - Start with "How do" or "How does" or "What is" etc.
  // - Are questions (end with ?)
  // - Are longer and more general
  
  const questionStarters = [
    'how do', 'how does', 'how is', 'how are', 'how can', 'how will',
    'what is', 'what are', 'what does', 'what do',
    'why do', 'why does', 'why is', 'why are',
    'when do', 'when does', 'when is', 'when are',
    'where do', 'where does', 'where is', 'where are'
  ]
  
  const lowerTopic = topic.toLowerCase().trim()
  
  // Check if it starts with common question words and ends with ?
  const startsWithQuestion = questionStarters.some(starter => lowerTopic.startsWith(starter))
  const endsWithQuestion = lowerTopic.endsWith('?')
  
  // Individual lesson steps are typically:
  // - Shorter phrases
  // - Don't start with question words
  // - Are more specific (e.g., "Introduction to X", "Basic concepts", etc.)
  const isLikelyLessonStep = (
    lowerTopic.startsWith('introduction to') ||
    lowerTopic.startsWith('basic') ||
    lowerTopic.startsWith('advanced') ||
    lowerTopic.startsWith('understanding') ||
    lowerTopic.includes('overview') ||
    lowerTopic.includes('fundamentals') ||
    (!startsWithQuestion && !endsWithQuestion && lowerTopic.length < 30)
  )
  
  return startsWithQuestion && endsWithQuestion && !isLikelyLessonStep
}

interface LessonProgressInfo {
  queryId: string
  topic: string
  totalLessons: number
  completedLessons: number
  lastAccessedLesson: number
  progress: number
  createdAt: string
}

interface UseLessonProgressReturn {
  lessonProgressList: LessonProgressInfo[]
  refreshProgress: () => Promise<void>
  getLessonProgress: (queryId: string) => Promise<LessonProgressInfo | null>
  getLastAccessedLesson: (queryId: string) => Promise<number>
  markLessonCompleted: (queryId: string, lessonIndex: number) => Promise<void>
  markLessonAccessed: (queryId: string, lessonIndex: number) => Promise<void>
  clearAllProgress: () => Promise<void>
  cleanupDuplicates: () => Promise<void>
  deleteLesson: (queryId: string) => Promise<void>
}

export function useLessonProgress(): UseLessonProgressReturn {
  const [lessonProgressList, setLessonProgressList] = useState<LessonProgressInfo[]>([])

  const refreshProgress = useCallback(async () => {
    try {
      // Get all lesson progress from localStorage
      const progressMap = new Map<string, LessonProgressInfo>()
      
      // Iterate through all localStorage keys to find lesson progress
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('topic_info_')) {
          const queryId = key.replace('topic_info_', '')
          const topicInfo = await offlineManager.getTopicInfo(queryId)
          
          if (topicInfo && isLikelyUserQuery(topicInfo.topic)) {
            const progress = await offlineManager.getLessonProgress(queryId)
            const completedLessons = Object.values(progress).filter(p => p.completed).length
            const lastAccessedLesson = await offlineManager.getLastAccessedLesson(queryId)
            
            const topicKey = topicInfo.topic.toLowerCase().trim()
            const existingEntry = progressMap.get(topicKey)
            
            if (existingEntry) {
              // Merge with existing entry - keep the most recent data
              const isMoreRecent = new Date(topicInfo.createdAt) > new Date(existingEntry.createdAt)
              if (isMoreRecent || completedLessons > existingEntry.completedLessons) {
                progressMap.set(topicKey, {
                  queryId: isMoreRecent ? queryId : existingEntry.queryId, // Use most recent query ID
                  topic: topicInfo.topic,
                  totalLessons: Math.max(topicInfo.totalLessons, existingEntry.totalLessons),
                  completedLessons: Math.max(completedLessons, existingEntry.completedLessons),
                  lastAccessedLesson: Math.max(lastAccessedLesson, existingEntry.lastAccessedLesson),
                  progress: Math.max(
                    (completedLessons / topicInfo.totalLessons) * 100,
                    existingEntry.progress
                  ),
                  createdAt: isMoreRecent ? topicInfo.createdAt : existingEntry.createdAt
                })
              }
            } else {
              // New entry
              progressMap.set(topicKey, {
                queryId,
                topic: topicInfo.topic,
                totalLessons: topicInfo.totalLessons,
                completedLessons,
                lastAccessedLesson,
                progress: (completedLessons / topicInfo.totalLessons) * 100,
                createdAt: topicInfo.createdAt
              })
            }
          }
        }
      }
      
      // Convert map to array and sort by creation date (most recent first)
      const progressList = Array.from(progressMap.values())
      progressList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      setLessonProgressList(progressList)
    } catch (error) {

    }
  }, [])

  const getLessonProgress = useCallback(async (queryId: string): Promise<LessonProgressInfo | null> => {
    try {
      const topicInfo = await offlineManager.getTopicInfo(queryId)
      if (!topicInfo) return null
      
      const progress = await offlineManager.getLessonProgress(queryId)
      const completedLessons = Object.values(progress).filter(p => p.completed).length
      const lastAccessedLesson = await offlineManager.getLastAccessedLesson(queryId)
      
      return {
        queryId,
        topic: topicInfo.topic,
        totalLessons: topicInfo.totalLessons,
        completedLessons,
        lastAccessedLesson,
        progress: (completedLessons / topicInfo.totalLessons) * 100,
        createdAt: topicInfo.createdAt
      }
    } catch (error) {

      return null
    }
  }, [])

  const getLastAccessedLesson = useCallback(async (queryId: string): Promise<number> => {
    return await offlineManager.getLastAccessedLesson(queryId)
  }, [])

  const markLessonCompleted = useCallback(async (queryId: string, lessonIndex: number) => {
    await offlineManager.saveLessonProgress(queryId, lessonIndex, true)
    await refreshProgress()
  }, [refreshProgress])

  const markLessonAccessed = useCallback(async (queryId: string, lessonIndex: number) => {
    await offlineManager.saveLessonProgress(queryId, lessonIndex, false)
    await refreshProgress()
  }, [refreshProgress])

  const clearAllProgress = useCallback(async () => {
    try {
      // Clear all lesson progress from localStorage
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('lesson_progress_') || key?.startsWith('topic_info_')) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      await refreshProgress()
    } catch (error) {

    }
  }, [refreshProgress])

  const deleteLesson = useCallback(async (queryId: string) => {
    try {
      await offlineManager.deleteTopicByQueryId(queryId)
      await refreshProgress()
    } catch (error) {
      console.error('Failed to delete lesson:', error)
      throw error // Re-throw to let the UI handle it
    }
  }, [refreshProgress])

  const cleanupDuplicates = useCallback(async () => {
    try {
      // Get all topic info entries
      const topicInfoEntries: Array<{key: string, queryId: string, topicInfo: any}> = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('topic_info_')) {
          const queryId = key.replace('topic_info_', '')
          const topicInfo = await offlineManager.getTopicInfo(queryId)
          if (topicInfo) {
            topicInfoEntries.push({ key, queryId, topicInfo })
          }
        }
      }
      
      // Group by topic name and keep only the most recent entry for each topic
      const topicGroups = new Map<string, Array<{key: string, queryId: string, topicInfo: any}>>()
      
      topicInfoEntries.forEach(entry => {
        // Only include likely user queries, not individual lesson steps
        if (isLikelyUserQuery(entry.topicInfo.topic)) {
          const topicKey = entry.topicInfo.topic.toLowerCase().trim()
          if (!topicGroups.has(topicKey)) {
            topicGroups.set(topicKey, [])
          }
          topicGroups.get(topicKey)!.push(entry)
        } else {
          // Remove entries that are likely individual lesson steps
          localStorage.removeItem(entry.key)
          localStorage.removeItem(`lesson_progress_${entry.queryId}`)
        }
      })
      
      // For each topic group, keep only the most recent entry
      topicGroups.forEach(entries => {
        if (entries.length > 1) {
          // Sort by creation date, keep the most recent
          entries.sort((a, b) => new Date(b.topicInfo.createdAt).getTime() - new Date(a.topicInfo.createdAt).getTime())
          
          // Remove all but the first (most recent) entry
          for (let i = 1; i < entries.length; i++) {
            const entryToRemove = entries[i]
            localStorage.removeItem(entryToRemove.key)
            localStorage.removeItem(`lesson_progress_${entryToRemove.queryId}`)
          }
        }
      })
      
      await refreshProgress()
    } catch (error) {

    }
  }, [refreshProgress])

  // Load progress on mount and cleanup duplicates
  useEffect(() => {
    const initializeProgress = async () => {
      await cleanupDuplicates() // This will also call refreshProgress
    }
    initializeProgress()
  }, [cleanupDuplicates])

  return {
    lessonProgressList,
    refreshProgress,
    getLessonProgress,
    getLastAccessedLesson,
    markLessonCompleted,
    markLessonAccessed,
    clearAllProgress,
    cleanupDuplicates,
    deleteLesson
  }
}