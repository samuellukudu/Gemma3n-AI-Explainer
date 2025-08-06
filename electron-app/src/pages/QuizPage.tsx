import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Trophy, ArrowRight, BarChart3, AlertCircle } from "lucide-react"
import { Progress } from "../components/ui/progress"
import { Alert, AlertDescription } from "../components/ui/alert"
import Navbar from "../components/Navbar"
import { useQuiz } from "../hooks/use-quiz"
import { TrueFalseQuestion, MultipleChoiceQuestion } from "../types/api"
import { offlineManager } from "../lib/offline-manager"

interface QuizPageProps {
  flashcards?: any[] // Legacy prop, not used with API
  onBack?: () => void
  onReturnHome?: () => void
  onNextStep?: () => void
  explanation?: any // Contains lesson data and query info
  onShowLibrary?: () => void
}

interface QuizResult {
  questionIndex: number
  questionType: string
  userAnswer: string | number | boolean
  correct: boolean
  explanation: string
}

export default function QuizPage({
  flashcards = [],
  onBack = () => {},
  onReturnHome = () => {},
  onNextStep = () => {},
  explanation = {},
  onShowLibrary = () => {},
}: QuizPageProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | boolean>("")
  const [results, setResults] = useState<QuizResult[]>([])
  const [showResult, setShowResult] = useState(false)
  const [quizComplete, setQuizComplete] = useState(false)
  const { state: quizState, fetchQuiz, clearError, getAllQuestions, getTotalQuestions } = useQuiz()

  useEffect(() => {
    loadQuiz()
  }, [explanation])

  const loadQuiz = async () => {
    // Extract query ID and lesson index from explanation object
    const queryId = explanation?.queryId || 
                   'b61c880c-817c-4345-8384-96e6993ab8ab' // fallback for testing
    
    const lessonIndex = explanation?.currentStepIndex ?? 0

    try {
      await fetchQuiz(queryId, lessonIndex)
    } catch (error) {

    }
  }

  const handleNavigate = (page: string) => {
    switch (page) {
      case "home":
        onReturnHome()
        break
      case "library":
        onShowLibrary()
        break
      default:
        // Handle other navigation
        break
    }
  }

  const handleAnswerSubmit = () => {
    if (selectedAnswer === "" || !quizState.quiz) return

    const allQuestions = getAllQuestions()
    const currentQ = allQuestions[currentQuestion]
    
    let isCorrect = false
    
    if (currentQ.type === 'true_false') {
      const tfQuestion = currentQ.question as TrueFalseQuestion
      isCorrect = Boolean(selectedAnswer) === tfQuestion.correct_answer
    } else if (currentQ.type === 'multiple_choice') {
      const mcQuestion = currentQ.question as MultipleChoiceQuestion
      isCorrect = Number(selectedAnswer) === mcQuestion.correct_answer
    }

    const result: QuizResult = {
      questionIndex: currentQuestion,
      questionType: currentQ.type,
      userAnswer: selectedAnswer,
      correct: isCorrect,
      explanation: currentQ.question.explanation,
    }

    setResults((prev) => [...prev, result])
    setShowResult(true)
  }

  const handleNextQuestion = async () => {
    const totalQuestions = getTotalQuestions()
    
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1)
      setSelectedAnswer("")
      setShowResult(false)
    } else {
      setQuizComplete(true)
      
      // Mark lesson as completed when quiz is finished
      if (explanation?.queryId && explanation?.currentStepIndex !== undefined) {
        try {

          await offlineManager.saveLessonProgress(explanation.queryId, explanation.currentStepIndex, true)
          
          // Also save quiz results for stats
          const score = results.filter(r => r.correct).length
          const percentage = Math.round((score / totalQuestions) * 100)
          await offlineManager.saveQuizResult(explanation.queryId, percentage, totalQuestions, explanation.currentStepIndex)
        } catch (error) {

        }
      }
    }
  }

  const handleRetakeQuiz = () => {
    setCurrentQuestion(0)
    setSelectedAnswer("")
    setResults([])
    setShowResult(false)
    setQuizComplete(false)
  }

  if (quizState.loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <Trophy className="h-16 w-16 text-purple-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Quiz...</h2>
              <p className="text-gray-600">Fetching quiz for lesson {(explanation?.currentStepIndex ?? 0) + 1}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if API failed
  if (quizState.error && !quizState.quiz) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Error Loading Quiz</h1>
            </div>
            
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load quiz: {quizState.error}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button onClick={() => {
                clearError()
                loadQuiz()
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

  if (!quizState.quiz || getTotalQuestions() === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Quiz Available</h2>
              <p className="text-gray-600">No quiz found for this lesson.</p>
              <Button onClick={onBack} className="mt-4">Go Back</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const score = results.filter((r) => r.correct).length
  const totalQuestions = getTotalQuestions()
  const progress = ((currentQuestion + (showResult ? 1 : 0)) / totalQuestions) * 100
  const isStepMode = explanation?.currentStepIndex !== undefined
  const isLastStep = isStepMode && explanation?.currentStepIndex === explanation?.totalSteps - 1
  const allQuestions = getAllQuestions()
  const currentQ = allQuestions[currentQuestion]

  if (quizComplete) {
    const percentage = Math.round((score / totalQuestions) * 100)
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-3">
          <div className="max-w-4xl mx-auto py-4">
            {/* Header - Static at top */}
            <div className="flex items-center gap-3 mb-6">
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
                  {isStepMode ? `Step ${explanation.currentStepIndex + 1} Complete!` : "Quiz Complete!"}
                </h1>
                <p className="text-sm text-gray-600 truncate">
                  {isStepMode ? `Completed: ${explanation.lesson?.title || 'Lesson Content'}` : "Great job on completing the quiz!"}
                </p>
              </div>
            </div>

            <div className="text-center">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-6" />

              <Card className="max-w-xl mx-auto mb-6 shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-3">{percentage}%</div>
                  <p className="text-lg text-gray-700 mb-3">
                    You scored {score} out of {totalQuestions} correctly!
                  </p>

                  <div className="space-y-2 text-left">
                    {results.map((result, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                        {result.correct ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm text-gray-700">Question {index + 1}</span>
                        <Badge variant={result.correct ? "default" : "destructive"} className="ml-auto text-xs">
                          {result.correct ? "Correct" : "Incorrect"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={handleRetakeQuiz} 
                  variant="outline" 
                  className="h-12 px-6 text-base font-medium bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake Quiz
                </Button>

                {isStepMode && !isLastStep ? (
                  <Button 
                    onClick={onNextStep} 
                    className="h-12 px-6 text-base font-medium bg-purple-600 hover:bg-purple-700 shadow-lg"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Next Step
                  </Button>
                ) : (
                  <Button 
                    onClick={onReturnHome} 
                    className="h-12 px-6 text-base font-medium bg-purple-600 hover:bg-purple-700 shadow-lg"
                  >
                    {isLastStep ? "🎉 Complete Course!" : "New Topic"}
                  </Button>
                )}
              </div>
              
              {/* Processing time info */}
              {quizState.processingTime && (
                <p className="text-xs text-gray-500 mt-4">
                  Generated in {quizState.processingTime.toFixed(2)} seconds
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar 
        currentPage="lessons" 
        isOnline={true} 
        onNavigate={handleNavigate}
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-3">
        <div className="max-w-3xl mx-auto py-4">
          {/* Header - Static at top */}
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
                {isStepMode ? `Step ${explanation.currentStepIndex + 1} Quiz` : "Quiz Time!"}
              </h1>
              <p className="text-sm text-gray-600 truncate">
                {isStepMode ? `Testing: ${explanation.lesson?.title || 'Lesson Content'}` : "Test your knowledge"}
              </p>
            </div>
          </div>

          {/* Progress and Question Counter */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-700">Quiz Progress</span>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {currentQuestion + 1} / {totalQuestions}
              </Badge>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Question Card - Main Content */}
          <Card className="mb-6 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl leading-relaxed">{currentQ?.question.question}</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {currentQ?.type === "multiple_choice" && (
                <div className="space-y-3">
                  {(currentQ.question as MultipleChoiceQuestion).options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border-2 hover:bg-gray-50 hover:border-purple-200 transition-colors cursor-pointer" onClick={() => setSelectedAnswer(index)}>
                      <input
                        type="radio"
                        id={`option-${index}`}
                        name="mcq"
                        value={index}
                        checked={selectedAnswer === index}
                        onChange={() => setSelectedAnswer(index)}
                        className="w-4 h-4 text-purple-600"
                      />
                      <label htmlFor={`option-${index}`} className="text-base cursor-pointer flex-1">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {currentQ?.type === "true_false" && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border-2 hover:bg-gray-50 hover:border-purple-200 transition-colors cursor-pointer" onClick={() => setSelectedAnswer(true)}>
                    <input
                      type="radio"
                      id="true"
                      name="tf"
                      value="true"
                      checked={selectedAnswer === true}
                      onChange={() => setSelectedAnswer(true)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <label htmlFor="true" className="text-base cursor-pointer flex-1 font-medium">
                      True
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border-2 hover:bg-gray-50 hover:border-purple-200 transition-colors cursor-pointer" onClick={() => setSelectedAnswer(false)}>
                    <input
                      type="radio"
                      id="false"
                      name="tf"
                      value="false"
                      checked={selectedAnswer === false}
                      onChange={() => setSelectedAnswer(false)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <label htmlFor="false" className="text-base cursor-pointer flex-1 font-medium">
                      False
                    </label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result Display */}
          {showResult && (
            <Card
              className={`mb-6 shadow-lg ${results[results.length - 1]?.correct ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {results[results.length - 1]?.correct ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                  <h3 className="text-lg font-semibold">
                    {results[results.length - 1]?.correct ? "Correct!" : "Incorrect"}
                  </h3>
                </div>
                <p className="text-base text-gray-700 mb-3 leading-relaxed">{results[results.length - 1]?.explanation}</p>
                {!results[results.length - 1]?.correct && currentQ && (
                  <p className="text-base font-medium text-gray-900">
                    Correct answer: {
                      currentQ.type === 'true_false' 
                        ? ((currentQ.question as TrueFalseQuestion).correct_answer ? 'True' : 'False')
                        : ((currentQ.question as MultipleChoiceQuestion).options[(currentQ.question as MultipleChoiceQuestion).correct_answer])
                    }
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Button - Positioned closer to content */}
          <div className="text-center">
            {!showResult ? (
              <Button 
                onClick={handleAnswerSubmit} 
                disabled={selectedAnswer === ""} 
                className="h-12 px-8 text-base font-medium bg-purple-600 hover:bg-purple-700 shadow-lg" 
                size="lg"
              >
                Submit Answer
              </Button>
            ) : (
              <Button 
                onClick={handleNextQuestion} 
                className="h-12 px-8 text-base font-medium bg-purple-600 hover:bg-purple-700 shadow-lg" 
                size="lg"
              >
                {currentQuestion < totalQuestions - 1 ? "Next Question" : "Finish Quiz"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}