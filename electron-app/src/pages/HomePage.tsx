import React, { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Plus, ChevronDown, ChevronUp, WifiOff } from "lucide-react"
import Navbar from "../components/Navbar"
import { offlineManager } from "../lib/offline-manager"


const categories = [
  {
    id: "tech",
    name: "Technology",
    subcategories: [
      "How do smartphones work?",
      "How does the internet work?",
      "How do electric cars work?",
      "How do solar panels work?",
      "How does GPS work?",
    ],
  },
  {
    id: "nature",
    name: "Nature & Science",
    subcategories: [
      "How do plants make oxygen?",
      "How do earthquakes happen?",
      "How does photosynthesis work?",
      "How do hurricanes form?",
      "How does the water cycle work?",
      "How do volcanoes erupt?",
    ],
  },
  {
    id: "food",
    name: "Food & Cooking",
    subcategories: [
      "How does bread rise?",
      "How does fermentation work?",
      "How do microwaves heat food?",
      "How does refrigeration work?",
      "How is cheese made?",
      "How does coffee brewing work?",
    ],
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    subcategories: [
      "How are cars manufactured?",
      "How is glass made?",
      "How does 3D printing work?",
      "How are computer chips made?",
      "How is paper made?",
      "How does injection molding work?",
    ],
  },
]

interface HomePageProps {
  onStartExploration?: (topic: string, category?: string) => void
  onShowLibrary?: () => void
  onShowExplore?: () => void
  onShowLessons?: () => void
  onShowExplanation?: () => void
}

export default function HomePage({
  onStartExploration = () => {},
  onShowLibrary = () => {},
  onShowExplore = () => {},
  onShowLessons = () => {},
  onShowExplanation = () => {},
}: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("")
  const [customTopic, setCustomTopic] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string>("")
  const [isOnline, setIsOnline] = useState(true)
  


  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)



    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleCategorySelect = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory("")
    } else {
      setExpandedCategory(categoryId)
      setSelectedCategory(categoryId)
      setSelectedSubcategory("")
      setShowCustomInput(false)
      setCustomTopic("")
    }
  }

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory)
    setSelectedCategory(expandedCategory)
  }

  const handleCustomSelect = () => {
    setSelectedCategory("")
    setSelectedSubcategory("")
    setExpandedCategory("")
    setShowCustomInput(true)
    setCustomTopic("")
  }

  const handleContinue = async () => {
    if (showCustomInput && customTopic.trim()) {
      try {
        await offlineManager.saveTopicProgress(customTopic.trim())
        onStartExploration(customTopic.trim())
      } catch (error) {
        onStartExploration(customTopic.trim())
      }
    } else if (selectedSubcategory) {
      try {
        await offlineManager.saveTopicProgress(selectedSubcategory, selectedCategory)
        onStartExploration(selectedSubcategory, selectedCategory)
      } catch (error) {
        onStartExploration(selectedSubcategory, selectedCategory)
      }
    }
  }

  const handleNavigate = (page: string) => {
    switch (page) {
      case "library":
        onShowLibrary()
        break
      case "explore":
        onShowExplore()
        break
      case "lessons":
        onShowLessons()
        break
      case "explanation":
        onShowExplanation()
        break
      default:
        // Already on home
        break
    }
  }

  const canContinue = (showCustomInput && customTopic.trim()) || selectedSubcategory

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar 
        currentPage="home" 
        isOnline={isOnline} 
        onNavigate={handleNavigate}
      />

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-orange-800">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">
              You're offline. Your progress is being saved locally and will sync when you're back online.
            </span>
          </div>
        </div>
      )}
      


      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">What do you want to learn about?</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Enter your own topic or choose from popular categories below to get started.
          </p>
        </div>

        {/* Custom Topic Section */}
        <div className="mb-8">
          {!showCustomInput ? (
            <div className="text-center mb-8">
              <Button
                variant="outline"
                onClick={handleCustomSelect}
                className="px-6 py-3 text-base font-medium rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-transparent"
              >
                <Plus className="h-5 w-5 mr-2" />
                Enter Custom Topic
              </Button>
            </div>
          ) : (
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Input
                  placeholder="e.g., How do solar panels work?"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="text-center text-lg h-14 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && canContinue) {
                      e.preventDefault()
                      handleContinue()
                    }
                  }}
                  autoFocus
                />
                {customTopic && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomTopic("")
                      setShowCustomInput(false)
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    ×
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                Be specific for better explanations (e.g., "How do electric cars work?" instead of just "cars")
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm font-medium">OR</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Popular Categories with Subcategories */}
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Popular Categories</h2>
          <div className="space-y-4 mb-8">
            {categories.map((category) => (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors p-4"
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-gray-900">{category.name}</CardTitle>
                    {expandedCategory === category.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </CardHeader>

                {expandedCategory === category.id && (
                  <CardContent className="pt-0 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.subcategories.map((subcategory, index) => (
                        <Button
                          key={index}
                          variant={selectedSubcategory === subcategory ? "default" : "ghost"}
                          onClick={() => handleSubcategorySelect(subcategory)}
                          className={`justify-start text-left h-auto py-3 px-4 ${
                            selectedSubcategory === subcategory
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {subcategory}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canContinue ? "Start Learning" : "Select a Topic"}
            </Button>
          </div>
        </div>
      </div>
      

    </div>
  )
}