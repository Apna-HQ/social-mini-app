import { useState, useEffect } from 'react'
import { useApna } from '../../components/providers/ApnaProvider'
import { feedReactionsDB, ReactionType } from '../feedReactionsDB'
import type { NostrEvent } from '@apna/sdk'

const BACKGROUND_REFRESH_DELAY_MS = 2500
const FRESH_REACTION_TTL_MS = 5 * 60 * 1000
const freshFetchInFlight = new Map<string, Promise<void>>()
const lastFreshFetchAt = new Map<string, number>()

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
    let refreshTimer: number | undefined

    const fetchCounts = async () => {
      if (!noteId || !apna.social) return

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

        const lastFetch = lastFreshFetchAt.get(noteId) ?? 0
        const shouldRefresh =
          refreshKey !== undefined ||
          Date.now() - lastFetch > FRESH_REACTION_TTL_MS
        if (!shouldRefresh) return

        const delay = refreshKey !== undefined ? 0 : BACKGROUND_REFRESH_DELAY_MS
        refreshTimer = window.setTimeout(async () => {
          if (!isMounted || !apna.social) return

          try {
            const existingWork = freshFetchInFlight.get(noteId)
            const work = existingWork ?? refreshNetworkCounts(noteId, apna.social)
            if (!existingWork) freshFetchInFlight.set(noteId, work)
            await work

            const totalCounts = await feedReactionsDB.getReactionCountsForNote(noteId)
            if (isMounted) {
              setCounts({
                likes: totalCounts[ReactionType.LIKE],
                reposts: totalCounts[ReactionType.REPOST],
                isLoading: false
              })
            }
          } catch (error) {
            console.error('Error refreshing reaction counts:', error)
          }
        }, delay)
      } catch (error) {
        console.error('Error fetching cached reaction counts:', error)
        if (isMounted) {
          setCounts(prev => ({ ...prev, isLoading: false }))
        }
      }
    }

    fetchCounts()

    return () => {
      isMounted = false
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
    }
  }, [noteId, refreshKey, apna.social])

  return counts
}

async function refreshNetworkCounts(
  noteId: string,
  social: NonNullable<ReturnType<typeof useApna>['social']>
) {
  try {
    const mostRecentTimestamp =
      await feedReactionsDB.getMostRecentReactionTimestamp(noteId)
    const since = mostRecentTimestamp ? mostRecentTimestamp : undefined

    const [likes, reposts] = await Promise.all([
      social.v1.noteLikes(noteId, since),
      social.v1.noteReposts(noteId, since)
    ])

    await storeReactions(likes, reposts, noteId)
    lastFreshFetchAt.set(noteId, Date.now())
  } finally {
    freshFetchInFlight.delete(noteId)
  }
}

async function storeReactions(
  likes: NostrEvent[],
  reposts: NostrEvent[],
  noteId: string
) {
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
