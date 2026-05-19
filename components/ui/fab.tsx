"use client"

import { Edit } from "lucide-react"
import { useState } from "react"
import { CreateNoteModal } from "./create-note-modal"

interface FabProps {
  onPublish: (content: string) => void | Promise<unknown>
}

export function Fab({ onPublish }: FabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-colors hover:bg-accent/90 md:bottom-6"
        aria-label="Create Note"
      >
        <Edit className="w-6 h-6" />
      </button>

      <CreateNoteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPublish={onPublish}
      />
    </>
  )
}
