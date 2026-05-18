"use client"

import { useApp } from "../providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { useState, useEffect } from "react"
import { ProfileTemplate, UserProfile } from "@/components/templates/ProfileTemplate"

export default function ProfilePage() {
  const { profile: appProfile, updateProfileMetadata, publishNote } = useApp()
  const { social } = useApna()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userMetadata, setUserMetadata] = useState<Record<string, any>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    about: ''
  })

  useEffect(() => {
    if (appProfile && social) {
      const fetchData = async () => {
        try {
          await fetchFreshProfile()

          // Fetch metadata for followers and following
          await fetchMetadata()
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
        } catch (error) {
          console.error("Failed to fetch fresh profile:", error)
        }
      }

      const fetchMetadata = async () => {
        const metadata: Record<string, any> = {}
        const allUsers = Array.from(new Set([...appProfile.followers, ...appProfile.following]))

        await Promise.all(
          allUsers.map(async (pubkey) => {
            try {
              const userMetadata = await social!.v1.userMetadata(pubkey)
              metadata[pubkey] = userMetadata
            } catch (error) {
              console.error(`Failed to fetch metadata for ${pubkey}:`, error)
            }
          })
        )

        setUserMetadata(metadata)
      }

      fetchData()
    }
  }, [appProfile, social])

  const handleEditStart = (data: { name: string; about: string }) => {
    setEditForm(data)
    setIsEditing(true)
  }

  const handleEditSave = async (data: { name: string; about: string }) => {
    try {
      await updateProfileMetadata({
        name: data.name,
        about: data.about
      })
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update profile:", error)
    }
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditForm({
      name: userProfile?.metadata.name || '',
      about: userProfile?.metadata.about || ''
    })
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
      showFab={true}
      isEditing={isEditing}
      editForm={editForm}
      onEditStart={handleEditStart}
      onEditSave={handleEditSave}
      onEditCancel={handleEditCancel}
      onPublishNote={publishNote}
      social={social}
      userMetadata={userMetadata}
    />
  )
}
