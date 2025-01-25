"use client"
import { createContext, useContext, useEffect, useState } from "react"
import { ApnaApp } from "@apna/sdk"

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
}

interface AppContextType {
  notes: any[]
  profile: Profile | null
  loading: boolean
  loadingMore: boolean
  loadMore: () => Promise<void>
  publishNote: (content: string) => Promise<void>
  likeNote: (id: string) => Promise<void>
  repostNote: (id: string) => Promise<void>
  replyToNote: (id: string, content: string) => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

let apna: ApnaApp

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<any[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)

  const fetchInitialFeed = async () => {
    if (!apna) {
      const { ApnaApp } = (await import('@apna/sdk'))
      apna = new ApnaApp({ appId: 'apna-nostr-mvp-1' })
      // @ts-ignore
      window.apna = apna
    }

    try {
      // Get profile
      const userProfile = await apna.nostr.getActiveUserProfile()
      if (userProfile) {
        setProfile({
          metadata: userProfile.metadata,
          pubkey: userProfile.nprofile.split(':')[1], // Extract pubkey from nprofile
          stats: {
            posts: 0
          }
        })
      }

      // Fetch initial feed
      const initialNotes = await apna.nostr.fetchFeed('FOLLOWING_FEED', undefined, undefined, 20)
      if (initialNotes.length > 0) {
        setNotes(initialNotes.sort((a, b) => b.created_at - a.created_at))
        setLastTimestamp(initialNotes[initialNotes.length - 1].created_at)
      }
    } catch (error) {
      console.error("Failed to initialize:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (loadingMore || !lastTimestamp) return
    
    setLoadingMore(true)
    try {
      const olderNotes = await apna.nostr.fetchFeed('FOLLOWING_FEED', undefined, lastTimestamp, 20)
      if (olderNotes.length > 0) {
        setNotes(prevNotes => {
          const newNotes = [...prevNotes, ...olderNotes].sort((a, b) => b.created_at - a.created_at)
          return newNotes
        })
        setLastTimestamp(olderNotes[olderNotes.length - 1].created_at)
      }
    } catch (error) {
      console.error("Failed to load more notes:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchInitialFeed()
  }, [])

  const publishNote = async (content: string) => {
    if (!content.trim()) return
    try {
      await apna.nostr.publishNote(content)
    } catch (error) {
      console.error("Failed to publish note:", error)
      throw error
    }
  }

  const likeNote = async (id: string) => {
    try {
      await apna.nostr.likeNote(id)
    } catch (error) {
      console.error("Failed to like note:", error)
      throw error
    }
  }

  const repostNote = async (id: string) => {
    try {
      await apna.nostr.repostNote(id, '')
    } catch (error) {
      console.error("Failed to repost note:", error)
      throw error
    }
  }

  const replyToNote = async (id: string, content: string) => {
    try {
      await apna.nostr.replyToNote(id, content)
    } catch (error) {
      console.error("Failed to reply to note:", error)
      throw error
    }
  }

  return (
    <AppContext.Provider value={{
      notes,
      profile,
      loading,
      loadingMore,
      loadMore,
      publishNote,
      likeNote,
      repostNote,
      replyToNote
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