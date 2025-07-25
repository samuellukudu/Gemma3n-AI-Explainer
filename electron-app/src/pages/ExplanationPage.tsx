import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { ArrowLeft, BookOpen, Brain, CheckCircle, BarChart3, AlertCircle } from "lucide-react"
import { Progress } from "../components/ui/progress"
import { Alert, AlertDescription } from "../components/ui/alert"
import Navbar from "../components/Navbar"
import { useApiQuery } from "../hooks/use-api-query"
import { useLessons } from "../hooks/use-lessons"
import { Lesson } from "../types/api"
import TaskTracker from "../components/TaskTracker"
import { offlineManager } from "../lib/offline-manager"

interface ExplanationPageProps {
  topic: string
  currentStepIndex: number
  isUserQuery?: boolean
  onBack: () => void
  onGenerateFlashcards: (explanation: any) => void
  onShowLibrary: () => void
  onShowExplore: () => void
  onStepNavigation: (stepIndex: number) => void
}

export default function ExplanationPage({
  topic = "Artificial Intelligence",
  currentStepIndex = 0,
  isUserQuery = true,
  onBack = () => {},
  onGenerateFlashcards = () => {},
  onShowLibrary = () => {},
  onShowExplore = () => {},
  onStepNavigation = () => {},
}: Partial<ExplanationPageProps>) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const { state: apiState, taskTracker, submitQuery, clearError } = useApiQuery()
  const { state: lessonsState, fetchLessons, clearError: clearLessonsError } = useLessons()

  const loadCompletedSteps = async () => {
    if (apiState.queryId) {
      try {
        const progress = await offlineManager.getLessonProgress(apiState.queryId)
        const completedStepIndices = Object.entries(progress)
          .filter(([_, data]) => data.completed)
          .map(([index]) => parseInt(index))
        setCompletedSteps(new Set(completedStepIndices))

      } catch (error) {

      }
    }
  }

  const generateExplanation = useCallback(async () => {
    // First, try to get lessons from API if we have a query ID
    if (apiState.queryId && !lessonsState.lessons.length && !lessonsState.loading) {
      try {
        await fetchLessons(apiState.queryId)
        return
      } catch (error) {

      }
    }

    // If no API data yet, try to submit a query
    if (!apiState.loading && !apiState.queryId && !apiState.error) {
      try {
        await submitQuery(topic, 'user-001') // Default user ID
        return
      } catch (error) {

      }
    }
  }, [topic, apiState, lessonsState, submitQuery, fetchLessons])

  useEffect(() => {
    generateExplanation()
  }, [generateExplanation])

  // Load completed steps when queryId changes
  useEffect(() => {
    loadCompletedSteps()
  }, [apiState.queryId])

  // Track lesson access when component mounts or step changes
  useEffect(() => {
    if (apiState.queryId && currentStepIndex !== undefined) {
      // Save lesson access progress (not completed, just accessed)

      offlineManager.saveLessonProgress(apiState.queryId, currentStepIndex, false)
      
      // Save topic info for later reference (only for user queries)
      if (lessonsState.lessons.length > 0 && isUserQuery) {

        offlineManager.saveTopicInfo(apiState.queryId, topic, lessonsState.lessons.length, isUserQuery)
      }
    }
  }, [apiState.queryId, currentStepIndex, topic, lessonsState.lessons.length, isUserQuery])

  // Watch for API state changes and fetch lessons (only for fresh queries)
  useEffect(() => {
    if (apiState.queryId && !lessonsState.lessons.length && !lessonsState.loading && !lessonsState.error) {
      // Only fetch if this is a fresh query (has recent activity)
      const isRecentQuery = apiState.loading || (apiState.progress && apiState.progress !== 'idle')
      if (isRecentQuery) {
        fetchLessons(apiState.queryId)
      }
    }
  }, [apiState.queryId, lessonsState.lessons.length, lessonsState.loading, lessonsState.error, fetchLessons, apiState.loading, apiState.progress])

  const handleNavigate = (page: string) => {
    switch (page) {
      case "home":
        onBack()
        break
      case "library":
        onShowLibrary()
        break
      case "explore":
        onShowExplore()
        break
      default:
        // Handle other navigation
        break
    }
  }



  const createFlashcardFromLesson = async (lesson: Lesson, stepIndex: number) => {
    // Mark this lesson as completed when user starts learning it
    if (apiState.queryId) {

      await offlineManager.saveLessonProgress(apiState.queryId, stepIndex, true)
      setCompletedSteps(prev => new Set([...prev, stepIndex]))
    }

    // Extract meaningful data for flashcard generation
    const explanation = {
      queryId: apiState.queryId,
      currentStepIndex: stepIndex,
      lesson: lesson,
      topic: topic,
      totalSteps: lessonsState.lessons.length
    }
    
    onGenerateFlashcards(explanation)
  }

  // Show task tracking during content generation
  if (apiState.loading || taskTracker.state.tasks.length > 0 && !taskTracker.state.isComplete) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 capitalize truncate">{topic}</h1>
                <p className="text-sm text-gray-600">Generating comprehensive learning content...</p>
              </div>
            </div>

            {/* Task Tracker - The main feature! */}
            <div className="flex justify-center">
              <TaskTracker
                tasks={taskTracker.state.tasks}
                overallProgress={taskTracker.state.overallProgress}
                isComplete={taskTracker.state.isComplete}
                hasErrors={taskTracker.state.hasErrors}
                startTime={taskTracker.state.startTime}
                completedTime={taskTracker.state.completedTime}
                className="mb-6"
              />
            </div>

            {/* Helpful information */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 text-indigo-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Creating Your Learning Experience
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Our AI is generating personalized lessons, flashcards, quizzes, and related questions 
                  to help you master "{topic}". You can see the progress above.
                </p>
                
                {/* Show current progress message if available */}
                {apiState.progress && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm font-medium">
                      {apiState.progress}
                    </p>
                  </div>
                )}

                {/* Task completion summary */}
                {taskTracker.state.tasks.length > 0 && (
                  <div className="mt-4 text-xs text-gray-500">
                    <p>
                      {taskTracker.getCompletedTasks().length} of {taskTracker.state.tasks.length} tasks completed
                    </p>
                    {taskTracker.state.hasErrors && (
                      <p className="text-red-600 mt-1">
                        Some tasks encountered issues, but we'll continue with available content.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if API failed and no lessons
  if ((apiState.error || lessonsState.error) && !lessonsState.lessons.length) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Error Loading Explanation</h1>
            </div>
            
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load lessons: {apiState.error || lessonsState.error}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button onClick={() => {
                clearError()
                clearLessonsError()
                taskTracker.reset()
                generateExplanation()
              }}>
                Try Again
              </Button>
              <Button variant="outline" onClick={onBack}>
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!lessonsState.lessons.length) return null

  const currentLesson = lessonsState.lessons[currentStepIndex]
  const isLastStep = currentStepIndex >= lessonsState.lessons.length - 1

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar 
        currentPage="explanation" 
        isOnline={true} 
        onNavigate={handleNavigate}
      />

      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onBack} className="h-9 w-9 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 capitalize">{topic}</h1>
              <p className="text-sm text-gray-600">
                Lesson {currentStepIndex + 1} of {lessonsState.lessons.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-gray-500">Progress</div>
              <div className="text-sm font-medium">{currentStepIndex + 1}/{lessonsState.lessons.length}</div>
            </div>
            <Progress value={((currentStepIndex + 1) / lessonsState.lessons.length) * 100} className="w-24 h-2" />
            <Button variant="outline" onClick={onShowLibrary} className="h-9 w-9 p-0">
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content - Horizontal Split */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Left Side - Lesson Navigation */}
          <div className="w-80 bg-white/50 backdrop-blur-sm border-r p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">All Lessons</h3>
            <div className="space-y-2">
              {lessonsState.lessons.map((lesson, index) => (
                <div
                  key={index}
                  onClick={() => onStepNavigation(index)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    index === currentStepIndex
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : completedSteps.has(index)
                        ? "border-green-300 bg-green-50 hover:bg-green-100"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge 
                      variant={index === currentStepIndex ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {index + 1}
                    </Badge>
                    {completedSteps.has(index) && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {index === currentStepIndex && <Badge className="text-xs bg-indigo-600">Current</Badge>}
                  </div>
                  <h4 className="font-medium text-sm text-gray-900 mb-1">{lesson.title}</h4>
                  <p className="text-xs text-gray-600 line-clamp-2">{lesson.overview}</p>
                </div>
              ))}
            </div>

            {/* Summary at bottom */}
            {isLastStep && lessonsState.processingTime && (
              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">🎉 Congratulations!</h4>
                <p className="text-sm text-blue-800">
                  You've completed all {lessonsState.lessons.length} lessons about {topic}!
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Generated in {lessonsState.processingTime.toFixed(2)} seconds
                </p>
              </div>
            )}
          </div>

          {/* Right Side - Current Lesson */}
          <div className="flex-1 p-6 overflow-y-auto">
            {currentLesson && (
              <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="default" className="text-sm px-3 py-1">
                      Lesson {currentStepIndex + 1}
                    </Badge>
                    {completedSteps.has(currentStepIndex) && (
                      <Badge variant="secondary" className="text-sm px-3 py-1 bg-green-100 text-green-800">
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{currentLesson.title}</h2>
                  <p className="text-gray-700 leading-relaxed mb-6">{currentLesson.overview}</p>
                </div>

                {/* Key Concepts */}
                {currentLesson.key_concepts.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                    <h3 className="text-indigo-900 font-semibold mb-3 flex items-center">
                      🔑 <span className="ml-2">Key Concepts</span>
                    </h3>
                    <ul className="space-y-2">
                      {currentLesson.key_concepts.map((concept: string, idx: number) => (
                        <li key={idx} className="flex items-start text-indigo-800">
                          <span className="w-2 h-2 bg-indigo-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span>{concept}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Examples */}
                {currentLesson.examples.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="text-green-900 font-semibold mb-3 flex items-center">
                      💡 <span className="ml-2">Examples</span>
                    </h3>
                    <ul className="space-y-2">
                      {currentLesson.examples.map((example: string, idx: number) => (
                        <li key={idx} className="flex items-start text-green-800">
                          <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={() => createFlashcardFromLesson(currentLesson, currentStepIndex)}
                  className="w-full h-12 text-base font-medium"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  Start Learning This Lesson
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}