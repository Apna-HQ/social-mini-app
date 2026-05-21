"use client"

import { useApp } from "../providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { useState, useEffect } from "react"
import { ProfileTemplate, UserProfile } from "@/components/templates/ProfileTemplate"
import type { UserMetadata } from "@apna/sdk"

export default function ProfilePage() {
  const { profile: appProfile, updateProfileMetadata } = useApp()
  const { social } = useApna()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UserMetadata>({})

  useEffect(() => {
    if (appProfile && social) {
      const fetchData = async () => {
        try {
          await fetchFreshProfile()

        } catch (error) {
          console.error("Failed to fetch user data:", error)
        }
      }

      const fetchFreshProfile = async () => {
        try {
          const freshProfile = await social!.v1.userProfile(appProfile.pubkey)
          const profileWithPubkey = {
            ...freshProfile,
            pubkey: appProfile.pubkey // Ensure pubkey is included
          }
          setUserProfile(profileWithPubkey)
          setEditForm(profileWithPubkey.metadata || {})
        } catch (error) {
          console.error("Failed to fetch fresh profile:", error)
        }
      }

      fetchData()
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
