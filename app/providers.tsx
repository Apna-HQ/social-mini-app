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

  useEffect(() => {
    const init = async () => {
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
              posts: 0 // Will be updated as we receive notes
            }
          })
        }

        // Subscribe to feed
        await apna.nostr.subscribeToFeed('FOLLOWING_FEED', (e: any) => {
          setNotes(prevNotes => {
            // Sort by timestamp in descending order (newest first)
            const newNotes = [...prevNotes, e].sort((a, b) => b.created_at - a.created_at)
            
            // Update post count in profile stats if it's the user's post
            if (profile && e.pubkey === profile.pubkey) {
              setProfile(prev => {
                if (!prev) return null
                return {
                  ...prev,
                  stats: {
                    ...prev.stats,
                    posts: newNotes.filter(note => note.pubkey === profile.pubkey).length
                  }
                }
              })
            }
            
            return newNotes
          })
        })
      } catch (error) {
        console.error("Failed to initialize:", error)
      } finally {
        setLoading(false)
      }
    }

    init()
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