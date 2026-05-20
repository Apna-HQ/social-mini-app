"use client"

import { X } from "lucide-react"

import {
  NoteComposer,
  type ComposerPublishHandler,
} from "@/components/ui/note-composer"
import { Button } from "./button"

interface CreateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish: ComposerPublishHandler
  title?: string
  placeholder?: string
  publishLabel?: string
}

export function CreateNoteModal({
  isOpen,
  onClose,
  onPublish,
  title = "Create Note",
  placeholder = "What's happening?",
  publishLabel = "Post",
}: CreateNoteModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <NoteComposer
            variant="modal"
            showAvatar={false}
            autoFocus
            placeholder={placeholder}
            publishLabel={publishLabel}
            onCancel={onClose}
            onPublish={onPublish}
            onPublished={onClose}
          />
        </div>
      </div>
    </div>
  )
}
