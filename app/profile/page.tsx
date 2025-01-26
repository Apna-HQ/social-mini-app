"use client"

import { useApp } from "../providers"
import { Post } from "@/components/ui/post"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"

interface ProfileStats {
  followers: number
  following: number
}

export default function ProfilePage() {
  const { profile, notes } = useApp()
  const [stats, setStats] = useState<ProfileStats>({ followers: 0, following: 0 })
  const [userNotes, setUserNotes] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])

  useEffect(() => {
    if (profile) {
      // Filter notes by the user's pubkey
      const filteredNotes = notes.filter(note => note.pubkey === profile.pubkey)
      setUserNotes(filteredNotes)

      // TODO: Fetch actual followers/following from nostr network
      // For now using placeholder data
      setStats({
        followers: Math.floor(Math.random() * 100),
        following: Math.floor(Math.random() * 100)
      })
    }
  }, [profile, notes])

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-screen-md py-4">
          <div className="text-center py-8 text-muted-foreground">
            Loading profile...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-screen-md py-4">
        {/* Profile Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-2xl font-bold">
              {profile.metadata.name?.[0] || "U"}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile.metadata.name || "Unknown"}</h1>
              <p className="text-sm text-muted-foreground break-all">{profile.pubkey}</p>
            </div>
          </div>
          
          {/* Bio */}
          {profile.metadata.about && (
            <p className="mt-4 text-muted-foreground">{profile.metadata.about}</p>
          )}

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div>
              <span className="font-bold">{userNotes.length}</span>
              <span className="text-muted-foreground ml-1">Notes</span>
            </div>
            <div>
              <span className="font-bold">{stats.followers}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
            <div>
              <span className="font-bold">{stats.following}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="notes">
          <TabsList className="w-full">
            <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
            <TabsTrigger value="followers" className="flex-1">Followers</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4 space-y-4">
            {userNotes.length > 0 ? (
              userNotes.map((note) => (
                <Post
                  key={note.id}
                  id={note.id}
                  content={note.content}
                  author={{
                    name: profile.metadata.name || note.pubkey.slice(0, 8),
                    picture: profile.metadata.picture,
                    pubkey: note.pubkey
                  }}
                  timestamp={note.created_at}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No notes yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="followers" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              Followers list coming soon
            </div>
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              Following list coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}