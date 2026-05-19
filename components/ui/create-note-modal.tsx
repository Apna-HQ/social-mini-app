"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "./button"
import { Textarea } from "./textarea"

interface CreateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish: (content: string) => void | Promise<unknown>
  title?: string
  placeholder?: string
  publishLabel?: string
}

export function CreateNoteModal({
  isOpen,
  onClose,
  onPublish,
  title = "Create New Note",
  placeholder = "What's on your mind?",
  publishLabel = "Publish",
}: CreateNoteModalProps) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)

  if (!isOpen) return null

  const handlePublish = async () => {
    if (!content.trim()) return
    
    try {
      setIsPublishing(true)
      await onPublish(content)
      setContent("")
      router.refresh() // Refresh the current page to show the new note
      onClose()
    } catch (error) {
      console.error("Failed to publish note:", error)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-background p-6">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <Textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[150px] mb-4"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handlePublish} 
            disabled={!content.trim() || isPublishing}
          >
            {isPublishing ? "Publishing..." : publishLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
