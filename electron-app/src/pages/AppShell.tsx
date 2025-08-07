import React, { useState, useCallback, useEffect } from "react"
import HomePage from "./HomePage"
import ExplanationPage from "./ExplanationPage"
import FlashcardsPage from "./FlashcardsPage"
import QuizPage from "./QuizPage"
import MyLibraryPage from "./MyLibraryPage"
import MyLessonsPage from "./MyLessonsPage"
import { useLessonProgress } from '../hooks/use-lesson-progress'
import { useApiQuery } from '../hooks/use-api-query'
import TaskTracker from '../components/TaskTracker'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

type AppState = "home" | "explanation" | "flashcards" | "quiz" | "library" | "lessons" | "generating"

export default function AppShell() {
  const [currentState, setCurrentState] = useState<AppState>("home")
  const [currentTopic, setCurrentTopic] = useState("")
  const [currentExplanation, setCurrentExplanation] = useState<any>(null)
  const [currentFlashcards, setCurrentFlashcards] = useState<any[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isUserQuery, setIsUserQuery] = useState(true)
  const { getLastAccessedLesson, lessonProgressList, markLessonAccessed } = useLessonProgress()
  const { state: apiState, taskTracker, submitQuery, clearError } = useApiQuery()

  const handleStartExploration = useCallback(async (topic: string, category?: string, fromLessonContinue: boolean = false) => {
    setCurrentTopic(topic)
    
    // Check if we have existing progress for this topic
    const existingLesson = lessonProgressList.find(lesson => lesson.topic === topic)
    if (existingLesson) {
      // Continue from where user left off
      const lastAccessedLesson = await getLastAccessedLesson(existingLesson.queryId)
      setCurrentStepIndex(lastAccessedLesson)
      setIsUserQuery(true) // Existing lessons are always user queries
      setCurrentState("explanation")
    } else {
      // Start from beginning for new topics
      setCurrentStepIndex(0)
      setIsUserQuery(!fromLessonContinue) // New topics are user queries unless continuing from lesson navigation
      
      // For new topics, start content generation
      setCurrentState("generating")
      try {
        await submitQuery(topic, 'user-001')
        // Navigation to explanation will happen in useEffect when allContentReady becomes true
      } catch (error) {
        console.error('Failed to generate content:', error)
        setCurrentState("home") // Go back to home on error
      }
    }
  }, [getLastAccessedLesson, lessonProgressList, submitQuery])

  const handleBackToHome = () => {
    setCurrentState("home")
    setCurrentTopic("")
    setCurrentExplanation(null)
    setCurrentFlashcards([])
    setCurrentStepIndex(0)
  }

  const handleShowLibrary = () => {
    setCurrentState("library")
  }


  const handleShowLessons = () => {
    setCurrentState("lessons")
  }

  const handleShowExplanation = useCallback(async () => {
    // If we already have a current topic, just navigate to explanation
    if (currentTopic) {
      setCurrentState("explanation")
      // Preserve the current explanation state when returning to explanation tab
      // Don't reset currentExplanation here to maintain queryId and lesson context
      return
    }
    
    // If no current topic, try to load the most recent lesson
    if (lessonProgressList.length > 0) {
      // Sort by creation date to get the most recent lesson
      const mostRecentLesson = lessonProgressList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
      
      // Load the most recent lesson
      await handleStartExploration(mostRecentLesson.topic, undefined, true)
    } else {
      // If no lessons exist, redirect to home to select a topic first
      setCurrentState("home")
    }
  }, [currentTopic, lessonProgressList, handleStartExploration])

  // Watch for when all content is ready and navigate to explanation
  useEffect(() => {
    if (apiState.allContentReady && currentState === "generating") {
      setCurrentExplanation({
        queryId: apiState.queryId,
        lessons: apiState.lessons,
        flashcards: apiState.flashcards,
        quizzes: apiState.quizzes
      })
      setCurrentState("explanation")
    }
  }, [apiState.allContentReady, apiState.queryId, apiState.lessons, apiState.flashcards, apiState.quizzes, currentState])

  const handleGenerateFlashcards = (explanation: any) => {
    setCurrentExplanation(explanation)
    setCurrentState("flashcards")
  }

  const handleStartQuiz = (flashcards: any[]) => {
    setCurrentFlashcards(flashcards)
    setCurrentState("quiz")
  }

  const handleBackToExplanation = () => {
    setCurrentState("explanation")
  }

  const handleBackToFlashcards = () => {
    setCurrentState("flashcards")
  }

  const handleNextStep = useCallback(async () => {
    const nextStepIndex = currentStepIndex + 1
    setCurrentStepIndex(nextStepIndex)
    
    // Always go to explanation state - the ExplanationPage will handle
    // whether to show content generation or existing lesson content
    setCurrentState("explanation")
    
    // Track lesson access for progress tracking
    const existingLesson = lessonProgressList.find(lesson => lesson.topic === currentTopic)
    if (existingLesson) {
      await markLessonAccessed(existingLesson.queryId, nextStepIndex)
    }
    
    // Don't clear currentExplanation to preserve queryId and lesson context
    // setCurrentExplanation(null)
    setCurrentFlashcards([])
  }, [currentStepIndex, currentTopic, lessonProgressList, markLessonAccessed])

  const handleStepNavigation = useCallback(async (stepIndex: number) => {
    setCurrentStepIndex(stepIndex)
    setCurrentState("explanation")
    setCurrentExplanation(null)
    setCurrentFlashcards([])
    
    // Track lesson access for progress tracking
    const existingLesson = lessonProgressList.find(lesson => lesson.topic === currentTopic)
    if (existingLesson) {
      await markLessonAccessed(existingLesson.queryId, stepIndex)
    }
  }, [currentTopic, lessonProgressList, markLessonAccessed])

  switch (currentState) {
    case "home":
      return (
        <HomePage
          onStartExploration={handleStartExploration}
          onShowLibrary={handleShowLibrary}
          onShowLessons={handleShowLessons}
          onShowExplanation={handleShowExplanation}
        />
      )

    case "generating":
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-center text-2xl font-bold text-gray-800">
                  Generating Content for "{currentTopic}"
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center text-gray-600">
                  {apiState.progress || 'Preparing to generate content...'}
                </div>
                <TaskTracker 
                   tasks={taskTracker.state.tasks}
                   overallProgress={taskTracker.state.overallProgress}
                   isComplete={taskTracker.state.isComplete}
                   hasErrors={taskTracker.state.hasErrors}
                   startTime={taskTracker.state.startTime}
                   completedTime={taskTracker.state.completedTime}
                 />
                {apiState.error && (
                  <div className="text-center">
                    <p className="text-red-600 mb-4">{apiState.error}</p>
                    <button 
                      onClick={() => {
                        clearError()
                        setCurrentState("home")
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Back to Home
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )


    case "library":
      return (
        <MyLibraryPage
          onBack={handleBackToHome}
          onStartExploration={handleStartExploration}
          onShowLessons={handleShowLessons}
          onShowExplanation={handleShowExplanation}
        />
      )

    case "lessons":
      return (
        <MyLessonsPage
          onBack={handleBackToHome}
          onStartExploration={handleStartExploration}
          onShowLibrary={handleShowLibrary}
          onShowExplanation={handleShowExplanation}
        />
      )

    case "explanation":
      return (
        <ExplanationPage
          topic={currentTopic}
          currentStepIndex={currentStepIndex}
          isUserQuery={isUserQuery}
          onBack={handleBackToHome}
          onGenerateFlashcards={handleGenerateFlashcards}
          onShowLibrary={handleShowLibrary}
          onShowLessons={handleShowLessons}
          onStepNavigation={handleStepNavigation}
          explanation={currentExplanation}
        />
      )

    case "flashcards":
      return (
        <FlashcardsPage
          explanation={currentExplanation}
          onBack={handleBackToExplanation}
          onStartQuiz={handleStartQuiz}
          onShowLibrary={handleShowLibrary}
        />
      )

    case "quiz":
      return (
        <QuizPage
          flashcards={currentFlashcards}
          onBack={handleBackToFlashcards}
          onReturnHome={handleBackToHome}
          onNextStep={handleNextStep}
          explanation={currentExplanation}
          onShowLibrary={handleShowLibrary}
        />
      )

    default:
      return <HomePage onStartExploration={handleStartExploration} />
  }
}