"use client"

import { Edit } from "lucide-react"
import { useState } from "react"
import { CreateNoteModal } from "./create-note-modal"

interface FabProps {
  onPublish: (content: string) => void | Promise<void>
}

export function Fab({ onPublish }: FabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
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