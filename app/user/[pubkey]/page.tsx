"use client"

import { useApp } from "../../providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { useEffect, useState } from "react"
import { ProfileTemplate, UserProfile } from "@/components/templates/ProfileTemplate"

export const dynamic = 'force-dynamic'

export default function UserProfilePage({ params }: { params: { pubkey: string } }) {
  const { profile, refreshProfile } = useApp()
  const { social } = useApna()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const isFollowing = Boolean(profile?.following.includes(params.pubkey))

  useEffect(() => {
    if (!social) return

    const fetchData = async () => {
      try {
        await fetchFreshProfile()
      } catch (error) {
        console.error("Failed to fetch user data:", error)
      }
    }

    const fetchFreshProfile = async () => {
      try {
        const freshProfile = await social!.v1.userProfile(params.pubkey)
        const profileWithPubkey = {
          ...freshProfile,
          pubkey: params.pubkey // Ensure pubkey is included
        }
        setUserProfile(profileWithPubkey)
      } catch (error) {
        console.error("Failed to fetch fresh profile:", error)
      }
    }

    fetchData()
  }, [params.pubkey, social])

  useEffect(() => {
    if (!social) return
    const unsubscribe = social.v1.subscribeProfile(params.pubkey, (profile) => {
      setUserProfile({
        metadata: profile.metadata,
        pubkey: profile.pubkey,
        followers: profile.followers || [],
        following: profile.following || [],
      })
    })
    return unsubscribe
  }, [params.pubkey, social])

  const handleFollowToggle = async () => {
    if (!social) return

    try {
      if (isFollowing) {
        await social!.v1.unfollow(params.pubkey)
      } else {
        await social!.v1.follow(params.pubkey)
      }
      await refreshProfile()
    } catch (error) {
      console.error("Failed to follow/unfollow user:", error)
    }
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
      isFollowing={isFollowing}
      onFollowToggle={handleFollowToggle}
      social={social}
    />
  )
}
