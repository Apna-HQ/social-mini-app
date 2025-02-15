"use client"

import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "./avatar"
import { Button } from "./button"

interface UserProfileCardProps {
  pubkey: string
  name?: string
  about?: string
  picture?: string
  onClick?: () => void
  showFollowButton?: boolean
  isFollowing?: boolean
  onFollowToggle?: () => Promise<void>
}

export function UserProfileCard({
  pubkey,
  name,
  about,
  picture,
  onClick,
  showFollowButton = false,
  isFollowing = false,
  onFollowToggle
}: UserProfileCardProps) {
  const router = useRouter()
  const displayName = name || pubkey.slice(0, 8)
  const displayAbout = about || pubkey

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/user/${pubkey}`)
    }
  }

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-lg border cursor-pointer hover:bg-accent/5"
      onClick={handleClick}
    >
      <Avatar className="w-12 h-12">
        {picture ? (
          <AvatarImage src={picture} alt={displayName} />
        ) : (
          <AvatarFallback>
            {displayName[0].toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{displayName}</p>
        <p className="text-sm text-muted-foreground truncate">{displayAbout}</p>
      </div>
      {showFollowButton && onFollowToggle && (
        <Button
          variant={isFollowing ? "outline" : "default"}
          onClick={(e) => {
            e.stopPropagation()
            onFollowToggle()
          }}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </Button>
      )}
    </div>
  )
}