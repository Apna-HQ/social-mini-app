"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "./button"
import { Textarea } from "./textarea"

interface CreateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish: (content: string) => void | Promise<void>
}

export function CreateNoteModal({ isOpen, onClose, onPublish }: CreateNoteModalProps) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg w-full max-w-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Create New Note</h2>
        <Textarea
          placeholder="What's on your mind?"
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
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  )
}