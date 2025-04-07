"use client"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { nip19 } from "nostr-tools"
import { useApna } from "@/components/providers/ApnaProvider";
import type { BaseNote } from "@/lib/feedDB"; // Import BaseNote

type DecodedNprofile = {
  type: 'nprofile'
  data: {
    pubkey: string
    relays?: string[]
  }
}

interface Profile {
  metadata: {
    name?: string
    about?: string
    picture?: string
    nip05?: string
    banner?: string
    [key: string]: any
  }
  stats: {
    posts: number
  }
  pubkey: string
  followers: string[]
  following: string[]
}

interface AppContextType {
  profile: Profile | null; // Keep profile and other non-feed related items
  publishNote: (content: string) => Promise<void>
  likeNote: (id: string) => Promise<void>
  repostNote: (id: string) => Promise<void>
  replyToNote: (id: string, content: string) => Promise<void>
  fetchNoteAndReplies: (id: string) => Promise<any>
  updateProfileMetadata: (metadata: { name?: string, about?: string }) => Promise<void>
// Removed saveScrollPosition and savedScrollAnchorId
  fetchUserProfile: (pubkey: string) => Promise<Profile | null>
}

const AppContext = createContext<AppContextType | null>(null)


// Removed SCROLL_ANCHOR_KEY constant

const ensureApnaInitialized = async () => {
  console.log("ensure")
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const apna = useApna();
  // Removed notes, loading, loadingMore, refreshing, lastTimestamp state
 // Removed savedScrollAnchorId state

 // Removed saveScrollPosition function

  // Removed useEffect that saved window.scrollY on unmount

  // Removed fetchInitialFeed, refreshFeed, loadMore functions
  // Fetch initial profile info (Keep this part)
  const fetchInitialProfile = async () => {
    try {
      const userProfile = await apna.nostr.getActiveUserProfile();
      let userPubkey: string | null = null;

      if (userProfile) {
        userPubkey = (() => {
          try {
            const decoded = nip19.decode(userProfile.nprofile) as DecodedNprofile;
            if (decoded.type === 'nprofile' && decoded.data.pubkey) {
              const npub = nip19.npubEncode(decoded.data.pubkey);
              return nip19.decode(npub).data as string;
            }
          } catch (e) {
            console.error("Failed to decode nprofile for initial profile fetch:", e);
          }
          return null;
        })();
      }

      if (userPubkey) {
        setProfile({
          metadata: userProfile.metadata,
          pubkey: userPubkey,
          stats: { posts: 0 }, // Initial stats, might be updated elsewhere
          followers: userProfile.followers || [],
          following: userProfile.following || [],
        });
      } else {
        console.error("No active user pubkey found for initial profile fetch");
      }
    } catch (error) {
      console.error("Failed to fetch initial profile:", error);
    }
  };

  // Fetch profile on mount
  useEffect(() => {
    fetchInitialProfile();
  }, [apna]); // Depend on apna context

  const publishNote = async (content: string) => {
    if (!content.trim()) return
    try {
      await ensureApnaInitialized()
      const result = await apna.nostr.publishNote(content)
    } catch (error) {
      console.error("Failed to publish note:", error)
      throw error
    }
  }

  const likeNote = async (id: string) => {
    if (!profile?.pubkey) {
      throw new Error('No active user profile')
    }
    
    try {
      await ensureApnaInitialized()
      const result = await apna.nostr.likeNote(id)
      // Don't add reactions to feedDB or update notes state
      // as reactions are not notes themselves but reaction events
    } catch (error) {
      console.error("Failed to like note:", error)
      throw error
    }
  }

  const repostNote = async (id: string) => {
    if (!profile?.pubkey) {
      throw new Error('No active user profile')
    }
    
    try {
      await ensureApnaInitialized()
      const result = await apna.nostr.repostNote(id, '')
      if (result) {
        // Map INoteRepost to BaseNote before adding to DB
        const repostForDb: BaseNote = {
          id: result.id,
          content: result.content,
          pubkey: result.pubkey,
          created_at: result.created_at,
          tags: result.tags as string[][], // Assert type compatibility
          sig: result.sig,
        };
        // We still need feedDB instance here, ensure it's imported if not already
        const { feedDB } = await import('@/lib/feedDB');
        await feedDB.addNotes(profile.pubkey, [repostForDb])
        // Removed setNotes call - feed state is managed by useFeed hook now
      }
    } catch (error) {
      console.error("Failed to repost note:", error)
      throw error
    }
  }

  const replyToNote = async (id: string, content: string) => {
    if (!profile?.pubkey) {
      throw new Error('No active user profile')
    }
    
    try {
      await ensureApnaInitialized()
      const result = await apna.nostr.replyToNote(id, content)
      if (result) {
        // Map INoteReply to BaseNote before adding to DB
        const replyForDb: BaseNote = {
          id: result.id,
          content: result.content,
          pubkey: result.pubkey,
          created_at: result.created_at,
          tags: result.tags as string[][], // Assert type compatibility
          sig: result.sig,
        };
        // Ensure feedDB instance is imported if not already
        const { feedDB } = await import('@/lib/feedDB');
        await feedDB.addNotes(profile.pubkey, [replyForDb])
        // Removed setNotes call - feed state is managed by useFeed hook now
      }
    } catch (error) {
      console.error("Failed to reply to note:", error)
      throw error
    }
  }

  const updateProfileMetadata = async (metadata: { name?: string, about?: string }) => {
    try {
      await ensureApnaInitialized()
      const result = await apna.nostr.updateProfileMetadata(metadata)
      if (result) {
        setProfile({
          ...profile!,
          metadata: result.metadata
        })
      }
    } catch (error) {
      console.error("Failed to update profile metadata:", error)
      throw error
    }
  }

  const fetchNoteAndReplies = async (id: string) => {
    try {
      await ensureApnaInitialized()
      const result = await apna.nostr.fetchNoteAndReplies(id)
      return result
    } catch (error) {
      console.error("Failed to fetch note and replies:", error)
      throw error
    }
  }

  const fetchUserProfile = async (pubkey: string): Promise<Profile | null> => {
    const { userProfileDB } = await import('@/lib/userProfileDB')
    const cachedProfile = await userProfileDB.getProfile(pubkey)

    if (cachedProfile && !cachedProfile.isStale) {
      return cachedProfile.profile
    }

    try {
      await ensureApnaInitialized()
      const fetchedProfile = await apna.nostr.fetchUserProfile(pubkey)

      if (fetchedProfile) {
        const profileToCache = {
          pubkey: pubkey,
          metadata: fetchedProfile.metadata,
          followers: fetchedProfile.followers || [],
          following: fetchedProfile.following || []
        }
        await userProfileDB.updateProfile(profileToCache)

        return {
          metadata: fetchedProfile.metadata,
          pubkey: pubkey,
          stats: {
            posts: 0
          },
          followers: fetchedProfile.followers || [],
          following: fetchedProfile.following || []
        }
      }

      return null
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
      return null
    }
  }

  return (
    <AppContext.Provider value={{
      // Provide only the remaining context values
      profile,
      publishNote,
      likeNote,
      repostNote,
      replyToNote,
      fetchNoteAndReplies,
      updateProfileMetadata,
      // Removed saveScrollPosition and savedScrollAnchorId from context value
      fetchUserProfile
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}