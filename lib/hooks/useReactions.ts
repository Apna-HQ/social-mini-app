import { useState, useCallback } from 'react'
import { likeNote, repostNote } from '../utils/reactions'
import { useReactionCounts } from './useReactionCounts'
import { useApna } from '../../components/providers/ApnaProvider'

interface UseReactionsProps {
  noteId: string
  pubkey: string
}

interface UseReactionsResult {
  likes: number
  reposts: number
  isLoading: boolean
  handleLike: () => Promise<void>
  handleRepost: () => Promise<void>
}

/**
 * Custom hook to handle note reactions (likes and reposts)
 * @param noteId The ID of the note
 * @param pubkey The public key of the current user
 */
export function useReactions({ noteId, pubkey }: UseReactionsProps): UseReactionsResult {
  const [refreshKey, setRefreshKey] = useState(0)
  const { likes, reposts, isLoading } = useReactionCounts(noteId, refreshKey)
  const apna = useApna()

  // Force refresh of reaction counts
  const refreshCounts = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  // Handle like action
  const handleLike = useCallback(async () => {
    if (!noteId || !pubkey) return
    
    try {
      const success = await likeNote(noteId, pubkey, apna.nostr)
      if (success) {
        refreshCounts()
      }
    } catch (error) {
      console.error('Error handling like:', error)
    }
  }, [noteId, pubkey, refreshCounts, apna.nostr])

  // Handle repost action
  const handleRepost = useCallback(async () => {
    if (!noteId || !pubkey) return
    
    try {
      const success = await repostNote(noteId, pubkey, apna.nostr)
      if (success) {
        refreshCounts()
      }
    } catch (error) {
      console.error('Error handling repost:', error)
    }
  }, [noteId, pubkey, refreshCounts, apna.nostr])

  return {
    likes,
    reposts,
    isLoading,
    handleLike,
    handleRepost
  }
}