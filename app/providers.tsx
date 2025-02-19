"use client"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { nip19 } from "nostr-tools"
import { useApna } from "@/components/providers/ApnaProvider"

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
  notes: any[]
  profile: Profile | null
  loading: boolean
  loadingMore: boolean
  refreshing: boolean
  loadMore: () => Promise<void>
  refreshFeed: () => Promise<void>
  publishNote: (content: string) => Promise<void>
  likeNote: (id: string) => Promise<void>
  repostNote: (id: string) => Promise<void>
  replyToNote: (id: string, content: string) => Promise<void>
  fetchNoteAndReplies: (id: string) => Promise<any>
  updateProfileMetadata: (metadata: { name?: string, about?: string }) => Promise<void>
  saveScrollPosition: (position: number) => void
  savedScrollPosition: number | null,
  fetchUserProfile: (pubkey: string) => Promise<Profile | null>
}

const AppContext = createContext<AppContextType | null>(null)


const SCROLL_POSITION_KEY = 'feed-scroll-position'

const ensureApnaInitialized = async () => {
  console.log("ensure")
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<any[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const apna = useApna()
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)
  const [savedScrollPosition, setSavedScrollPosition] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SCROLL_POSITION_KEY)
      return saved ? Number(saved) : null
    }
    return null
  })

  const saveScrollPosition = useCallback((position: number) => {
    setSavedScrollPosition(position)
    localStorage.setItem(SCROLL_POSITION_KEY, position.toString())
  }, [])

  useEffect(() => {
    return () => {
      const currentScroll = window.scrollY
      localStorage.setItem(SCROLL_POSITION_KEY, currentScroll.toString())
    }
  }, [])

  const fetchInitialFeed = async () => {
    try {
      const { feedDB, INITIAL_FETCH_SIZE } = await import('@/lib/feedDB')
      const cachedNotes = await feedDB.getNotes(INITIAL_FETCH_SIZE)
      
      if (cachedNotes.length > 0) {
        setNotes(cachedNotes)
        setLastTimestamp(cachedNotes[cachedNotes.length - 1].created_at)
        setLoading(false)
      }

      await ensureApnaInitialized()
      // apna.nostr.test()
      const userProfile = await apna.nostr.getActiveUserProfile()
      if (userProfile) {
        setProfile({
          metadata: userProfile.metadata,
          pubkey: (() => {
            const decoded = nip19.decode(userProfile.nprofile) as DecodedNprofile
            if (decoded.type === 'nprofile' && decoded.data.pubkey) {
              // Encode the pubkey as npub and then decode it to get the hex string
              const npub = nip19.npubEncode(decoded.data.pubkey)
              return nip19.decode(npub).data as string
            }
            throw new Error('Invalid nprofile format')
          })(),
          stats: {
            posts: 0
          },
          followers: userProfile.followers || [],
          following: userProfile.following || []
        })
      }

      const fetchSize = cachedNotes.length === 0 ? INITIAL_FETCH_SIZE : 20

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
        
        setNotes(prev => {
          const seenIds = new Set(prev.map(note => note.id))
          // @ts-ignore
          const uniqueNewNotes = freshNotes.filter(note => !seenIds.has(note.id))
          return [...uniqueNewNotes, ...prev].sort((a, b) => b.created_at - a.created_at)
        })

        if (freshNotes[freshNotes.length - 1].created_at < (lastTimestamp || Infinity)) {
          setLastTimestamp(freshNotes[freshNotes.length - 1].created_at)
        }
      }

      if (cachedNotes.length === 0) {
        setLoading(false)
      }
    } catch (error) {
      console.error("Failed to initialize:", error)
    } finally {
      setLoading(false)
    }
  }

  const refreshFeed = async () => {
    if (refreshing) return
    
    setRefreshing(true)
    try {
      const { feedDB } = await import('@/lib/feedDB')
      
      const timestamp = await feedDB.getLatestTimestamp()
      
      const freshNotes = await apna.nostr.fetchFeed(
        'FOLLOWING_FEED',
        timestamp || undefined,
        undefined,
        20
      )

      if (freshNotes.length > 0) {
        await feedDB.addNotes(freshNotes)
        
        setNotes(prev => {
          const seenIds = new Set(prev.map(note => note.id))
          // @ts-ignore
          const uniqueNewNotes = freshNotes.filter(note => !seenIds.has(note.id))
          return [...uniqueNewNotes, ...prev].sort((a, b) => b.created_at - a.created_at)
        })
      }
    } catch (error) {
      console.error("Failed to refresh feed:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const loadMore = async () => {
    if (loadingMore || !lastTimestamp) return
    
    setLoadingMore(true)
    try {
      const { feedDB } = await import('@/lib/feedDB')
      
      const seenNoteIds = new Set(notes.map(note => note.id))
      
      const { LOAD_MORE_SIZE } = await import('@/lib/feedDB')
      
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
      
      if (uniqueCachedNotes.length < LOAD_MORE_SIZE) {
        const olderNotes = await apna.nostr.fetchFeed(
          'FOLLOWING_FEED',
          undefined,
          lastTimestamp,
          LOAD_MORE_SIZE
        )
        // @ts-ignore
        const uniqueNetworkNotes = olderNotes.filter(note => !seenNoteIds.has(note.id))
        
        if (uniqueNetworkNotes.length > 0) {
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
      await ensureApnaInitialized()
      const result = await apna.nostr.publishNote(content)
    } catch (error) {
      console.error("Failed to publish note:", error)
      throw error
    }
  }

  const likeNote = async (id: string) => {
    try {
      await ensureApnaInitialized()
      const result = await apna.nostr.likeNote(id)
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
      await ensureApnaInitialized()
      const result = await apna.nostr.repostNote(id, '')
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
      await ensureApnaInitialized()
      const result = await apna.nostr.replyToNote(id, content)
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
      notes,
      profile,
      loading,
      loadingMore,
      refreshing,
      loadMore,
      refreshFeed,
      publishNote,
      likeNote,
      repostNote,
      replyToNote,
      fetchNoteAndReplies,
      updateProfileMetadata,
      saveScrollPosition,
      savedScrollPosition,
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