"use client"

import { ReactNode, useState } from "react"
import { BottomSheet, SelectOption } from "./bottom-sheet"
import { loadRemote, registerRemotes } from '@/utils/federation'

interface HighlightWrapperProps {
  children: ReactNode
  isHighlighted?: boolean
}

interface RemoteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

interface RemoteModule {
  default: React.ComponentType<RemoteButtonProps>
}

const REMOTE_OPTIONS = [
  {
    name: 'apna_module_test',
    entry: 'https://cdn.jsdelivr.net/npm/@nandubatchu/apna-module-test@1.0.6/dist/mf-manifest.json'
  },
  {
    name: 'test_provider',
    entry: 'http://localhost:3004/remoteEntry.js'
  }
]

export function HighlightWrapper({ children, isHighlighted = false }: HighlightWrapperProps) {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [RemoteButton, setRemoteButton] = useState<React.ComponentType<RemoteButtonProps> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadButton = async (remote: typeof REMOTE_OPTIONS[0]) => {
    try {
      console.log('Updating remote configuration...')
      registerRemotes([
        {
          name: remote.name,
          entry: remote.entry,
        },
      ], { force: true })
      
      console.log('Loading remote component...')
      const remoteModule = await loadRemote(`${remote.name}/Button`) as RemoteModule
      
      if (!remoteModule?.default) {
        throw new Error('Remote module does not contain a default export')
      }
      
      setRemoteButton(() => remoteModule.default)
      console.log('Component loaded successfully')
      setIsBottomSheetOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load remote button'
      setError(errorMessage)
      console.error(`Error: ${errorMessage}`)
    }
  }

  const handleBorderClick = (e: React.MouseEvent) => {
    // Get click coordinates relative to the target element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const border = 4 // border width

    // Only trigger if click is on the border area
    if (
      x <= border || 
      x >= rect.width - border || 
      y <= border || 
      y >= rect.height - border
    ) {
      setIsBottomSheetOpen(true)
    }
  }

  return (
    <>
      <div 
        className={`${isHighlighted ? "border-4 border-[#368564] rounded-md" : ""}`}
        onClick={isHighlighted ? handleBorderClick : undefined}
      >
        {RemoteButton ? (
          <RemoteButton className="mt-4 ml-24 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90">
            Edit Profile
          </RemoteButton>
        ) : (
          children
        )}
      </div>

      <BottomSheet 
        isOpen={isBottomSheetOpen} 
        onClose={() => setIsBottomSheetOpen(false)}
      >
        <div className="space-y-2">
          <h3 className="font-medium px-4 mb-4">Select Remote Button</h3>
          {REMOTE_OPTIONS.map(option => (
            <SelectOption
              key={option.name}
              value={option.name}
              label={option.name}
              onClick={() => loadButton(option)}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  )
}