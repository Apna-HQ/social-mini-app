"use client"

import { useApp } from "../providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { Post } from "@/components/ui/post"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Fab } from "@/components/ui/fab"
import { DynamicEditProfile } from "@/components/ui/dynamic-edit-profile"
import { useEffect, useState } from "react"

export default function ProfilePage() {
  const { profile, updateProfileMetadata, publishNote } = useApp()
  const { nostr } = useApna()
  const [userNotes, setUserNotes] = useState<any[]>([])
  const [userMetadata, setUserMetadata] = useState<Record<string, any>>({})
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    about: ''
  })

  useEffect(() => {
    if (profile) {
      const fetchData = async () => {
        try {
          // Fetch user's notes using NOTES_FEED
          const notes = await nostr.fetchUserFeed(profile.pubkey, 'NOTES_FEED', undefined, undefined, 20)
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
              const userMetadata = await nostr.fetchUserMetadata(pubkey)
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
        <div className="container max-w-screen-md py-4 px-4">
          <div className="text-center py-8 text-muted-foreground">
            Loading profile...
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background">
      <div className="container max-w-screen-md py-4 px-4">
        {/* Profile Header */}
        <div className="mb-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-2xl font-bold">
                  {editForm.name?.[0] || profile.metadata.name?.[0] || "U"}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                  <p className="text-sm text-muted-foreground break-all mt-1">{profile.pubkey}</p>
                </div>
              </div>
              
              <div>
                <textarea
                  value={editForm.about}
                  onChange={(e) => setEditForm(prev => ({ ...prev, about: e.target.value }))}
                  placeholder="About you"
                  className="w-full px-3 py-2 border rounded-md bg-background resize-none h-24"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await updateProfileMetadata({
                        name: editForm.name,
                        about: editForm.about
                      });
                      setIsEditing(false);
                    } catch (error) {
                      console.error("Failed to update profile:", error);
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      name: profile.metadata.name || '',
                      about: profile.metadata.about || ''
                    });
                  }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-2xl font-bold">
                  {profile.metadata.name?.[0] || "U"}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">{profile.metadata.name || "Unknown"}</h1>
                  <p className="text-sm text-muted-foreground break-all">{profile.pubkey}</p>
                </div>
              </div>
              <DynamicEditProfile
                name={profile.metadata.name || ''}
                about={profile.metadata.about || ''}
                onEdit={({ name, about }: { name: string; about: string }) => {
                  setEditForm({ name, about });
                  setIsEditing(true);
                }}
                className="mt-4 ml-24 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              />
              
              {/* Bio */}
              {profile.metadata.about && (
                <p className="mt-4 text-muted-foreground">{profile.metadata.about}</p>
              )}
            </>
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
      <Fab onPublish={publishNote} />
      </div>
    </>
  )
}