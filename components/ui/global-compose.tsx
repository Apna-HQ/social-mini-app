"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import type React from "react"
import type { Note } from "@apna/sdk"

import { useApp } from "@/app/providers"
import { CreateNoteModal } from "@/components/ui/create-note-modal"
import { Fab } from "@/components/ui/fab"
import type {
  ComposerPublishHandler,
  ComposerPublishOptions,
} from "@/components/ui/note-composer"

interface ComposeOptions {
  onPublished?: (note?: Note | void) => void | Promise<void>
}

interface ComposeContextValue {
  openComposer: (options?: ComposeOptions) => void
  closeComposer: () => void
}

const ComposeContext = createContext<ComposeContextValue | null>(null)

export function ComposeProvider({ children }: { children: React.ReactNode }) {
  const { publishNote } = useApp()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ComposeOptions>({})

  const openComposer = useCallback((nextOptions: ComposeOptions = {}) => {
    setOptions(nextOptions)
    setOpen(true)
  }, [])

  const closeComposer = useCallback(() => {
    setOpen(false)
    setOptions({})
  }, [])

  const handlePublish: ComposerPublishHandler = useCallback(
    async (content: string, publishOptions?: ComposerPublishOptions) => {
      const note = await publishNote(content, publishOptions)
      await options.onPublished?.(note)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("social:note-published", { detail: note })
        )
      }
      return note
    },
    [options, publishNote]
  )

  const contextValue = useMemo(
    () => ({ openComposer, closeComposer }),
    [closeComposer, openComposer]
  )

  return (
    <ComposeContext.Provider value={contextValue}>
      {children}
      <Fab onClick={() => openComposer()} />
      <CreateNoteModal
        isOpen={open}
        onClose={closeComposer}
        onPublish={handlePublish}
      />
    </ComposeContext.Provider>
  )
}

export function useComposer() {
  const context = useContext(ComposeContext)
  if (!context) {
    throw new Error("useComposer must be used within a ComposeProvider")
  }
  return context
}
