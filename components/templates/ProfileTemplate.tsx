"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { NpubDisplay } from "@/components/atoms/NpubDisplay"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Post } from "@/components/ui/post"
import { UserProfileCard } from "@/components/ui/user-profile-card"
import { Fab } from "@/components/ui/fab"
import { useEffect, useState, useCallback } from "react"
import { noteToPostProps } from "@/lib/utils/post"
import { userNotesFeedDB, INITIAL_FETCH_SIZE, LOAD_MORE_SIZE } from "@/lib/userNotesFeedDB"
import { DynamicEditProfile } from "@/components/ui/dynamic-edit-profile"
import type { INote } from "@apna/sdk"

export interface UserProfile {
  metadata: {
    name?: string
    about?: string
    picture?: string
  }
  followers: string[]
  following: string[]
  pubkey: string
}

interface ProfileTemplateProps {
  // Core data
  userProfile: UserProfile
  isCurrentUser: boolean
  
  // UI control flags
  showBackButton?: boolean
  showEditProfile?: boolean
  showFollowButton?: boolean
  showFab?: boolean
  isStale?: boolean
  
  // Edit profile related props
  isEditing?: boolean
  editForm?: {
    name: string
    about: string
  }
  onEditStart?: (data: { name: string; about: string }) => void
  onEditSave?: (data: { name: string; about: string }) => void
  onEditCancel?: () => void
  
  // Action handlers
  onFollowToggle?: () => Promise<void>
  onPublishNote?: (content: string) => Promise<void>
  onLikeNote?: (noteId: string) => void
  onRepostNote?: (noteId: string) => void
  onReplyToNote?: (noteId: string) => void
  
  // Data fetching
  nostr: any
  userMetadata?: Record<string, any>
}

export function ProfileTemplate({
  userProfile,
  isCurrentUser,
  showBackButton = false,
  showEditProfile = false,
  showFollowButton = false,
  showFab = false,
  isStale = false,
  isEditing = false,
  editForm = { name: '', about: '' },
  onEditStart,
  onEditSave,
  onEditCancel,
  onFollowToggle,
  onPublishNote,
  onLikeNote,
  onRepostNote,
  onReplyToNote,
  nostr,
  userMetadata = {}
}: ProfileTemplateProps) {
  const router = useRouter()
  const [userNotes, setUserNotes] = useState<INote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  
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
      const freshNotes = freshEvents.filter((event: any): event is INote => event.kind === 1)
      
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
    if (!userProfile || loadingMore || !hasMore) return
    
    setLoadingMore(true)
    try {
      // Get the oldest note timestamp to use as 'before' parameter
      const oldestNote = userNotes[userNotes.length - 1]
      if (oldestNote) {
        await fetchNotes(userProfile.pubkey, oldestNote.created_at, userNotes.length)
      }
    } catch (error) {
      console.error("Failed to load more notes:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (userProfile) {
      const fetchData = async () => {
        try {
          // Fetch user's notes using our caching function
          await fetchNotes(userProfile.pubkey)
        } catch (error) {
          console.error("Failed to fetch user notes:", error)
        } finally {
          setLoadingNotes(false)
        }
      }

      fetchData()
    }
  }, [userProfile, fetchNotes])

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
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-screen-md mx-auto py-4 px-4">
          {/* Back Button - Only shown on user/[pubkey] page */}
          {showBackButton && (
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          {/* Profile Header */}
          <div className="mb-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 text-2xl">
                    <AvatarImage src={userProfile.metadata.picture} alt="Profile" />
                    <AvatarFallback className="text-2xl font-bold">
                      {editForm.name?.[0] || userProfile.metadata.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => {
                        if (onEditStart) {
                          onEditStart({
                            ...editForm,
                            name: e.target.value
                          });
                        }
                      }}
                      placeholder="Your name"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                    <NpubDisplay pubkey={userProfile.pubkey} className="text-sm text-muted-foreground mt-1" />
                  </div>
                </div>
                
                <div>
                  <textarea
                    value={editForm.about}
                    onChange={(e) => {
                      if (onEditStart) {
                        onEditStart({
                          ...editForm,
                          about: e.target.value
                        });
                      }
                    }}
                    placeholder="About you"
                    className="w-full px-3 py-2 border rounded-md bg-background resize-none h-24"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onEditSave) {
                        onEditSave(editForm);
                      }
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      if (onEditCancel) {
                        onEditCancel();
                      }
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
                    <AvatarImage src={userProfile.metadata.picture} alt="Profile" />
                    <AvatarFallback className="text-2xl font-bold">
                      {userProfile.metadata.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">{userProfile.metadata.name || "Unknown"}</h1>
                      {isStale && (
                        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full animate-pulse">
                          Updating...
                        </div>
                      )}
                    </div>
                    <NpubDisplay pubkey={userProfile.pubkey} className="text-sm text-muted-foreground" />
                    
                    {/* Follow/Unfollow Button - Only shown on user/[pubkey] page */}
                    {showFollowButton && !isCurrentUser && (
                      <Button
                        className="mt-4"
                        variant={isCurrentUser ? "outline" : "default"}
                        onClick={onFollowToggle}
                      >
                        {isCurrentUser ? "Unfollow" : "Follow"}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Edit Profile Button - Only shown on profile page */}
                {showEditProfile && isCurrentUser && (
                  <DynamicEditProfile
                    name={userProfile.metadata.name || ''}
                    about={userProfile.metadata.about || ''}
                    onEdit={({ name, about }: { name: string; about: string }) => {
                      if (onEditStart) {
                        onEditStart({ name, about });
                      }
                    }}
                    className="mt-4 ml-24 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                  />
                )}
                
                {/* Bio */}
                {userProfile.metadata.about && (
                  <p className="mt-4 text-muted-foreground">{userProfile.metadata.about}</p>
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
                <span className="font-bold">{userProfile.followers.length}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </div>
              <div>
                <span className="font-bold">{userProfile.following.length}</span>
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
                          onLike: () => onLikeNote && onLikeNote(note.id),
                          onRepost: () => onRepostNote && onRepostNote(note.id),
                          onReply: () => onReplyToNote && onReplyToNote(note.id)
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
              {userProfile.followers.length > 0 ? (
                userProfile.followers.map((pubkey) => (
                  <UserProfileCard key={pubkey} pubkey={pubkey} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No followers yet
                </div>
              )}
            </TabsContent>

            <TabsContent value="following" className="mt-4 space-y-4">
              {userProfile.following.length > 0 ? (
                userProfile.following.map((pubkey) => (
                  <UserProfileCard key={pubkey} pubkey={pubkey} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Not following anyone yet
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Fab Button - Only shown on profile page */}
        {showFab && onPublishNote && (
          <Fab onPublish={onPublishNote} />
        )}
      </div>
    </>
  )
}