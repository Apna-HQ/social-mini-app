"use client"

import { Edit } from "lucide-react"

interface FabProps {
  onPublish: (content: string) => void | Promise<void>
}

export function Fab({ onPublish }: FabProps) {
  return (
    <button
      onClick={() => onPublish("")} // Pass empty string or implement content input
      className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      aria-label="Edit Profile"
    >
      <Edit className="w-6 h-6" />
    </button>
  )
}