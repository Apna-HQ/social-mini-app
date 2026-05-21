"use client"

import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "./avatar"
import { Button } from "./button"
import { useApp } from "@/app/providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { NpubDisplay } from "@/components/atoms/NpubDisplay"
import { hexToNpub, trimNpub } from "@/lib/utils/nostr"
import { useUserProfile } from "@/lib/hooks/useUserProfile"

interface UserProfileCardProps {
  pubkey: string
}

export function UserProfileCard({
  pubkey,
}: UserProfileCardProps) {
  const router = useRouter()
  const { profile } = useApp()
  const { social } = useApna()
  const userProfile = useUserProfile(pubkey)

  const handleClick = () => {
    router.push(`/user/${pubkey}`)
  }

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!profile || !social) return

    try {
      if (profile?.following.includes(pubkey)) {
        await social.v1.unfollow(pubkey)
      } else {
        await social.v1.follow(pubkey)
      }
    } catch (error) {
      console.error("Failed to follow/unfollow user:", error)
    }
  }

  const displayName = userProfile.name || trimNpub(hexToNpub(pubkey), 4, 4)
  const displayAbout = userProfile.about

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-lg border cursor-pointer hover:bg-accent/5"
      onClick={handleClick}
    >
      <Avatar className="w-12 h-12">
        {userProfile.picture ? (
          <AvatarImage src={userProfile.picture} alt={displayName} />
        ) : (
          <AvatarFallback>
            {displayName[0].toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{displayName}</p>
        </div>
        {displayAbout ? (
          <p className="text-sm text-muted-foreground truncate">{displayAbout}</p>
        ) : (
          <NpubDisplay pubkey={pubkey} className="text-sm text-muted-foreground" />
        )}
      </div>
      {profile && profile.pubkey !== pubkey && (
        <Button
          variant={profile.following.includes(pubkey) ? "outline" : "default"}
          onClick={handleFollowToggle}
        >
          {profile.following.includes(pubkey) ? "Unfollow" : "Follow"}
        </Button>
      )}
    </div>
  )
}
