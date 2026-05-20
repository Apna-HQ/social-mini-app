"use client"

import { Edit } from "lucide-react"
import { useState } from "react"
import { CreateNoteModal } from "./create-note-modal"
import type { ComposerPublishHandler } from "./note-composer"

interface FabProps {
  onPublish?: ComposerPublishHandler
  onClick?: () => void
}

export function Fab({ onPublish, onClick }: FabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const openComposer = () => {
    if (onClick) {
      onClick()
      return
    }
    setIsModalOpen(true)
  }

  return (
    <>
      <button
        onClick={openComposer}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-colors hover:bg-accent/90 md:hidden"
        aria-label="Create Note"
      >
        <Edit className="w-6 h-6" />
      </button>

      {onPublish && (
        <CreateNoteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onPublish={onPublish}
        />
      )}
    </>
  )
}
