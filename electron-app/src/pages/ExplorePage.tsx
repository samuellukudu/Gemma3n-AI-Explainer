import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import Navbar from '../components/Navbar'
import { 
  BookOpen,
  Target,
  Brain,
  Lightbulb,
  Rocket
} from 'lucide-react'
import { useRelatedQuestions, useRecentRelatedQuestions } from '../hooks/use-related-questions'
import { useLessonProgress } from '../hooks/use-lesson-progress'

interface ExplorePageProps {
  onBack: () => void
  onStartExploration: (topic: string) => void
  onShowLibrary: () => void
  onShowLessons: () => void
  onShowExplanation: () => void
}

export default function ExplorePage({
  onBack,
  onStartExploration,
  onShowLibrary,
  onShowLessons,
  onShowExplanation,
}: ExplorePageProps) {
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const { state: relatedQuestionsState, fetchRelatedQuestions, clearError } = useRelatedQuestions()
  const { recentQuestions, fetchRecentQuestions } = useRecentRelatedQuestions()
  const { lessonProgressList } = useLessonProgress()

  // Note: Removed hardcoded recommendations to use API-based related questions only

  useEffect(() => {
    fetchRecentQuestions(10) // Load recent questions from API
  }, [])

  // Auto-load related questions for the most recent query when available
  useEffect(() => {
    if (lessonProgressList.length > 0 && !relatedQuestionsState.questions.length && !relatedQuestionsState.loading) {
      const mostRecentQueryId = lessonProgressList[0].queryId
      setSelectedQueryId(mostRecentQueryId)
      fetchRelatedQuestions(mostRecentQueryId)
    }
  }, [lessonProgressList, relatedQuestionsState.questions.length, relatedQuestionsState.loading, fetchRelatedQuestions])

  const handleTestRelatedQuestions = async () => {
    // Get the most recent query ID from lesson progress
    if (lessonProgressList.length > 0) {
      const mostRecentQueryId = lessonProgressList[0].queryId
      setSelectedQueryId(mostRecentQueryId)
      await fetchRelatedQuestions(mostRecentQueryId)
    } else {

    }
  }

  const categoryConfig = {
    basic: { 
      icon: Lightbulb, 
      color: "text-green-600 bg-green-50 border-green-200",
      title: "Basic Questions"
    },
    intermediate: { 
      icon: Brain, 
      color: "text-blue-600 bg-blue-50 border-blue-200",
      title: "Intermediate Questions"
    },
    advanced: { 
      icon: Rocket, 
      color: "text-purple-600 bg-purple-50 border-purple-200",
      title: "Advanced Questions"
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
      case "lessons":
        onShowLessons()
        break
      case "explanation":
        onShowExplanation()
        break
      default:
        // Already on explore
        break
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar 
        currentPage="explore" 
        isOnline={true} 
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Explore More Topics</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover related topics based on what you've already learned
          </p>
        </div>

        {/* Removed search section to focus on API-based related questions */}

        {/* AI-Generated Related Questions Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">AI-Generated Related Questions</h2>
            <Button 
              onClick={handleTestRelatedQuestions}
              variant="outline" 
              className="bg-transparent"
              disabled={relatedQuestionsState.loading || lessonProgressList.length === 0}
            >
              {relatedQuestionsState.loading ? 'Loading...' : 
               lessonProgressList.length === 0 ? 'No Recent Queries Available' : 
               'Load Related Questions'}
            </Button>
          </div>
          
          {relatedQuestionsState.loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading related questions...</p>
            </div>
          )}
          
          {relatedQuestionsState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">Error: {relatedQuestionsState.error}</p>
              <Button onClick={clearError} variant="outline" className="mt-2 bg-transparent">
                Try Again
              </Button>
            </div>
          )}
          
          {relatedQuestionsState.questions.length > 0 ? (
            <div className="space-y-6">
              {/* Questions by Category */}
              {['basic', 'intermediate', 'advanced'].map((category) => {
                const questionsInCategory = relatedQuestionsState.questions.filter(q => q.category === category)
                if (questionsInCategory.length === 0) return null
                
                const config = categoryConfig[category as keyof typeof categoryConfig]
                const IconComponent = config.icon
                
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <IconComponent className="h-5 w-5" />
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {config.title}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {questionsInCategory.map((question, index) => (
                        <Card
                          key={index}
                          className={`hover:shadow-md transition-shadow cursor-pointer group border-2 ${config.color}`}
                          onClick={() => onStartExploration(question.question)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors flex-1 pr-2">
                                {question.question}
                              </h4>
                              <Target className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 mt-1" />
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {question.focus_area || "Explore this topic to learn more"}
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs">
                                {category}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onStartExploration(question.question)
                                }}
                              >
                                Start Learning
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
              
              {relatedQuestionsState.processingTime && (
                <div className="text-center text-sm text-gray-500">
                  Generated in {relatedQuestionsState.processingTime.toFixed(2)} seconds
                </div>
              )}
            </div>
          ) : (
            !relatedQuestionsState.loading && !relatedQuestionsState.error && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <BookOpen className="h-16 w-16 mx-auto mb-4" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No related questions yet</h3>
                <p className="text-gray-600 mb-6">
                  {lessonProgressList.length === 0 
                    ? 'Complete a lesson first to see AI-generated related questions based on your learning topics.'
                    : 'Click "Load Related Questions" above to see AI-generated questions based on recent topics.'}
                </p>
                <Button onClick={onBack} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Start Learning
                </Button>
              </div>
            )
          )}
        </div>

        {/* Removed hardcoded recommendations and quick actions to focus on API-based content */}
      </div>
    </div>
  )
}