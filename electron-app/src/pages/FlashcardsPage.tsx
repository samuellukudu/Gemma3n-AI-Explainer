import React, { useState, useEffect } from "react"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Brain, BarChart3, AlertCircle } from "lucide-react"
import { Progress } from "../components/ui/progress"
import { Alert, AlertDescription } from "../components/ui/alert"
import Navbar from "../components/Navbar"
import { useFlashcards } from "../hooks/use-flashcards"
import { Flashcard } from "../types/api"

interface FlashcardsPageProps {
  explanation?: any
  onBack?: () => void
  onStartQuiz?: (flashcards: Flashcard[]) => void
  onShowLibrary?: () => void
}

export default function FlashcardsPage({ explanation = {}, onBack = () => {}, onStartQuiz = () => {}, onShowLibrary = () => {} }: FlashcardsPageProps) {
  const [currentCard, setCurrentCard] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set())
  const { state: flashcardsState, fetchFlashcards, clearError } = useFlashcards()

  useEffect(() => {
    loadFlashcards()
  }, [explanation])

  const loadFlashcards = async () => {
    // Extract query ID and lesson index from explanation object
    const queryId = explanation?.queryId || 
                   'b61c880c-817c-4345-8384-96e6993ab8ab' // fallback for testing
    
    const lessonIndex = explanation?.currentStepIndex ?? 0

    try {
      await fetchFlashcards(queryId, lessonIndex)
    } catch (error) {

    }
  }

  const handleNavigate = (page: string) => {
    switch (page) {
      case "home":
        onBack()
        break
      case "library":
        onShowLibrary()
        break
      default:
        // Handle other navigation
        break
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
    if (!isFlipped) {
      setStudiedCards((prev) => new Set([...prev, currentCard]))
    }
  }

  const handleNext = () => {
    const allCardsStudied = studiedCards.size === flashcardsState.flashcards.length && flashcardsState.flashcards.length > 0
    if (allCardsStudied) {
      onStartQuiz(flashcardsState.flashcards)
      return
    }
    setCurrentCard((prev) => (prev + 1) % flashcardsState.flashcards.length)
    setIsFlipped(false)
  }

  const handlePrevious = () => {
    setCurrentCard((prev) => (prev - 1 + flashcardsState.flashcards.length) % flashcardsState.flashcards.length)
    setIsFlipped(false)
  }



  if (flashcardsState.loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <Brain className="h-16 w-16 text-emerald-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Flashcards...</h2>
              <p className="text-gray-600">Fetching flashcards from lesson {(explanation?.currentStepIndex ?? 0) + 1}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if API failed
  if (flashcardsState.error && !flashcardsState.flashcards.length) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Error Loading Flashcards</h1>
            </div>
            
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load flashcards: {flashcardsState.error}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button onClick={() => {
                clearError()
                loadFlashcards()
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

  if (!flashcardsState.flashcards.length) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Flashcards Available</h2>
              <p className="text-gray-600">No flashcards found for this lesson.</p>
              <Button onClick={onBack} className="mt-4">Go Back</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const progress = (studiedCards.size / flashcardsState.flashcards.length) * 100
  const isStepMode = explanation.currentStepIndex !== undefined
  const allCardsStudied = studiedCards.size === flashcardsState.flashcards.length && flashcardsState.flashcards.length > 0
  const currentFlashcard = flashcardsState.flashcards[currentCard]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar 
        currentPage="lessons" 
        isOnline={true} 
        onNavigate={handleNavigate}
      />

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-3">
        <div className="max-w-4xl mx-auto h-screen flex flex-col">
          {/* Header - Compact */}
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={onShowLibrary}
              className="h-10 w-10 p-0 bg-transparent"
              title="View Library & Stats"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {isStepMode ? `Lesson ${explanation.currentStepIndex + 1} Flashcards` : "Flashcards"}
              </h1>
              <p className="text-sm text-gray-600 truncate">
                {isStepMode ? `Study: ${explanation.lesson?.title || 'Lesson Content'}` : "Study key concepts"}
              </p>
            </div>
          </div>

          {/* Progress Bars - Compact */}
          <div className="space-y-3 mb-4">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700">Study Progress</span>
                <span className="text-xs text-gray-600">
                  {studiedCards.size}/{flashcardsState.flashcards.length} studied
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </div>

          {/* Card Counter */}
          <div className="text-center mb-3">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Card {currentCard + 1} of {flashcardsState.flashcards.length}
            </Badge>
          </div>

          {/* Flashcard - Main Content */}
          <div className="flex-1 flex justify-center items-center mb-4">
            <div className="relative w-full max-w-2xl h-64 cursor-pointer perspective-1000" onClick={handleFlip}>
              <div
                className={`absolute inset-0 transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? "rotate-y-180" : ""}`}
              >
                {/* Front of card */}
                <Card className="absolute inset-0 backface-hidden bg-white shadow-xl hover:shadow-2xl transition-shadow">
                  <CardContent className="h-full flex flex-col justify-center items-center p-6 text-center">
                    <Badge className="mb-3 text-xs">Term</Badge>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3 leading-relaxed">
                      {currentFlashcard?.term}
                    </h2>
                    <p className="text-gray-500 text-sm">Click to reveal explanation</p>

                  </CardContent>
                </Card>

                {/* Back of card */}
                <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-emerald-50 shadow-xl">
                  <CardContent className="h-full flex flex-col justify-center items-center p-6 text-center">
                    <Badge variant="secondary" className="mb-3 text-xs">
                      Explanation
                    </Badge>
                    <p className="text-base text-gray-800 leading-relaxed mb-3">{currentFlashcard?.explanation}</p>
                    <p className="text-emerald-600 font-medium text-sm">Great! You've studied this card</p>

                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Navigation - Fixed at bottom */}
          <div className="flex justify-center gap-3 mb-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="h-10 px-4 bg-transparent text-sm"
              disabled={flashcardsState.flashcards.length <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <Button variant="outline" onClick={handleFlip} className="h-10 px-4 bg-transparent text-sm">
              <RotateCcw className="h-4 w-4 mr-1" />
              Flip
            </Button>

            <Button
              variant="outline"
              onClick={handleNext}
              className="h-10 px-4 bg-transparent text-sm"
              disabled={flashcardsState.flashcards.length <= 1}
            >
              {allCardsStudied ? (
                <>
                  <Brain className="h-4 w-4 mr-1" />
                  Quiz
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Study completion message - Compact */}
          <div className="text-center">
            {allCardsStudied ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-green-800 mb-1">🎉 All Cards Studied!</h3>
                <p className="text-xs text-green-700">Use the "Quiz" button above to test your knowledge.</p>
              </div>
            ) : (
              <p className="text-xs text-gray-600">Study all cards to unlock the quiz!</p>
            )}
            
            {/* Processing time info */}
            {flashcardsState.processingTime && (
              <p className="text-xs text-gray-500 mt-2">
                Generated in {flashcardsState.processingTime.toFixed(2)} seconds
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}