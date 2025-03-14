import { useState, useEffect } from 'react'
import { useApna } from '../../components/providers/ApnaProvider'
import { feedReactionsDB, ReactionType } from '../feedReactionsDB'
import { INoteLike, INoteRepost } from '@apna/sdk'

interface ReactionCounts {
  likes: number
  reposts: number
  isLoading: boolean
}

/**
 * Custom hook to fetch and track reaction counts for a note
 * @param noteId The ID of the note to get reaction counts for
 * @param refreshKey Optional key to trigger a refresh when changed
 */
export function useReactionCounts(noteId: string, refreshKey?: number): ReactionCounts {
  const [counts, setCounts] = useState<ReactionCounts>({
    likes: 0,
    reposts: 0,
    isLoading: true
  })
  const apna = useApna()

  useEffect(() => {
    let isMounted = true

    const fetchCounts = async () => {
      if (!noteId) return

      try {
        // First get cached counts from the database
        const cachedCounts = await feedReactionsDB.getReactionCountsForNote(noteId)
        
        if (isMounted) {
          setCounts({
            likes: cachedCounts[ReactionType.LIKE],
            reposts: cachedCounts[ReactionType.REPOST],
            isLoading: false
          })
        }

        // Then fetch fresh counts from the network
        const [likes, reposts] = await Promise.all([
          apna.nostr.fetchNoteLikes(noteId),
          apna.nostr.fetchNoteReposts(noteId)
        ])

        // Store the fresh reactions in the database
        await storeReactions(likes, reposts, noteId)

        // Update the UI with fresh counts
        if (isMounted) {
          setCounts({
            likes: likes.length,
            reposts: reposts.length,
            isLoading: false
          })
        }
      } catch (error) {
        console.error('Error fetching reaction counts:', error)
        if (isMounted) {
          setCounts(prev => ({ ...prev, isLoading: false }))
        }
      }
    }

    fetchCounts()

    return () => {
      isMounted = false
    }
  }, [noteId, refreshKey, apna.nostr])

  // Helper function to store reactions in the database
  const storeReactions = async (
    likes: INoteLike[],
    reposts: INoteRepost[],
    noteId: string
  ) => {
    try {
      // Store likes
      for (const like of likes) {
        await feedReactionsDB.addReaction({
          id: `${like.pubkey}:${noteId}:${ReactionType.LIKE}`,
          noteId,
          pubkey: like.pubkey,
          type: ReactionType.LIKE,
          created_at: like.created_at
        })
      }

      // Store reposts
      for (const repost of reposts) {
        await feedReactionsDB.addReaction({
          id: `${repost.pubkey}:${noteId}:${ReactionType.REPOST}`,
          noteId,
          pubkey: repost.pubkey,
          type: ReactionType.REPOST,
          created_at: repost.created_at
        })
      }
    } catch (error) {
      console.error('Error storing reactions:', error)
    }
  }

  return counts
}