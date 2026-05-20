"use client"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useApna } from "@/components/providers/ApnaProvider";
import type {
  DirectMessage,
  Note,
  NoteAndReplies,
  NotePublishOptions,
  NostrEvent,
  UserMetadata,
} from "@apna/sdk";

interface Profile {
  metadata: UserMetadata
  stats: {
    posts: number
  }
  pubkey: string
  followers: string[]
  following: string[]
}

interface AppContextType {
  profile: Profile | null; // Keep profile and other non-feed related items
  refreshProfile: () => Promise<void>
  publishNote: (content: string, options?: NotePublishOptions) => Promise<Note | void>
  reactToNote: (id: string, content?: string) => Promise<NostrEvent | void>
  likeNote: (id: string) => Promise<NostrEvent | void>
  repostNote: (id: string) => Promise<NostrEvent | void>
  quoteRepostNote: (id: string, content: string, options?: NotePublishOptions) => Promise<NostrEvent | void>
  replyToNote: (id: string, content: string, options?: NotePublishOptions) => Promise<Note | void>
  sendDirectMessage: (pubkey: string, content: string) => Promise<DirectMessage | void>
  fetchNoteAndReplies: (id: string) => Promise<NoteAndReplies>
  updateProfileMetadata: (metadata: UserMetadata) => Promise<void>
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
  const fetchInitialProfile = useCallback(async () => {
    try {
      // identity.v1.me() returns UserProfile with pubkey (hex) directly
      const userProfile = await apna.identity!.v1.me();

      if (userProfile && userProfile.pubkey) {
        setProfile({
          metadata: userProfile.metadata,
          pubkey: userProfile.pubkey,
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
  }, [apna]);

  // Fetch profile on mount
  useEffect(() => {
    void fetchInitialProfile();
  }, [fetchInitialProfile]); // Depend on apna context

  const publishNote = async (content: string, options?: NotePublishOptions) => {
    if (!content.trim()) return undefined
    try {
      await ensureApnaInitialized()
      return await apna.social!.v1.publishNote(content, options)
    } catch (error) {
      console.error("Failed to publish note:", error)
      throw error
    }
  }

  const likeNote = async (id: string) => {
    return reactToNote(id, "+")
  }

  const reactToNote = async (id: string, content: string = "+") => {
    if (!profile?.pubkey) {
      throw new Error('No active user profile')
    }
    
    try {
      await ensureApnaInitialized()
      return await apna.social!.v1.react(id, content)
    } catch (error) {
      console.error("Failed to react to note:", error)
      throw error
    }
  }

  const repostNote = async (id: string) => {
    if (!profile?.pubkey) {
      throw new Error('No active user profile')
    }
    
    try {
      await ensureApnaInitialized()
      return await apna.social!.v1.repost(id)
    } catch (error) {
      console.error("Failed to repost note:", error)
      throw error
    }
  }

  const quoteRepostNote = async (id: string, content: string, options?: NotePublishOptions) => {
    if (!profile?.pubkey) {
      throw new Error('No active user profile')
    }

    try {
      await ensureApnaInitialized()
      return await apna.social!.v1.quoteRepost(id, content, options)
    } catch (error) {
      console.error("Failed to quote repost note:", error)
      throw error
    }
  }

  const replyToNote = async (id: string, content: string, options?: NotePublishOptions) => {
    if (!profile?.pubkey) {
      throw new Error('No active user profile')
    }
    
    try {
      await ensureApnaInitialized()
      return await apna.social!.v1.reply(id, content, options)
    } catch (error) {
      console.error("Failed to reply to note:", error)
      throw error
    }
  }

  const sendDirectMessage = async (pubkey: string, content: string) => {
    if (!profile?.pubkey) {
      throw new Error('No active user profile')
    }

    try {
      await ensureApnaInitialized()
      return await apna.social!.v1.sendDirectMessage(pubkey, content)
    } catch (error) {
      console.error("Failed to send direct message:", error)
      throw error
    }
  }

  const updateProfileMetadata = async (metadata: UserMetadata) => {
    try {
      await ensureApnaInitialized()
      const result = await apna.identity!.v1.updateProfile(metadata)
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
      const result = await apna.social!.v1.noteAndReplies(id)
      return result
    } catch (error) {
      console.error("Failed to fetch note and replies:", error)
      throw error
    }
  }

  const fetchUserProfile = async (pubkey: string): Promise<Profile | null> => {
    try {
      await ensureApnaInitialized()
      const fetchedProfile = await apna.social!.v1.userProfile(pubkey)

      if (fetchedProfile) {
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
      refreshProfile: fetchInitialProfile,
      publishNote,
      reactToNote,
      likeNote,
      repostNote,
      quoteRepostNote,
      replyToNote,
      sendDirectMessage,
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
