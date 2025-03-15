"use client"
import { useUserProfile } from '@/lib/hooks/useUserProfile'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { NpubDisplay } from '@/components/atoms/NpubDisplay'
import { hexToNpub, trimNpub } from '@/lib/utils/nostr'

interface AuthorInfoProps {
  pubkey: string
  onClick?: (e: React.MouseEvent) => void
  showTimestamp?: boolean
  timestamp?: number
}

export function AuthorInfo({ pubkey, onClick, showTimestamp = true, timestamp }: AuthorInfoProps) {
  const profile = useUserProfile(pubkey)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    
    // Get day with ordinal suffix
    const day = date.getDate()
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'ᵗʰ'
      switch (day % 10) {
        case 1: return 'ˢᵗ'
        case 2: return 'ⁿᵈ'
        case 3: return 'ʳᵈ'
        default: return 'ᵗʰ'
      }
    }
    
    const dayWithSuffix = `${day}${getOrdinalSuffix(day)}`
    
    // Format month, year and time
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    
    // Format time with seconds
    const hours = date.getHours() % 12 || 12
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM'
    
    // Combine all parts in the requested format
    return `${dayWithSuffix} ${month} ${year}, ${hours}:${minutes}:${seconds} ${ampm}`
  }

  const getTimeDifference = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp * 1000
    
    // Convert to seconds
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) {
      return `${seconds}s ago`
    }
    
    // Convert to minutes
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) {
      return `${minutes}m ago`
    }
    
    // Convert to hours
    const hours = Math.floor(minutes / 60)
    if (hours < 24) {
      return `${hours}h ago`
    }
    
    // Convert to days
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="flex items-start space-x-4">
      <div onClick={onClick} className="cursor-pointer hover:opacity-80">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile.picture || "https://www.kindpng.com/picc/m/252-2524695_dummy-profile-image-jpg-hd-png-download.png"} />
          <AvatarFallback>{profile.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            onClick={onClick}
            className="font-semibold truncate cursor-pointer hover:underline"
          >
            {profile.name || trimNpub(hexToNpub(pubkey), 4, 4)}
          </span>
        </div>
        <NpubDisplay
          pubkey={pubkey}
          className="text-xs text-muted-foreground"
          copyButtonClassName="h-3 w-3 ml-1"
        />
        {showTimestamp && timestamp && (
          <div className="text-xs text-muted-foreground mt-1">
            {formatDate(timestamp)}<span className="mx-1">·</span>({getTimeDifference(timestamp)})
          </div>
        )}
      </div>
    </div>
  )
}