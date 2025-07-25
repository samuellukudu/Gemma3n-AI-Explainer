import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import Navbar from '../components/Navbar'
import {
  BookOpen,
  Trophy,
  Target,
  CheckCircle,
  Clock,
  BarChart3,
  Trash2
} from 'lucide-react'
import { useLessonProgress } from '../hooks/use-lesson-progress'
import { offlineManager } from '../lib/offline-manager'

interface MyLessonsPageProps {
  onBack: () => void
  onStartExploration: (topic: string) => void
  onShowExplore: () => void
  onShowLibrary: () => void
  onShowExplanation: () => void
}

export default function MyLessonsPage({
  onBack,
  onStartExploration,
  onShowExplore,
  onShowLibrary,
  onShowExplanation,
}: MyLessonsPageProps) {
  const { lessonProgressList, refreshProgress, clearAllProgress, deleteLesson } = useLessonProgress()

  const clearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all lesson progress? This cannot be undone.')) {
      try {
        await clearAllProgress()
        await offlineManager.clearAllData()
        
        // Clear localStorage items
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('lesson_progress_') || key.startsWith('topic_info_') || key === 'recentTopics')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        console.log('All lesson progress cleared')
      } catch (error) {
        console.error('Failed to clear lesson progress:', error)
      }
    }
  }

  const handleDeleteLesson = async (queryId: string, topic: string) => {
    if (window.confirm(`Are you sure you want to delete the lesson "${topic}"? This action cannot be undone.`)) {
      try {
        await deleteLesson(queryId)
        console.log('Lesson deleted successfully')
      } catch (error) {
        console.error('Failed to delete lesson:', error)
        alert('Failed to delete lesson. Please try again.')
      }
    }
  }

  const handleNavigate = (page: string) => {
    switch (page) {
      case "home":
        onBack()
        break
      case "explore":
        onShowExplore()
        break
      case "library":
        onShowLibrary()
        break
      case "explanation":
        onShowExplanation()
        break
      default:
        // Already on lessons
        break
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar 
        currentPage="lessons" 
        isOnline={true} 
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">My Lessons</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Continue your learning journey with your ongoing lessons
          </p>
        </div>

        {/* Lessons Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Continue Learning</h2>
            {lessonProgressList.length > 0 && (
              <Button variant="outline" onClick={clearHistory} className="text-sm bg-transparent">
                Clear All Lessons
              </Button>
            )}
          </div>

          {lessonProgressList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessonProgressList.map((lessonInfo, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-medium text-gray-900 flex-1 pr-2">{lessonInfo.topic}</h3>
                      <div className="flex items-center gap-2">
                        {lessonInfo.progress === 100 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <Trophy className="h-4 w-4" />
                            <span className="text-xs font-medium">Complete</span>
                          </div>
                        )}
                        <Button
                          onClick={() => handleDeleteLesson(lessonInfo.queryId, lessonInfo.topic)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Progress Section */}
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span className="font-medium">{lessonInfo.completedLessons}/{lessonInfo.totalLessons} steps</span>
                        </div>
                        <Progress value={lessonInfo.progress} className="h-2" />
                      </div>
                      
                      {/* Status and Continue Button */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-sm text-gray-500">
                            {lessonInfo.progress === 100 
                              ? 'All steps completed' 
                              : lessonInfo.lastAccessedLesson < lessonInfo.totalLessons 
                                ? `Next: Step ${lessonInfo.lastAccessedLesson + 1}`
                                : 'Ready to start'
                            }
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Last accessed: {new Date(lessonInfo.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <Button
                          onClick={() => onStartExploration(lessonInfo.topic)}
                          size="sm"
                          className="ml-4"
                          variant={lessonInfo.progress === 100 ? "outline" : "default"}
                        >
                          {lessonInfo.progress === 100 ? 'Review' : 'Continue'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-6">
                <BookOpen className="h-20 w-20 mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-3">No lessons yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start learning new topics to see your lessons here. Each topic becomes a lesson you can continue
                anytime.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={onBack} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Start New Lesson
                </Button>
                <Button onClick={onShowExplore} variant="outline" className="bg-transparent">
                  Explore Topics
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {lessonProgressList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Lesson Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{lessonProgressList.length}</div>
                  <p className="text-sm text-gray-600">Total Topics</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {lessonProgressList.filter(lesson => lesson.progress === 100).length}
                  </div>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {lessonProgressList.filter(lesson => lesson.progress > 0 && lesson.progress < 100).length}
                  </div>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={onShowExplore} variant="outline" className="h-16 flex flex-col gap-2 bg-transparent">
                  <Target className="h-6 w-6" />
                  <span>Explore Topics</span>
                </Button>
                <Button onClick={onShowLibrary} variant="outline" className="h-16 flex flex-col gap-2 bg-transparent">
                  <BarChart3 className="h-6 w-6" />
                  <span>View Stats</span>
                </Button>
                <Button onClick={onBack} variant="outline" className="h-16 flex flex-col gap-2 bg-transparent">
                  <BookOpen className="h-6 w-6" />
                  <span>Start New Topic</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}