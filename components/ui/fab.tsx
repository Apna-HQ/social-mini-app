"use client"
import { useState } from "react"
import { Card, CardContent } from "./card"
import { Send, Plus, X } from "lucide-react"

interface FabProps {
  onPublish: (content: string) => Promise<void>
}

export function Fab({ onPublish }: FabProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublish = async () => {
    if (!content.trim() || isPublishing) return
    setIsPublishing(true)
    try {
      await onPublish(content)
      setContent("")
      setIsOpen(false)
    } catch (error) {
      console.error("Failed to publish:", error)
      // Show error state to user
      alert("Failed to publish post. Please try again.")
    } finally {
      setIsPublishing(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-20 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <Card className="fixed bottom-20 left-4 right-4 max-w-screen-md mx-auto">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">New Post</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <textarea
            className="w-full bg-transparent resize-none outline-none min-h-[100px]"
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handlePublish}
              disabled={!content.trim() || isPublishing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Post
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}