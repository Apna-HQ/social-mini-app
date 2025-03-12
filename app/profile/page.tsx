"use client"

import { useApp } from "../providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { Post } from "@/components/ui/post"
import { noteToPostProps } from "@/lib/utils/post"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Fab } from "@/components/ui/fab"
import { DynamicEditProfile } from "@/components/ui/dynamic-edit-profile"
import { useEffect, useState, useCallback } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { userNotesFeedDB, INITIAL_FETCH_SIZE, LOAD_MORE_SIZE } from "@/lib/userNotesFeedDB"
import { Button } from "@/components/ui/button"
import type { INote } from "@apna/sdk"

export default function ProfilePage() {
  const router = useRouter()
  const { profile, updateProfileMetadata, publishNote, likeNote, replyToNote } = useApp()
  const { nostr } = useApna()
  const [userNotes, setUserNotes] = useState<INote[]>([])
  const [userMetadata, setUserMetadata] = useState<Record<string, any>>({})
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    about: ''
  })

  // Function to fetch notes from cache or API
  const fetchNotes = useCallback(async (pubkey: string, before?: number, currentLength: number = 0) => {
    try {
      // First try to get notes from cache
      const cachedNotes = await userNotesFeedDB.getNotes(
        pubkey,
        before ? LOAD_MORE_SIZE : INITIAL_FETCH_SIZE,
        before
      )
      
      // Convert StoredNotes to INote format
      const convertToINote = (note: any): INote => ({
        ...note,
        kind: 1, // Notes are kind 1
        sig: note.sig || '',
        tags: note.tags || [],
      });
      
      // If we have cached notes, use them immediately
      if (cachedNotes.length > 0) {
        const convertedNotes = cachedNotes.map(convertToINote);
        
        if (before) {
          // Append to existing notes if loading more
          setUserNotes(prev => [...prev, ...convertedNotes])
        } else {
          // Replace notes if initial load
          setUserNotes(convertedNotes)
        }
        
        // Check if we might have more notes to load
        setHasMore(cachedNotes.length >= (before ? LOAD_MORE_SIZE : INITIAL_FETCH_SIZE))
      }
      
      // Get the latest timestamp we have in cache (only used for initial load)
      const latestTimestamp = before ? undefined : await userNotesFeedDB.getLatestTimestamp(pubkey)
      
      // Fetch fresh notes from API
      // When loading more (before is defined), we don't need since parameter
      const since = before ? undefined : (latestTimestamp ? latestTimestamp + 1 : undefined)
      const until = before || undefined
      const limit = before ? LOAD_MORE_SIZE : INITIAL_FETCH_SIZE
      
      const freshEvents = await nostr.fetchUserFeed(pubkey, 'NOTES_FEED', since, until, limit)
      const freshNotes = freshEvents.filter((event): event is INote => event.kind === 1)
      
      // If we got fresh notes, add them to cache and update state
      if (freshNotes.length > 0) {
        // Add to cache
        await userNotesFeedDB.addNotes(pubkey, freshNotes)
        
        // Get updated notes from cache to ensure correct order
        const updatedNotes = await userNotesFeedDB.getNotes(
          pubkey,
          before ? currentLength + LOAD_MORE_SIZE : INITIAL_FETCH_SIZE
        )
        
        setUserNotes(updatedNotes.map(convertToINote))
        setHasMore(freshNotes.length >= limit)
      } else if (cachedNotes.length === 0) {
        // If no cached notes and no fresh notes, we have no notes
        setUserNotes([])
        setHasMore(false)
      }
    } catch (error) {
      console.error("Failed to fetch user notes:", error)
    }
  }, [nostr])

  // Load more notes
  const loadMoreNotes = async () => {
    if (!profile || loadingMore || !hasMore) return
    
    setLoadingMore(true)
    try {
      // Get the oldest note timestamp to use as 'before' parameter
      const oldestNote = userNotes[userNotes.length - 1]
      if (oldestNote) {
        await fetchNotes(profile.pubkey, oldestNote.created_at, userNotes.length)
      }
    } catch (error) {
      console.error("Failed to load more notes:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (profile) {
      const fetchData = async () => {
        try {
          // Fetch user's notes using our caching function
          await fetchNotes(profile.pubkey)
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
  }, [profile, fetchNotes, nostr])

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-screen-md mx-2 py-4">
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
      <div className="max-w-screen-md mx-2 py-4">
        {/* Profile Header */}
        <div className="mb-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 text-2xl">
                  <AvatarImage src={profile.metadata.picture} alt="Profile" />
                  <AvatarFallback className="text-2xl font-bold">
                    {editForm.name?.[0] || profile.metadata.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
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
                <Avatar className="w-20 h-20 text-2xl">
                  <AvatarImage src={profile.metadata.picture} alt="Profile" />
                  <AvatarFallback className="text-2xl font-bold">
                    {profile.metadata.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
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
              <>
                <div className="space-y-4">
                  {userNotes.map((note) => (
                    <Post
                      key={note.id}
                      {...noteToPostProps(note, {
                        onLike: () => likeNote(note.id),
                        onRepost: () => nostr.repostNote(note.id, ''),
                        onReply: () => router.push(`/note/${note.id}`)
                      })}
                    />
                  ))}
                </div>
                
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button
                      variant="outline"
                      onClick={loadMoreNotes}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </>
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
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={userMetadata[pubkey]?.picture} alt="Profile" />
                    <AvatarFallback className="text-lg font-bold">
                      {(userMetadata[pubkey]?.name?.[0] || pubkey.slice(0, 1)).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
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
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={userMetadata[pubkey]?.picture} alt="Profile" />
                    <AvatarFallback className="text-lg font-bold">
                      {(userMetadata[pubkey]?.name?.[0] || pubkey.slice(0, 1)).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
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