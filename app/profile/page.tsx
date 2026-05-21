"use client"

import { useApp } from "../providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { useState, useEffect } from "react"
import { ProfileTemplate, UserProfile } from "@/components/templates/ProfileTemplate"
import type { UserMetadata } from "@apna/sdk"

function profileFromAppProfile(appProfile: NonNullable<ReturnType<typeof useApp>["profile"]>): UserProfile {
  return {
    metadata: appProfile.metadata || {},
    pubkey: appProfile.pubkey,
    followers: appProfile.followers || [],
    following: appProfile.following || [],
  }
}

export default function ProfilePage() {
  const { profile: appProfile, updateProfileMetadata } = useApp()
  const { social } = useApna()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UserMetadata>({})

  useEffect(() => {
    if (!appProfile) return

    const shellProfile = profileFromAppProfile(appProfile)
    setUserProfile((current) => {
      if (current?.pubkey !== appProfile.pubkey) return shellProfile
      return {
        metadata: Object.keys(current.metadata || {}).length > 0
          ? current.metadata
          : shellProfile.metadata,
        pubkey: appProfile.pubkey,
        followers: current.followers.length > 0 ? current.followers : shellProfile.followers,
        following: current.following.length > 0 ? current.following : shellProfile.following,
      }
    })
    setEditForm(shellProfile.metadata)
  }, [appProfile])

  useEffect(() => {
    if (!appProfile || !social) return

    let cancelled = false
    const fetchFreshProfile = async () => {
      try {
        const freshProfile = await social.v1.userProfile(appProfile.pubkey)
        if (cancelled) return

        const profileWithPubkey = {
          ...freshProfile,
          pubkey: appProfile.pubkey,
          metadata: freshProfile.metadata || {},
          followers: freshProfile.followers || [],
          following: freshProfile.following || [],
        }
        setUserProfile(profileWithPubkey)
        setEditForm(profileWithPubkey.metadata)
      } catch (error) {
        console.error("Failed to fetch fresh profile:", error)
      }
    }

    void fetchFreshProfile()
    return () => {
      cancelled = true
    }
  }, [appProfile, social])

  useEffect(() => {
    if (!appProfile || !social) return
    const unsubscribe = social.v1.subscribeProfile(appProfile.pubkey, (profile) => {
      setUserProfile({
        metadata: profile.metadata,
        pubkey: profile.pubkey,
        followers: profile.followers || [],
        following: profile.following || [],
      })
    })
    return unsubscribe
  }, [appProfile, social])

  const handleEditStart = (data: UserMetadata) => {
    setEditForm(data)
    setIsEditing(true)
  }

  const handleEditSave = async (data: UserMetadata) => {
    try {
      await updateProfileMetadata(data)
      setUserProfile((current) =>
        current ? { ...current, metadata: data } : current
      )
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update profile:", error)
    }
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditForm(userProfile?.metadata || {})
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
      isCurrentUser={true}
      showEditProfile={true}
      isEditing={isEditing}
      editForm={editForm}
      onEditStart={handleEditStart}
      onEditSave={handleEditSave}
      onEditCancel={handleEditCancel}
      social={social}
    />
  )
}
