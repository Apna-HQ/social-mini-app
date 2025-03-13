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
    return new Date(timestamp * 1000).toLocaleString()
  }

  return (
    <div className="flex items-start space-x-3">
      <div onClick={onClick} className="cursor-pointer hover:opacity-80">
        <Avatar>
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
          {showTimestamp && timestamp && (
            <>
              <span className="text-sm text-muted-foreground flex-shrink-0">·</span>
              <span className="text-sm text-muted-foreground flex-shrink-0">
                {formatDate(timestamp)}
              </span>
            </>
          )}
        </div>
        <NpubDisplay
          pubkey={pubkey}
          className="text-xs text-muted-foreground"
          copyButtonClassName="h-3 w-3 ml-1"
        />
      </div>
    </div>
  )
}