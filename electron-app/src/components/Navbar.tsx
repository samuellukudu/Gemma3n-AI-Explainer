import React from "react"
import { Button } from "./ui/button"
import { BookOpen, Bell, User, Wifi, WifiOff } from "lucide-react"

interface NavbarProps {
  currentPage?: string
  isOnline?: boolean
  onNavigate?: (page: string) => void
}

export default function Navbar({ 
  currentPage = "home", 
  isOnline = true, 
  onNavigate = () => {} 
}: NavbarProps) {
  const navItems = [
    { id: "home", label: "Home" },
    { id: "explanation", label: "Explanation" },
    { id: "explore", label: "Explore" },
    { id: "lessons", label: "My Lessons" },
    { id: "library", label: "My Library" },
  ]

  return (
    <nav className="border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-gray-900" />
          <span className="text-xl font-semibold text-gray-900">AI Explainer</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`${
                currentPage === item.id
                  ? "text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-900"
              } transition-colors relative group`}
              onClick={() => onNavigate(item.id)}
              title={item.id === 'explanation' ? 'Continue your most recent lesson' : undefined}
            >
              {item.label}
              {item.id === 'explanation' && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Continue most recent lesson
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-orange-500" />
            )}
          </div>
          <Button variant="ghost" size="sm" className="p-2">
            <Bell className="h-5 w-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2 rounded-full">
            <User className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>
    </nav>
  )
}