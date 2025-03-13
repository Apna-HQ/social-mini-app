"use client"

import { useApp } from "../../providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { useEffect, useState } from "react"
import { userProfileDB } from "@/lib/userProfileDB"
import { ProfileTemplate, UserProfile } from "@/components/templates/ProfileTemplate"
import { useRouter } from "next/navigation"

export const dynamic = 'force-dynamic'

export default function UserProfilePage({ params }: { params: { pubkey: string } }) {
  const router = useRouter()
  const { likeNote, profile } = useApp()
  const { nostr } = useApna()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check cache first for profile
        const cachedData = await userProfileDB.getProfile(params.pubkey)
        
        if (cachedData) {
          // Use cached data immediately
          setUserProfile(cachedData.profile)
          setIsStale(cachedData.isStale)
          
          fetchFreshProfile()
        } else {
          // No cache, fetch fresh data
          await fetchFreshProfile()
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error)
      }
    }

    const fetchFreshProfile = async () => {
      try {
        const freshProfile = await nostr.fetchUserProfile(params.pubkey)
        const profileWithPubkey = {
          ...freshProfile,
          pubkey: params.pubkey // Ensure pubkey is included
        }
        setUserProfile(profileWithPubkey)
        setIsStale(false)

        // Update cache
        await userProfileDB.updateProfile(profileWithPubkey)
      } catch (error) {
        console.error("Failed to fetch fresh profile:", error)
      }
    }

    fetchData()
  }, [params.pubkey, nostr])

  const handleFollowToggle = async () => {
    try {
      if (profile && profile.following.includes(params.pubkey)) {
        await nostr.unfollowUser(params.pubkey)
      } else {
        await nostr.followUser(params.pubkey)
      }
    } catch (error) {
      console.error("Failed to follow/unfollow user:", error)
    }
  }

  const handleLikeNote = (noteId: string) => {
    likeNote(noteId)
  }

  const handleRepostNote = (noteId: string) => {
    nostr.repostNote(noteId, '')
  }

  const handleReplyToNote = (noteId: string) => {
    router.push(`/note/${noteId}`)
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-screen-md mx-auto py-4 px-4">
          <div className="text-center py-8 text-muted-foreground">
            Loading profile...
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProfileTemplate
      userProfile={userProfile}
      isCurrentUser={profile?.pubkey === params.pubkey}
      showBackButton={true}
      showFollowButton={true}
      isStale={isStale}
      onFollowToggle={handleFollowToggle}
      onLikeNote={handleLikeNote}
      onRepostNote={handleRepostNote}
      onReplyToNote={handleReplyToNote}
      nostr={nostr}
    />
  )
}