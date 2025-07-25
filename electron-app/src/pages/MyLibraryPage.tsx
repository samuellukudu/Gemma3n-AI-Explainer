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
  Clock,
  TrendingUp,
  Plus,
  BarChart3,
  Calendar,
  Award,
  Brain,
  Zap
} from 'lucide-react'
import { useLibraryStats } from '../hooks/use-library-stats'

interface MyLibraryPageProps {
  onBack: () => void
  onStartExploration: (topic: string) => void
  onShowExplore: () => void
  onShowLessons: () => void
  onShowExplanation: () => void
}

export default function MyLibraryPage({
  onBack,
  onStartExploration,
  onShowExplore,
  onShowLessons,
  onShowExplanation,
}: MyLibraryPageProps) {
  const { stats: userStats, loading, formatStudyTime } = useLibraryStats()

  const handleNavigate = (page: string) => {
    switch (page) {
      case "home":
        onBack()
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
        // Already on library
        break
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar 
        currentPage="library" 
        isOnline={true} 
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Library</h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Your learning progress and achievements</p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your stats...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Topics Explored</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.totalTopicsExplored}</div>
                  <p className="text-xs text-muted-foreground">Total subjects learned</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Steps Completed</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.totalStepsCompleted}</div>
                  <p className="text-xs text-muted-foreground">Learning milestones</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.totalQuizzesTaken}</div>
                  <p className="text-xs text-muted-foreground">Knowledge assessments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{userStats.averageQuizScore}%</div>
                  <p className="text-xs text-muted-foreground">Quiz performance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Study Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{formatStudyTime ? formatStudyTime(userStats.totalStudyTime) : `${userStats.totalStudyTime}m`}</div>
                  <p className="text-xs text-muted-foreground">Total learning time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{userStats.streak}</div>
                  <p className="text-xs text-muted-foreground">Days in a row</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Study</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{userStats.lastStudyDate ? new Date(userStats.lastStudyDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}</div>
                  <p className="text-xs text-muted-foreground">Most recent activity</p>
                </CardContent>
              </Card>

              {/* Progress Summary Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Learning Progress</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-lg font-semibold">
                      {userStats.totalTopicsExplored > 0 ? 
                        Math.round((userStats.totalStepsCompleted / (userStats.totalTopicsExplored * 3)) * 100) : 0}%
                    </div>
                    <Progress value={userStats.totalTopicsExplored > 0 ? 
                      Math.round((userStats.totalStepsCompleted / (userStats.totalTopicsExplored * 3)) * 100) : 0} className="h-2" />
                    <p className="text-xs text-muted-foreground">Overall completion</p>
                  </div>
                </CardContent>
              </Card>
            </div>




          </>
        )}
      </div>
    </div>
  )
}