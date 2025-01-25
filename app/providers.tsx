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
    try {
      // First try to load cached notes before anything else
      const { feedDB, INITIAL_FETCH_SIZE } = await import('@/lib/feedDB')
      const cachedNotes = await feedDB.getNotes(INITIAL_FETCH_SIZE)
      
      if (cachedNotes.length > 0) {
        setNotes(cachedNotes)
        setLastTimestamp(cachedNotes[cachedNotes.length - 1].created_at)
        setLoading(false) // Show cached content immediately
      }

      // Initialize apna in parallel
      if (!apna) {
        const { ApnaApp } = (await import('@apna/sdk'))
        apna = new ApnaApp({ appId: 'apna-nostr-mvp-1' })
        // @ts-ignore
        window.apna = apna
      }

      // Get profile
      const userProfile = await apna.nostr.getActiveUserProfile()
      if (userProfile) {
        setProfile({
          metadata: userProfile.metadata,
          pubkey: userProfile.nprofile.split(':')[1],
          stats: {
            posts: 0
          }
        })
      }

      // Determine fetch size based on cache state
      const fetchSize = cachedNotes.length === 0 ? INITIAL_FETCH_SIZE : 20

      // Fetch fresh notes
      let latestTimestamp: number | undefined = undefined
      if (cachedNotes.length > 0) {
        const timestamp = await feedDB.getLatestTimestamp()
        if (timestamp !== null) {
          latestTimestamp = timestamp
        }
      }

      const freshNotes = await apna.nostr.fetchFeed(
        'FOLLOWING_FEED',
        latestTimestamp,
        undefined,
        fetchSize
      )

      if (freshNotes.length > 0) {
        await feedDB.addNotes(freshNotes)
        
        // Update state with deduplication
        setNotes(prev => {
          const seenIds = new Set(prev.map(note => note.id))
          const uniqueNewNotes = freshNotes.filter(note => !seenIds.has(note.id))
          return [...uniqueNewNotes, ...prev].sort((a, b) => b.created_at - a.created_at)
        })

        // Update timestamp only if we got new items
        if (freshNotes[freshNotes.length - 1].created_at < (lastTimestamp || Infinity)) {
          setLastTimestamp(freshNotes[freshNotes.length - 1].created_at)
        }
      }

      // If we had no cached notes and now have fresh notes, remove loading state
      if (cachedNotes.length === 0) {
        setLoading(false)
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
      const { feedDB } = await import('@/lib/feedDB')
      
      // Keep track of note IDs we've already seen
      const seenNoteIds = new Set(notes.map(note => note.id))
      
      const { LOAD_MORE_SIZE } = await import('@/lib/feedDB')
      
      // First try to get cached older notes
      const cachedOlderNotes = await feedDB.getNotes(LOAD_MORE_SIZE, lastTimestamp)
      const uniqueCachedNotes = cachedOlderNotes.filter(note => !seenNoteIds.has(note.id))
      
      if (uniqueCachedNotes.length > 0) {
        uniqueCachedNotes.forEach(note => seenNoteIds.add(note.id))
        setNotes(prevNotes => {
          const newNotes = [...prevNotes, ...uniqueCachedNotes].sort((a, b) => b.created_at - a.created_at)
          return newNotes
        })
        setLastTimestamp(uniqueCachedNotes[uniqueCachedNotes.length - 1].created_at)
      }
      
      // Then fetch from network if we need more notes
      if (uniqueCachedNotes.length < LOAD_MORE_SIZE) {
        const olderNotes = await apna.nostr.fetchFeed(
          'FOLLOWING_FEED',
          undefined,
          lastTimestamp,
          LOAD_MORE_SIZE
        )
        const uniqueNetworkNotes = olderNotes.filter(note => !seenNoteIds.has(note.id))
        
        if (uniqueNetworkNotes.length > 0) {
          // Store in cache for future loads
          await feedDB.addNotes(uniqueNetworkNotes)
          
          setNotes(prevNotes => {
            const newNotes = [...prevNotes, ...uniqueNetworkNotes].sort((a, b) => b.created_at - a.created_at)
            return newNotes
          })
          setLastTimestamp(uniqueNetworkNotes[uniqueNetworkNotes.length - 1].created_at)
        }
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
      const result = await apna.nostr.publishNote(content)
      // Add the new note to IndexedDB and state
      if (result) {
        const { feedDB } = await import('@/lib/feedDB')
        await feedDB.addNotes([result])
        setNotes(prev => [result, ...prev].sort((a, b) => b.created_at - a.created_at))
      }
    } catch (error) {
      console.error("Failed to publish note:", error)
      throw error
    }
  }

  const likeNote = async (id: string) => {
    try {
      const result = await apna.nostr.likeNote(id)
      // Optionally update local state if the API returns updated note data
      if (result) {
        const { feedDB } = await import('@/lib/feedDB')
        await feedDB.addNotes([result])
        setNotes(prev =>
          prev.map(note => note.id === id ? result : note)
        )
      }
    } catch (error) {
      console.error("Failed to like note:", error)
      throw error
    }
  }

  const repostNote = async (id: string) => {
    try {
      const result = await apna.nostr.repostNote(id, '')
      // Add the repost to IndexedDB and state if returned
      if (result) {
        const { feedDB } = await import('@/lib/feedDB')
        await feedDB.addNotes([result])
        setNotes(prev => [result, ...prev].sort((a, b) => b.created_at - a.created_at))
      }
    } catch (error) {
      console.error("Failed to repost note:", error)
      throw error
    }
  }

  const replyToNote = async (id: string, content: string) => {
    try {
      const result = await apna.nostr.replyToNote(id, content)
      // Add the reply to IndexedDB and state if returned
      if (result) {
        const { feedDB } = await import('@/lib/feedDB')
        await feedDB.addNotes([result])
        setNotes(prev => [result, ...prev].sort((a, b) => b.created_at - a.created_at))
      }
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