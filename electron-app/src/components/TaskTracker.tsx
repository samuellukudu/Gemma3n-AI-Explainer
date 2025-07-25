import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { 
  CheckCircle, 
  Clock, 
  Loader2, 
  XCircle, 
  BookOpen, 
  HelpCircle, 
  CreditCard, 
  Target,
  Timer,
  TrendingUp
} from 'lucide-react'
import { ContentGenerationTask, ContentTaskType, TaskStatus } from '../types/api'

interface TaskTrackerProps {
  tasks: ContentGenerationTask[]
  overallProgress: number
  isComplete: boolean
  hasErrors: boolean
  startTime?: Date
  completedTime?: Date
  className?: string
}

// Task type to icon mapping
const TASK_ICONS = {
  [ContentTaskType.LESSONS]: BookOpen,
  [ContentTaskType.RELATED_QUESTIONS]: HelpCircle,
  [ContentTaskType.FLASHCARDS]: CreditCard,
  [ContentTaskType.QUIZ]: Target,
}

// Task dependencies - which tasks must complete before this one can start
const TASK_DEPENDENCIES = {
  [ContentTaskType.LESSONS]: [],
  [ContentTaskType.RELATED_QUESTIONS]: [],
  [ContentTaskType.FLASHCARDS]: [ContentTaskType.LESSONS],
  [ContentTaskType.QUIZ]: [ContentTaskType.FLASHCARDS],
}

// Status to color mapping
const STATUS_COLORS = {
  [TaskStatus.PENDING]: 'bg-gray-100 text-gray-600 border-gray-200',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700 border-blue-200',
  [TaskStatus.COMPLETED]: 'bg-green-100 text-green-700 border-green-200',
  [TaskStatus.FAILED]: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_BADGE_COLORS = {
  [TaskStatus.PENDING]: 'secondary',
  [TaskStatus.IN_PROGRESS]: 'default',
  [TaskStatus.COMPLETED]: 'secondary',
  [TaskStatus.FAILED]: 'destructive',
} as const

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function getElapsedTime(startTime?: Date): string {
  if (!startTime) return '0s'
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
  return formatDuration(elapsed)
}

function TaskItem({ task, allTasks }: { task: ContentGenerationTask; allTasks: ContentGenerationTask[] }) {
  const IconComponent = TASK_ICONS[task.type]
  const isInProgress = task.status === TaskStatus.IN_PROGRESS
  const isCompleted = task.status === TaskStatus.COMPLETED
  const isFailed = task.status === TaskStatus.FAILED
  const isPending = task.status === TaskStatus.PENDING
  
  // Check if dependencies are met
  const dependencies = TASK_DEPENDENCIES[task.type] || []
  const dependenciesMet = dependencies.every(depType => 
    allTasks.find(t => t.type === depType)?.status === TaskStatus.COMPLETED
  )
  const isBlocked = isPending && !dependenciesMet && dependencies.length > 0

  const StatusIcon = () => {
    switch (task.status) {
      case TaskStatus.COMPLETED:
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case TaskStatus.IN_PROGRESS:
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      case TaskStatus.FAILED:
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${STATUS_COLORS[task.status]}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <StatusIcon />
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <IconComponent className="h-4 w-4" />
              <h4 className="font-medium text-sm">{task.name}</h4>
            </div>
            <Badge variant={STATUS_BADGE_COLORS[task.status]} className="text-xs">
              {task.status === TaskStatus.IN_PROGRESS ? 'Processing' : 
               task.status === TaskStatus.COMPLETED ? 'Done' :
               task.status === TaskStatus.FAILED ? 'Failed' : 'Waiting'}
            </Badge>
          </div>
          
          <p className="text-xs text-gray-600 mb-3">{task.description}</p>
          
          {/* Dependency information */}
          {isBlocked && dependencies.length > 0 && (
            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              <span className="font-medium">Waiting for:</span> {dependencies.map(depType => {
                const depTask = allTasks.find(t => t.type === depType)
                return depTask?.name || depType
              }).join(', ')}
            </div>
          )}
          
          {/* Progress bar for in-progress tasks */}
          {isInProgress && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{Math.round(task.progress)}%</span>
              </div>
              <Progress value={task.progress} className="h-2" />
            </div>
          )}
          
          {/* Time information */}
          <div className="flex justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Timer className="h-3 w-3" />
              <span>
                {isInProgress ? `${getElapsedTime(task.startTime)} elapsed` :
                 isCompleted ? `${getElapsedTime(task.startTime)} total` :
                 isFailed ? `Failed after ${getElapsedTime(task.startTime)}` :
                 isBlocked ? 'Waiting for dependencies' :
                 `~${formatDuration(task.estimatedDuration)} estimated`}
              </span>
            </div>
            {isCompleted && task.completedTime && (
              <span className="text-green-600 font-medium">✓ Complete</span>
            )}
            {isFailed && task.error && (
              <span className="text-red-600 font-medium" title={task.error}>⚠ Error</span>
            )}
          </div>
          
          {/* Error message */}
          {isFailed && task.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {task.error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TaskTracker({
  tasks,
  overallProgress,
  isComplete,
  hasErrors,
  startTime,
  completedTime,
  className = ''
}: TaskTrackerProps) {
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED)
  const failedTasks = tasks.filter(t => t.status === TaskStatus.FAILED)
  const totalElapsed = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Content Generation Progress</CardTitle>
          </div>
          <Badge 
            variant={isComplete ? "secondary" : hasErrors ? "destructive" : "default"} 
            className="px-3 py-1"
          >
            {isComplete ? `Complete (${formatDuration(totalElapsed)})` : 
             hasErrors ? 'Some Issues' : 
             'Processing...'}
          </Badge>
        </div>
        
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Overall Progress</span>
            <span className="font-medium">
              {completedTasks.length}/{tasks.length} tasks • {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress 
            value={overallProgress} 
            className="h-3"
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} allTasks={tasks} />
        ))}
        
        {/* Summary stats */}
        {(isComplete || hasErrors) && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium text-green-600">
                  {completedTasks.length}/{tasks.length}
                </span>
              </div>
              {failedTasks.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-medium text-red-600">
                    {failedTasks.length}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Time:</span>
                <span className="font-medium">
                  {formatDuration(totalElapsed)}
                </span>
              </div>
              {isComplete && completedTime && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Finished:</span>
                  <span className="font-medium text-green-600">
                    {completedTime.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}