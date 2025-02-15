"use client"

import { useApp } from "../../providers"
import { useApna } from "@/components/providers/ApnaProvider"
import { Post } from "@/components/ui/post"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { userProfileDB } from "@/lib/userProfileDB"
import { UserProfileCard } from "@/components/ui/user-profile-card"
import { noteToPostProps } from "@/lib/utils/post"

export const dynamic = 'force-dynamic'

export default function UserProfilePage({ params }: { params: { pubkey: string } }) {
  const router = useRouter()
  const { profile } = useApp()
  const { nostr } = useApna()
  const [userNotes, setUserNotes] = useState<any[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [userProfile, setUserProfile] = useState<{
    metadata: {
      name?: string;
      about?: string;
      picture?: string;
    };
    followers: string[];
    following: string[];
  } | null>(null)
  const [userMetadata, setUserMetadata] = useState<Record<string, any>>({})
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check cache first
        const cachedData = await userProfileDB.getProfile(params.pubkey)
        
        if (cachedData) {
          // Use cached data immediately
          setUserProfile(cachedData.profile)
          setIsStale(cachedData.isStale)
          
          // Fetch metadata for followers and following from cached data
          const metadata: Record<string, any> = {}
          const allUsers = Array.from(new Set([...cachedData.profile.followers, ...cachedData.profile.following]))
          
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
          
          // If data is stale, fetch fresh data in background
          if (cachedData.isStale) {
            fetchFreshData()
          }
        } else {
          // No cache, fetch fresh data
          await fetchFreshData()
        }

        // Fetch user's notes
        const notes = await nostr.fetchUserFeed(params.pubkey, 'NOTES_FEED', undefined, undefined, 20)
        setUserNotes(notes)

      } catch (error) {
        console.error("Failed to fetch user data:", error)
      } finally {
        setLoadingNotes(false)
      }
    }

    const fetchFreshData = async () => {
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

        // Fetch metadata for followers and following
        const metadata: Record<string, any> = {}
        const allUsers = Array.from(new Set([...freshProfile.followers, ...freshProfile.following]))

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
      } catch (error) {
        console.error("Failed to fetch fresh data:", error)
      }
    }

    fetchData()
  }, [params.pubkey])

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
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-md mx-auto py-4 px-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-2xl font-bold">
              {userProfile.metadata.name?.[0] || "U"}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{userProfile.metadata.name || "Unknown"}</h1>
                {isStale && (
                  <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full animate-pulse">
                    Updating...
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground break-all">{params.pubkey}</p>
            </div>
          </div>
          {profile && profile.pubkey !== params.pubkey && (
            <Button
              className="mt-4 ml-24"
              variant={profile.following.includes(params.pubkey) ? "outline" : "default"}
              onClick={async () => {
                try {
                  if (profile.following.includes(params.pubkey)) {
                    await nostr.unfollowUser(params.pubkey);
                  } else {
                    await nostr.followUser(params.pubkey);
                  }
                } catch (error) {
                  console.error("Failed to follow/unfollow user:", error);
                }
              }}
            >
              {profile.following.includes(params.pubkey) ? "Unfollow" : "Follow"}
            </Button>
          )}
          
          {/* Bio */}
          {userProfile.metadata.about && (
            <p className="mt-4 text-muted-foreground">{userProfile.metadata.about}</p>
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
              userNotes.map((note) => (
                <Post
                  key={note.id}
                  {...noteToPostProps(note, {
                    onLike: () => nostr.likeNote(note.id),
                    onRepost: () => nostr.repostNote(note.id, ''),
                    onReply: () => router.push(`/note/${note.id}`)
                  })}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No notes yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="followers" className="mt-4 space-y-4">
            {userProfile.followers.length > 0 ? (
              userProfile.followers.map((pubkey) => (
                <UserProfileCard
                  key={pubkey}
                  pubkey={pubkey}
                  name={userMetadata[pubkey]?.name}
                  about={userMetadata[pubkey]?.about}
                  picture={userMetadata[pubkey]?.picture}
                  showFollowButton={!!profile}
                  isFollowing={profile?.following.includes(pubkey)}
                  onFollowToggle={async () => {
                    try {
                      if (profile?.following.includes(pubkey)) {
                        await nostr.unfollowUser(pubkey);
                      } else {
                        await nostr.followUser(pubkey);
                      }
                    } catch (error) {
                      console.error("Failed to follow/unfollow user:", error);
                    }
                  }}
                />
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
                <UserProfileCard
                  key={pubkey}
                  pubkey={pubkey}
                  name={userMetadata[pubkey]?.name}
                  about={userMetadata[pubkey]?.about}
                  picture={userMetadata[pubkey]?.picture}
                  showFollowButton={!!profile}
                  isFollowing={profile?.following.includes(pubkey)}
                  onFollowToggle={async () => {
                    try {
                      if (profile?.following.includes(pubkey)) {
                        await nostr.unfollowUser(pubkey);
                      } else {
                        await nostr.followUser(pubkey);
                      }
                    } catch (error) {
                      console.error("Failed to follow/unfollow user:", error);
                    }
                  }}
                />
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