"use client"

import { useApp } from "../providers"
import { Post } from "@/components/ui/post"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"

export default function ProfilePage() {
  const { profile } = useApp()
  const [userNotes, setUserNotes] = useState<any[]>([])
  const [userMetadata, setUserMetadata] = useState<Record<string, any>>({})
  const [loadingNotes, setLoadingNotes] = useState(true)

  useEffect(() => {
    if (profile) {
      const fetchData = async () => {
        try {
          // Fetch user's notes using NOTES_FEED
          // @ts-ignore
          const notes = await window.apna.nostr.fetchUserFeed(profile.pubkey, 'NOTES_FEED', undefined, undefined, 20)
          setUserNotes(notes)
        } catch (error) {
          console.error("Failed to fetch user notes:", error)
        } finally {
          setLoadingNotes(false)
        }

        // Fetch metadata for followers and following
        const metadata: Record<string, any> = {}
        const allUsers = Array.from(new Set([...profile.followers, ...profile.following]))

        await Promise.all(
          allUsers.map(async (pubkey) => {
            try {
              // @ts-ignore
              const userMetadata = await window.apna.nostr.fetchUserMetadata(pubkey)
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
  }, [profile])

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
              <span className="font-bold">{profile.followers.length}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
            <div>
              <span className="font-bold">{profile.following.length}</span>
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
            {loadingNotes ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading notes...
              </div>
            ) : userNotes.length > 0 ? (
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

          <TabsContent value="followers" className="mt-4 space-y-4">
            {profile.followers.length > 0 ? (
              profile.followers.map((pubkey) => (
                <div key={pubkey} className="flex items-center gap-4 p-4 rounded-lg border">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-lg font-bold">
                    {(userMetadata[pubkey]?.name?.[0] || pubkey.slice(0, 1)).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{userMetadata[pubkey]?.name || pubkey.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground truncate">{userMetadata[pubkey]?.about || pubkey}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No followers yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-4 space-y-4">
            {profile.following.length > 0 ? (
              profile.following.map((pubkey) => (
                <div key={pubkey} className="flex items-center gap-4 p-4 rounded-lg border">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-lg font-bold">
                    {(userMetadata[pubkey]?.name?.[0] || pubkey.slice(0, 1)).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{userMetadata[pubkey]?.name || pubkey.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground truncate">{userMetadata[pubkey]?.about || pubkey}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Not following anyone yet
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}