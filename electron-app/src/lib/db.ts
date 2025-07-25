// Enhanced IndexedDB wrapper for offline storage
export interface Topic {
  id: string
  title: string
  category: string
  queryId?: string
  completedSteps: number[]
  createdAt: Date
  lastAccessed: Date
  totalLessons?: number
  isUserQuery?: boolean
}

export interface QuizResult {
  id: string
  topicId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  date: Date
  stepIndex?: number
}

export interface UserStats {
  totalTopicsExplored: number
  totalStepsCompleted: number
  totalQuizzesTaken: number
  averageQuizScore: number
  totalStudyTime: number
  streak: number
  lastStudyDate: string
}

export interface ExplanationData {
  id: string
  topic: string
  overview: string
  steps: any[]
  summary: string
  createdAt: Date
}

export interface Flashcard {
  id: string
  topicId: string
  question: string
  answer: string
  createdAt: Date
}

export interface Quiz {
  id: string
  topicId: string
  questions: any[]
  createdAt: Date
}

export interface SyncQueueItem {
  id: string
  type: 'explanation' | 'flashcard' | 'quiz' | 'topic'
  data: any
  timestamp: Date
  retryCount: number
}

class EnhancedOfflineDB {
  private dbName = "AIExplainerDB"
  private version = 2 // Increment for schema changes
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion

        // Topics store with enhanced indexing
        if (!db.objectStoreNames.contains("topics")) {
          const topicsStore = db.createObjectStore("topics", { keyPath: "id" })
          topicsStore.createIndex("title", "title", { unique: false })
          topicsStore.createIndex("category", "category", { unique: false })
          topicsStore.createIndex("lastAccessed", "lastAccessed", { unique: false })
          topicsStore.createIndex("createdAt", "createdAt", { unique: false })
          topicsStore.createIndex("queryId", "queryId", { unique: false })
          topicsStore.createIndex("isUserQuery", "isUserQuery", { unique: false })
        }

        // Quiz results store
        if (!db.objectStoreNames.contains("quizResults")) {
          const quizStore = db.createObjectStore("quizResults", { keyPath: "id" })
          quizStore.createIndex("topicId", "topicId", { unique: false })
          quizStore.createIndex("date", "date", { unique: false })
          quizStore.createIndex("score", "score", { unique: false })
        }

        // User stats store
        if (!db.objectStoreNames.contains("userStats")) {
          db.createObjectStore("userStats", { keyPath: "id" })
        }

        // Explanations store with enhanced indexing
        if (!db.objectStoreNames.contains("explanations")) {
          const explanationsStore = db.createObjectStore("explanations", { keyPath: "id" })
          explanationsStore.createIndex("topic", "topic", { unique: false })
          explanationsStore.createIndex("createdAt", "createdAt", { unique: false })
        }

        // Flashcards store
        if (!db.objectStoreNames.contains("flashcards")) {
          const flashcardsStore = db.createObjectStore("flashcards", { keyPath: "id" })
          flashcardsStore.createIndex("topicId", "topicId", { unique: false })
          flashcardsStore.createIndex("createdAt", "createdAt", { unique: false })
        }

        // Quizzes store
        if (!db.objectStoreNames.contains("quizzes")) {
          const quizzesStore = db.createObjectStore("quizzes", { keyPath: "id" })
          quizzesStore.createIndex("topicId", "topicId", { unique: false })
          quizzesStore.createIndex("createdAt", "createdAt", { unique: false })
        }

        // Completed steps store
        if (!db.objectStoreNames.contains("completedSteps")) {
          const stepsStore = db.createObjectStore("completedSteps", { keyPath: "topicId" })
        }

