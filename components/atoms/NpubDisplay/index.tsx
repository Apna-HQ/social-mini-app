"use client"

import { hexToNpub, trimNpub } from '@/lib/utils/nostr'
import { CopyButton } from '../CopyButton'

interface NpubDisplayProps {
  pubkey: string
  startChars?: number
  endChars?: number
  className?: string
  copyButtonClassName?: string
}

/**
 * Displays a pubkey as a trimmed npub with a copy button
 */
export function NpubDisplay({
  pubkey,
  startChars = 8,
  endChars = 8,
  className = "text-sm text-muted-foreground",
  copyButtonClassName = "h-4 w-4 ml-1"
}: NpubDisplayProps) {
  // Convert hex pubkey to npub format
  const npub = hexToNpub(pubkey)
  
  // Trim the npub for display
  const displayNpub = trimNpub(npub, startChars, endChars)
  
  return (
    <div className={`flex items-center ${className}`}>
      <span className="break-all">{displayNpub}</span>
      <CopyButton 
        value={npub} 
        size="icon" 
        variant="ghost" 
        className={copyButtonClassName}
      />
    </div>
  )
}