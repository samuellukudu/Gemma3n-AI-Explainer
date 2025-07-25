import { offlineDB, type Topic, type QuizResult, type UserStats, type ExplanationData } from "./db"

class EnhancedOfflineManager {
  private isOnline = true
  private initialized = false
  private syncInProgress = false

  constructor() {
    if (typeof window !== "undefined") {
      this.isOnline = navigator.onLine
      window.addEventListener("online", () => {
        this.isOnline = true
        this.handleOnline()
      })
      window.addEventListener("offline", () => {
        this.isOnline = false
        this.handleOffline()
      })
      
      // Initialize the database
      this.init()
    }
  }

  private async init() {
    if (this.initialized) return
    
    try {
      await offlineDB.init()
      this.initialized = true

    } catch (error) {

      // Continue without database - will fall back to localStorage only
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.init()
    }
  }

  private handleOnline() {

    // Here you could implement sync with a remote server
    this.showNotification("Back online! Data synced.", "success")
  }

  private handleOffline() {

    this.showNotification("You're offline. Don't worry, your progress is saved locally!", "info")
  }

  private showNotification(message: string, type: "success" | "info" | "warning") {
    // Simple notification system
    if (typeof window !== "undefined") {
      const notification = document.createElement("div")
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        background: ${type === "success" ? "#10b981" : type === "info" ? "#3b82f6" : "#f59e0b"};
      `
      notification.textContent = message
      document.body.appendChild(notification)

      setTimeout(() => {
        notification.remove()
      }, 4000)
    }
  }

  async saveTopicProgress(topic: string, category = "general", queryId?: string, totalLessons?: number): Promise<void> {
    await this.ensureInitialized()
    
    try {
      // Check if topic already exists
      let existingTopic: Topic | null = null
      if (queryId) {
        existingTopic = await offlineDB.getTopicByQueryId(queryId)
      }
      
      const topicData: Topic = {
        id: existingTopic?.id || this.generateId(),
        title: topic,
        category,
        queryId,
        completedSteps: existingTopic?.completedSteps || [],
        createdAt: existingTopic?.createdAt || new Date(),
        lastAccessed: new Date(),
        totalLessons,
        isUserQuery: this.isLikelyUserQuery(topic)
      }

      await offlineDB.saveTopic(topicData)

      // Also maintain localStorage for backward compatibility
      const recentTopics = await this.getRecentTopics()
      const updatedTopics = [topic, ...recentTopics.filter((t) => t !== topic)].slice(0, 10)
      localStorage.setItem("recentTopics", JSON.stringify(updatedTopics))
      
      // Store topic info in localStorage for quick access
      if (queryId) {
        localStorage.setItem(`topic_info_${queryId}`, JSON.stringify({
          topic,
          totalLessons: totalLessons || 0,
          createdAt: topicData.createdAt.toISOString()
        }))
      }
    } catch (error) {

      // Fallback to localStorage only
      const recentTopics = JSON.parse(localStorage.getItem("recentTopics") || "[]")
      const updatedTopics = [topic, ...recentTopics.filter((t: string) => t !== topic)].slice(0, 10)
      localStorage.setItem("recentTopics", JSON.stringify(updatedTopics))
    }
  }

  async getRecentTopics(): Promise<string[]> {
    try {
      const topics = await offlineDB.getTopics()
      return topics.map((t) => t.title)
    } catch (error) {

      // Fallback to localStorage
      return JSON.parse(localStorage.getItem("recentTopics") || "[]")
    }
  }

  async saveQuizResult(topic: string, score: number, totalQuestions: number, stepIndex?: number): Promise<void> {
    const result: QuizResult = {
      id: this.generateId(),
      topicId: topic,
      score,
      totalQuestions,
      correctAnswers: Math.round((score / 100) * totalQuestions),
      date: new Date(),
      stepIndex,
    }

    try {
      await offlineDB.saveQuizResult(result)
    } catch (error) {

    }

    // Also save to localStorage for backward compatibility
    const allResults = JSON.parse(localStorage.getItem("allQuizResults") || "[]")
    allResults.push({
      topic,
      score,
      totalQuestions,
      correctAnswers: result.correctAnswers,
      date: result.date.toISOString(),
      stepIndex,
    })
    localStorage.setItem("allQuizResults", JSON.stringify(allResults))

    await this.updateUserStats()
  }

  async updateUserStats(): Promise<void> {
    try {
      const topics = await offlineDB.getTopics()
      const quizResults = await offlineDB.getQuizResults()

      let totalStepsCompleted = 0
      for (const topic of topics) {
        const steps = await offlineDB.getCompletedSteps(topic.id)
        totalStepsCompleted += steps.length
      }

      const averageScore =
        quizResults.length > 0 ? quizResults.reduce((sum, result) => sum + result.score, 0) / quizResults.length : 0

      const stats: UserStats = {
        totalTopicsExplored: topics.length,
        totalStepsCompleted,
        totalQuizzesTaken: quizResults.length,
        averageQuizScore: Math.round(averageScore),
        totalStudyTime: quizResults.length * 5, // Estimate 5 minutes per quiz
        streak: this.calculateStreak(),
        lastStudyDate: new Date().toISOString(),
      }

      await offlineDB.saveUserStats(stats)

      // Also save to localStorage
      localStorage.setItem("userStats", JSON.stringify(stats))
    } catch (error) {

      // Fallback to localStorage calculation
      this.calculateStatsFromLocalStorage()
    }
  }

  private calculateStatsFromLocalStorage(): void {
    const recentTopics = JSON.parse(localStorage.getItem("recentTopics") || "[]")
    const allQuizResults = JSON.parse(localStorage.getItem("allQuizResults") || "[]")

    // Calculate total steps completed across all topics
    let totalStepsCompleted = 0
    recentTopics.forEach((topic: string) => {
      const completedSteps = JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
      totalStepsCompleted += completedSteps.length
    })

    // Calculate average quiz score
    const averageScore =
      allQuizResults.length > 0
        ? allQuizResults.reduce((sum: number, result: any) => sum + result.score, 0) / allQuizResults.length
        : 0

    const stats: UserStats = {
      totalTopicsExplored: recentTopics.length,
      totalStepsCompleted,
      totalQuizzesTaken: allQuizResults.length,
      averageQuizScore: Math.round(averageScore),
      totalStudyTime: allQuizResults.length * 5, // Estimate 5 minutes per quiz
      streak: this.calculateStreak(),
      lastStudyDate: new Date().toISOString(),
    }

    localStorage.setItem("userStats", JSON.stringify(stats))
  }

  async getUserStats(): Promise<UserStats> {
    try {
      const stats = await offlineDB.getUserStats()
      if (stats) return stats
    } catch (error) {

    }

    // Fallback to localStorage
    const fallbackStats = localStorage.getItem("userStats")
    if (fallbackStats) {
      return JSON.parse(fallbackStats)
    }

    // Default stats
    return {
      totalTopicsExplored: 0,
      totalStepsCompleted: 0,
      totalQuizzesTaken: 0,
      averageQuizScore: 0,
      totalStudyTime: 0,
      streak: 0,
      lastStudyDate: "",
    }
  }

  async saveCompletedSteps(topic: string, stepIndex: number): Promise<void> {
    try {
      const currentSteps = await offlineDB.getCompletedSteps(topic)
      const newSteps = [...new Set([...currentSteps, stepIndex])]
      await offlineDB.saveCompletedSteps(topic, newSteps)

      // Also save to localStorage
      localStorage.setItem(`completedSteps_${topic}`, JSON.stringify(newSteps))
    } catch (error) {

      // Fallback to localStorage only
      const currentSteps = JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
      const newSteps = [...new Set([...currentSteps, stepIndex])]
      localStorage.setItem(`completedSteps_${topic}`, JSON.stringify(newSteps))
    }
  }

  // New lesson-based progress tracking methods
  async saveLessonProgress(queryId: string, lessonIndex: number, completed: boolean = false): Promise<void> {
    try {
      const progressKey = `lesson_progress_${queryId}`
      const currentProgress = JSON.parse(localStorage.getItem(progressKey) || '{}')
      
      currentProgress[lessonIndex] = {
        completed,
        lastAccessed: new Date().toISOString(),
        completedAt: completed ? new Date().toISOString() : currentProgress[lessonIndex]?.completedAt
      }
      
      localStorage.setItem(progressKey, JSON.stringify(currentProgress))
      
      // Also save to IndexedDB if available
      await offlineDB.saveTopic({
        id: queryId,
        title: queryId, // Will be updated with actual topic when available
        category: 'lesson',
        completedSteps: Object.keys(currentProgress).filter(k => currentProgress[k].completed).map(Number),
        createdAt: new Date(),
        lastAccessed: new Date()
      })
    } catch (error) {

    }
  }

  async getLessonProgress(queryId: string): Promise<Record<number, { completed: boolean, lastAccessed: string, completedAt?: string }>> {
    try {
      const progressKey = `lesson_progress_${queryId}`
      return JSON.parse(localStorage.getItem(progressKey) || '{}')
    } catch (error) {

      return {}
    }
  }

  async getLastAccessedLesson(queryId: string): Promise<number> {
    try {
      const progress = await this.getLessonProgress(queryId)
      const accessedLessons = Object.entries(progress)
        .sort(([,a], [,b]) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
      
      if (accessedLessons.length === 0) return 0
      
      // Return the last accessed lesson index
      const lastAccessedIndex = parseInt(accessedLessons[0][0])
      
      // If the last accessed lesson is completed, start the next one
      if (progress[lastAccessedIndex]?.completed) {
        return lastAccessedIndex + 1
      }
      
      return lastAccessedIndex
    } catch (error) {

      return 0
    }
  }

  async saveTopicInfo(queryId: string, topic: string, totalLessons: number, isUserQuery: boolean = true): Promise<void> {
    try {
      // Only save if this is a user query, not an individual lesson step
      if (!isUserQuery) {
        return
      }
      
      const topicInfoKey = `topic_info_${queryId}`
      const topicInfo = {
        queryId,
        topic,
        totalLessons,
        isUserQuery,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem(topicInfoKey, JSON.stringify(topicInfo))
    } catch (error) {

    }
  }

  async getTopicInfo(queryId: string): Promise<{ queryId: string, topic: string, totalLessons: number, createdAt: string } | null> {
    try {
      const topicInfoKey = `topic_info_${queryId}`
      const info = localStorage.getItem(topicInfoKey)
      return info ? JSON.parse(info) : null
    } catch (error) {

      return null
    }
  }

  async getCompletedSteps(topic: string): Promise<number[]> {
    try {
      return await offlineDB.getCompletedSteps(topic)
    } catch (error) {
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
    }
  }

  async saveExplanation(topic: string, explanation: any): Promise<void> {
    const explanationData: ExplanationData = {
      id: this.generateId(),
      topic,
      overview: explanation.overview,
      steps: explanation.steps,
      summary: explanation.summary,
      createdAt: new Date(),
    }

    try {
      await offlineDB.saveExplanation(explanationData)
    } catch (error) {

    }
  }

  async getExplanation(topic: string): Promise<any | null> {
    try {
      return await offlineDB.getExplanation(topic)
    } catch (error) {

      return null
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await offlineDB.clearAllData()

      // Also clear localStorage
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (
          key.startsWith("completedSteps_") ||
          ["recentTopics", "userStats", "allQuizResults", "lastStudyDate"].includes(key)
        ) {
          localStorage.removeItem(key)
        }
      })

      this.showNotification("All data cleared successfully", "success")
    } catch (error) {

      this.showNotification("Error clearing data", "warning")
    }
  }

  private calculateStreak(): number {
    const lastStudyDate = localStorage.getItem("lastStudyDate")
    if (!lastStudyDate) return 1

    const today = new Date()
    const lastDate = new Date(lastStudyDate)
    const diffTime = Math.abs(today.getTime() - lastDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays <= 2 ? diffDays + 1 : 1
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private isLikelyUserQuery(topic: string): boolean {
    const questionStarters = [
      'how do', 'how does', 'how is', 'how are', 'how can', 'how will',
      'what is', 'what are', 'what does', 'what do',
      'why do', 'why does', 'why is', 'why are',
      'when do', 'when does', 'when is', 'when are',
      'where do', 'where does', 'where is', 'where are'
    ]
    
    const lowerTopic = topic.toLowerCase().trim()
    const startsWithQuestion = questionStarters.some(starter => lowerTopic.startsWith(starter))
    const endsWithQuestion = lowerTopic.endsWith('?')
    
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

   async deleteTopicByQueryId(queryId: string): Promise<void> {
     await this.ensureInitialized()
     
     try {
       // Delete from IndexedDB
       await offlineDB.deleteTopicByQueryId(queryId)
       
       // Delete from localStorage
       localStorage.removeItem(`topic_info_${queryId}`)
       localStorage.removeItem(`lesson_progress_${queryId}`)
       
       // Update recent topics list
       const topicInfo = await this.getTopicInfo(queryId)
       if (topicInfo) {
         const recentTopics = await this.getRecentTopics()
         const updatedTopics = recentTopics.filter(t => t !== topicInfo.topic)
         localStorage.setItem("recentTopics", JSON.stringify(updatedTopics))
       }
     } catch (error) {
       console.error('Failed to delete topic:', error)
       // Fallback to localStorage only
       localStorage.removeItem(`topic_info_${queryId}`)
       localStorage.removeItem(`lesson_progress_${queryId}`)
     }
   }
 
   async getUserQueryTopics(): Promise<Topic[]> {
    await this.ensureInitialized()
    
    try {
      return await offlineDB.getUserQueryTopics()
    } catch (error) {
      // Fallback to localStorage
      const topics: Topic[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('topic_info_')) {
          const queryId = key.replace('topic_info_', '')
          const topicInfo = await this.getTopicInfo(queryId)
          if (topicInfo && this.isLikelyUserQuery(topicInfo.topic)) {
            topics.push({
              id: queryId,
              title: topicInfo.topic,
              category: 'general',
              queryId,
              completedSteps: [],
              createdAt: new Date(topicInfo.createdAt),
              lastAccessed: new Date(topicInfo.createdAt),
              totalLessons: topicInfo.totalLessons,
              isUserQuery: true
            })
          }
        }
      }
      return topics.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
    }
  }

  async syncPendingData(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return
    
    this.syncInProgress = true
    try {
      const syncQueue = await offlineDB.getSyncQueue()
      
      for (const item of syncQueue) {
        try {
          // Implement sync logic based on item type
          await this.syncItem(item)
          await offlineDB.removeSyncQueueItem(item.id)
        } catch (error) {
          // Increment retry count
          item.retryCount++
          if (item.retryCount < 3) {
            await offlineDB.updateSyncQueueItem(item)
          } else {
            // Remove after 3 failed attempts
            await offlineDB.removeSyncQueueItem(item.id)
          }
        }
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  private async syncItem(item: any): Promise<void> {
    // Implement actual sync logic here
    // This would typically involve API calls to your backend
    console.log('Syncing item:', item)
  }

  getConnectionStatus(): boolean {
    return this.isOnline
  }
}

export const offlineManager = new EnhancedOfflineManager()
export { EnhancedOfflineManager }