        // Sync queue store (new in version 2)
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", { keyPath: "id" })
          syncStore.createIndex("type", "type", { unique: false })
          syncStore.createIndex("timestamp", "timestamp", { unique: false })
          syncStore.createIndex("retryCount", "retryCount", { unique: false })
        }

        // Add new indexes for version 2 upgrades
        if (oldVersion < 2) {
          // Add missing indexes to existing stores if upgrading from version 1
          if (db.objectStoreNames.contains("topics")) {
            const transaction = (event.target as IDBOpenDBRequest).transaction!
            const topicsStore = transaction.objectStore("topics")
            if (!topicsStore.indexNames.contains("lastAccessed")) {
              topicsStore.createIndex("lastAccessed", "lastAccessed", { unique: false })
            }
            if (!topicsStore.indexNames.contains("createdAt")) {
              topicsStore.createIndex("createdAt", "createdAt", { unique: false })
            }
            if (!topicsStore.indexNames.contains("queryId")) {
              topicsStore.createIndex("queryId", "queryId", { unique: false })
            }
            if (!topicsStore.indexNames.contains("isUserQuery")) {
              topicsStore.createIndex("isUserQuery", "isUserQuery", { unique: false })
            }
          }
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  async saveTopic(topic: Topic): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["topics"], "readwrite")
      const store = transaction.objectStore("topics")
      const request = store.put(topic)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getTopics(): Promise<Topic[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["topics"], "readonly")
      const store = transaction.objectStore("topics")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async getRecentTopics(limit = 10): Promise<Topic[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["topics"], "readonly")
      const store = transaction.objectStore("topics")
      const index = store.index("lastAccessed")
      const topics: Topic[] = []
      
      const request = index.openCursor(null, 'prev')
      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        
        if (cursor && topics.length < limit) {
          topics.push(cursor.value)
          cursor.continue()
        } else {
          resolve(topics)
        }
      }
    })
  }

  async getUserQueryTopics(): Promise<Topic[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["topics"], "readonly")
      const store = transaction.objectStore("topics")
      const index = store.index("isUserQuery")
      const request = index.getAll(IDBKeyRange.only(true))

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const topics = request.result || []
        // Sort by lastAccessed date (most recent first)
        topics.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
        resolve(topics)
      }
    })
  }

  async getTopicById(id: string): Promise<Topic | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["topics"], "readonly")
      const store = transaction.objectStore("topics")
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async getTopicByQueryId(queryId: string): Promise<Topic | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["topics"], "readonly")
      const store = transaction.objectStore("topics")
      const index = store.index("queryId")
      const request = index.get(queryId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async deleteTopic(id: string): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["topics", "explanations", "flashcards", "quizzes", "quizResults", "completedSteps"], "readwrite")
      
      // Delete the topic
      const topicsStore = transaction.objectStore("topics")
      topicsStore.delete(id)
      
      // Delete related explanations
      const explanationsStore = transaction.objectStore("explanations")
      const explanationsIndex = explanationsStore.index("topic")
      explanationsIndex.openCursor().onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          if (cursor.value.id === id) {
            cursor.delete()
          }
          cursor.continue()
        }
      }
      
      // Delete related flashcards
      const flashcardsStore = transaction.objectStore("flashcards")
      const flashcardsIndex = flashcardsStore.index("topicId")
      flashcardsIndex.openCursor().onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          if (cursor.value.topicId === id) {
            cursor.delete()
          }
          cursor.continue()
        }
      }
      
      // Delete related quizzes
      const quizzesStore = transaction.objectStore("quizzes")
      const quizzesIndex = quizzesStore.index("topicId")
      quizzesIndex.openCursor().onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          if (cursor.value.topicId === id) {
            cursor.delete()
          }
          cursor.continue()
        }
      }
      
      // Delete related quiz results
      const quizResultsStore = transaction.objectStore("quizResults")
      const quizResultsIndex = quizResultsStore.index("topicId")
      quizResultsIndex.openCursor().onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          if (cursor.value.topicId === id) {
            cursor.delete()
          }
          cursor.continue()
        }
      }
      
      // Delete completed steps
      const stepsStore = transaction.objectStore("completedSteps")
      stepsStore.delete(id)
      
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  async deleteTopicByQueryId(queryId: string): Promise<void> {
    const topic = await this.getTopicByQueryId(queryId)
    if (topic) {
      await this.deleteTopic(topic.id)
    }
  }

  async saveQuizResult(result: QuizResult): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["quizResults"], "readwrite")
      const store = transaction.objectStore("quizResults")
      const request = store.put(result)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getQuizResults(): Promise<QuizResult[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["quizResults"], "readonly")
      const store = transaction.objectStore("quizResults")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async saveUserStats(stats: UserStats): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["userStats"], "readwrite")
      const store = transaction.objectStore("userStats")
      const request = store.put({ ...stats, id: "main" })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getUserStats(): Promise<UserStats | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["userStats"], "readonly")
      const store = transaction.objectStore("userStats")
      const request = store.get("main")

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async saveExplanation(explanation: ExplanationData): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["explanations"], "readwrite")
      const store = transaction.objectStore("explanations")
      const request = store.put(explanation)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getAllExplanations(): Promise<ExplanationData[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["explanations"], "readonly")
      const store = transaction.objectStore("explanations")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async getAllFlashcards(): Promise<Flashcard[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["flashcards"], "readonly")
      const store = transaction.objectStore("flashcards")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async getAllQuizzes(): Promise<Quiz[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["quizzes"], "readonly")
      const store = transaction.objectStore("quizzes")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async getExplanation(topic: string): Promise<ExplanationData | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["explanations"], "readonly")
      const store = transaction.objectStore("explanations")
      const index = store.index("topic")
      const request = index.get(topic)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async saveCompletedSteps(topicId: string, steps: number[]): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["completedSteps"], "readwrite")
      const store = transaction.objectStore("completedSteps")
      const request = store.put({ topicId, steps })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getCompletedSteps(topicId: string): Promise<number[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["completedSteps"], "readonly")
      const store = transaction.objectStore("completedSteps")
      const request = store.get(topicId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result?.steps || [])
    })
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        ["topics", "quizResults", "userStats", "explanations", "completedSteps", "flashcards", "quizzes", "syncQueue"],
        "readwrite",
      )

      const stores = ["topics", "quizResults", "userStats", "explanations", "completedSteps", "flashcards", "quizzes", "syncQueue"]
      let completed = 0

      const checkComplete = () => {
        completed++
        if (completed === stores.length) {
          resolve()
        }
      }

      stores.forEach((storeName) => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => checkComplete()
      })
    })
  }

  // Sync Queue Methods
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["syncQueue"], "readwrite")
      const store = transaction.objectStore("syncQueue")
      
      const syncItem: SyncQueueItem = {
        ...item,
        id: this.generateId(),
        timestamp: new Date(),
        retryCount: 0
      }
      
      const request = store.put(syncItem)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["syncQueue"], "readonly")
      const store = transaction.objectStore("syncQueue")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["syncQueue"], "readwrite")
      const store = transaction.objectStore("syncQueue")
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["syncQueue"], "readwrite")
      const store = transaction.objectStore("syncQueue")
      const request = store.put(item)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export const offlineDB = new EnhancedOfflineDB()
