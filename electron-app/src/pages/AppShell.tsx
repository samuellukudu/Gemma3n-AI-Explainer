import React, { useState, useCallback } from "react"
import HomePage from "./HomePage"
import ExplanationPage from "./ExplanationPage"
import FlashcardsPage from "./FlashcardsPage"
import QuizPage from "./QuizPage"
import ExplorePage from "./ExplorePage"
import MyLibraryPage from "./MyLibraryPage"
import MyLessonsPage from "./MyLessonsPage"
import { useLessonProgress } from '../hooks/use-lesson-progress'

type AppState = "home" | "explanation" | "flashcards" | "quiz" | "explore" | "library" | "lessons"

export default function AppShell() {
  const [currentState, setCurrentState] = useState<AppState>("home")
  const [currentTopic, setCurrentTopic] = useState("")
  const [currentExplanation, setCurrentExplanation] = useState<any>(null)
  const [currentFlashcards, setCurrentFlashcards] = useState<any[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isUserQuery, setIsUserQuery] = useState(true)
  const { getLastAccessedLesson, lessonProgressList, markLessonAccessed } = useLessonProgress()

  const handleStartExploration = useCallback(async (topic: string, category?: string, fromLessonContinue: boolean = false) => {
    setCurrentTopic(topic)
    
    // Check if we have existing progress for this topic
    const existingLesson = lessonProgressList.find(lesson => lesson.topic === topic)
    if (existingLesson) {
      // Continue from where user left off
      const lastAccessedLesson = await getLastAccessedLesson(existingLesson.queryId)
      setCurrentStepIndex(lastAccessedLesson)
      setIsUserQuery(true) // Existing lessons are always user queries
    } else {
      // Start from beginning for new topics
      setCurrentStepIndex(0)
      setIsUserQuery(!fromLessonContinue) // New topics are user queries unless continuing from lesson navigation
    }
    
    setCurrentState("explanation")
  }, [getLastAccessedLesson, lessonProgressList])

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

  const handleShowExplore = () => {
    setCurrentState("explore")
  }

  const handleShowLessons = () => {
    setCurrentState("lessons")
  }

  const handleShowExplanation = () => {
    // Only navigate to explanation if we have a current topic
    if (currentTopic) {
      setCurrentState("explanation")
    } else {
      // If no topic is set, redirect to home to select a topic first
      setCurrentState("home")
    }
  }

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
    setCurrentState("explanation")
    // Don't clear currentExplanation to preserve queryId and lesson context
    // setCurrentExplanation(null)
    setCurrentFlashcards([])
    
    // Track lesson access for progress tracking
    const existingLesson = lessonProgressList.find(lesson => lesson.topic === currentTopic)
    if (existingLesson) {
      await markLessonAccessed(existingLesson.queryId, nextStepIndex)
    }
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
          onShowExplore={handleShowExplore}
          onShowLessons={handleShowLessons}
          onShowExplanation={handleShowExplanation}
        />
      )

    case "explore":
      return (
        <ExplorePage
          onBack={handleBackToHome}
          onStartExploration={handleStartExploration}
          onShowLibrary={handleShowLibrary}
          onShowLessons={handleShowLessons}
          onShowExplanation={handleShowExplanation}
        />
      )

    case "library":
      return (
        <MyLibraryPage
          onBack={handleBackToHome}
          onStartExploration={handleStartExploration}
          onShowExplore={handleShowExplore}
          onShowLessons={handleShowLessons}
          onShowExplanation={handleShowExplanation}
        />
      )

    case "lessons":
      return (
        <MyLessonsPage
          onBack={handleBackToHome}
          onStartExploration={handleStartExploration}
          onShowExplore={handleShowExplore}
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
          onShowExplore={handleShowExplore}
          onStepNavigation={handleStepNavigation}
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