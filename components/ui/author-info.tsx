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
  showNpub?: boolean
}

export function AuthorInfo({ pubkey, onClick, showTimestamp = true, timestamp, showNpub = false }: AuthorInfoProps) {
  const profile = useUserProfile(pubkey)

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

  const displayName = profile.name || trimNpub(hexToNpub(pubkey), 4, 4)
  const handle = profile.name
    ? profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14)
    : trimNpub(hexToNpub(pubkey), 4, 4)

  return (
    <div className="flex items-start gap-3">
      <div onClick={onClick} className="cursor-pointer hover:opacity-80">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage src={profile.picture || "https://www.kindpng.com/picc/m/252-2524695_dummy-profile-image-jpg-hd-png-download.png"} />
          <AvatarFallback>{profile.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-baseline gap-1.5 text-sm">
          <span
            onClick={onClick}
            className="font-semibold truncate cursor-pointer hover:underline"
          >
            {displayName}
          </span>
          <span className="truncate text-muted-foreground">@{handle}</span>
          {showTimestamp && timestamp && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="shrink-0 text-muted-foreground">
                {getTimeDifference(timestamp)}
              </span>
            </>
          )}
        </div>
        {showNpub && (
          <NpubDisplay
            pubkey={pubkey}
            className="mt-0.5 text-xs text-muted-foreground"
            copyButtonClassName="h-3 w-3 ml-1"
          />
        )}
      </div>
    </div>
  )
}
