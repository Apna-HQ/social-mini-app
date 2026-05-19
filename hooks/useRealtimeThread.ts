"use client"

import { useCallback, useEffect, useState } from "react"
import type { INote } from "@apna/sdk"

import { useApna } from "@/components/providers/ApnaProvider"
import { getRootEventId, isNote, mergeById } from "@/lib/utils/social"

export function useRealtimeThread(noteId: string) {
  const { social } = useApna()
  const [rootNote, setRootNote] = useState<INote | null>(null)
  const [replies, setReplies] = useState<INote[]>([])
  const [subscriptionId, setSubscriptionId] = useState(noteId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!social || !noteId) return
    setError(null)
    try {
      const result = await social.v1.noteAndReplies(noteId, true)
      const rootId = getRootEventId(result.note as any)
      const thread = rootId && rootId !== noteId
        ? await social.v1.noteAndReplies(rootId, true)
        : result

      setRootNote(thread.note as INote)
      setReplies(thread.replyNotes as INote[])
      setSubscriptionId(thread.note.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [noteId, social])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!social || !subscriptionId) return
    const unsubscribe = social.v1.subscribeThread(
      subscriptionId,
      { since: Math.floor(Date.now() / 1000), limit: 100 },
      (event) => {
        if (!isNote(event)) return
        setReplies((current) => mergeById(current, [event]))
      }
    )
    return unsubscribe
  }, [social, subscriptionId])

  return { rootNote, replies, loading, error, refresh }
}
