"use client"

import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "./avatar"
import { Button } from "./button"
import { useEffect, useState, useRef } from "react"
import { useApp } from "@/app/providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { userProfileDB } from "@/lib/userProfileDB"
import { NpubDisplay } from "@/components/atoms/NpubDisplay"
import { hexToNpub, trimNpub } from "@/lib/utils/nostr"

interface UserProfileCardProps {
  pubkey: string
}

interface UserProfile {
  metadata: {
    name?: string
    about?: string
    picture?: string
  }
  followers: string[]
  following: string[]
  pubkey: string
}

export function UserProfileCard({
  pubkey,
}: UserProfileCardProps) {
  const router = useRouter()
  const { profile } = useApp()
  const { nostr } = useApna()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: "100px" // Start loading when within 100px of viewport
      }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const fetchData = async () => {
      try {
        // Check cache first
        const cachedData = await userProfileDB.getProfile(pubkey)
        
        if (cachedData) {
          // Use cached data immediately
          setUserProfile(cachedData.profile)
          setIsStale(cachedData.isStale)
          
          // If data is stale, fetch fresh data in background
          if (cachedData.isStale) {
            fetchFreshData()
          }
        } else {
          // No cache, fetch fresh data
          await fetchFreshData()
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error)
      }
    }

    const fetchFreshData = async () => {
      try {
        const freshProfile = await nostr.fetchUserProfile(pubkey)
        const profileWithPubkey = {
          ...freshProfile,
          pubkey // Ensure pubkey is included
        }
        setUserProfile(profileWithPubkey)
        setIsStale(false)

        // Update cache
        await userProfileDB.updateProfile(profileWithPubkey)
      } catch (error) {
        console.error("Failed to fetch fresh data:", error)
      }
    }

    fetchData()
  }, [pubkey, nostr, isVisible])

  const handleClick = () => {
    router.push(`/user/${pubkey}`)
  }

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (profile?.following.includes(pubkey)) {
        await nostr.unfollowUser(pubkey)
      } else {
        await nostr.followUser(pubkey)
      }
    } catch (error) {
      console.error("Failed to follow/unfollow user:", error)
    }
  }

  const displayName = userProfile?.metadata.name || trimNpub(hexToNpub(pubkey), 4, 4)
  const displayAbout = userProfile?.metadata.about

  return (
    <div
      ref={cardRef}
      className="flex items-center gap-4 p-4 rounded-lg border cursor-pointer hover:bg-accent/5"
      onClick={handleClick}
    >
      <Avatar className="w-12 h-12">
        {userProfile?.metadata.picture ? (
          <AvatarImage src={userProfile.metadata.picture} alt={displayName} />
        ) : (
          <AvatarFallback>
            {displayName[0].toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{displayName}</p>
          {isStale && userProfile && (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full animate-pulse">
              Updating...
            </div>
          )}
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