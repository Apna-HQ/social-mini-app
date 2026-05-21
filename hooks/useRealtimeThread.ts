"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { INote } from "@apna/sdk"

import { useApna } from "@/components/providers/ApnaProvider"
import { threadDB } from "@/lib/threadDB"
import { getRootEventId, isNote, mergeById } from "@/lib/utils/social"

export function useRealtimeThread(noteId: string) {
  const { social } = useApna()
  const [rootNote, setRootNote] = useState<INote | null>(null)
  const [replies, setReplies] = useState<INote[]>([])
  const [subscriptionId, setSubscriptionId] = useState(noteId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const rootNoteRef = useRef<INote | null>(null)
  const refreshRequestRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!social || !noteId) return
    const requestId = ++refreshRequestRef.current
    setError(null)
    try {
      const result = await social.v1.noteAndReplies(noteId, false)
      const rootId = getRootEventId(result.note as any)
      const thread = rootId && rootId !== noteId
        ? await social.v1.noteAndReplies(rootId, false)
        : result
      const nextRootNote = thread.note as INote
      const nextReplies = thread.replyNotes as INote[]

      if (requestId !== refreshRequestRef.current) return

      setRootNote(nextRootNote)
      setReplies(nextReplies)
      setSubscriptionId(nextRootNote.id)
      void threadDB.saveThreadSnapshot(noteId, nextRootNote, nextReplies)
      if (nextRootNote.id !== noteId) {
        void threadDB.saveThreadSnapshot(nextRootNote.id, nextRootNote, nextReplies)
      }
    } catch (err) {
      if (requestId !== refreshRequestRef.current) return
      if (rootNoteRef.current) {
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      if (requestId === refreshRequestRef.current) {
        setLoading(false)
      }
    }
  }, [noteId, social])

  useEffect(() => {
    let cancelled = false

    setRootNote(null)
    setReplies([])
    setSubscriptionId(noteId)
    setLoading(true)
    setError(null)
    refreshRequestRef.current += 1

    void threadDB.getThreadSnapshot(noteId).then((snapshot) => {
      if (cancelled || !snapshot) return
      setRootNote(snapshot.root_note)
      setReplies(snapshot.replies)
      setSubscriptionId(snapshot.root_id)
      setError(null)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [noteId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    rootNoteRef.current = rootNote
  }, [rootNote])

  useEffect(() => {
    if (!social || !subscriptionId) return
    const unsubscribe = social.v1.subscribeThread(
      subscriptionId,
      { since: Math.floor(Date.now() / 1000), limit: 100 },
      (event) => {
        if (!isNote(event)) return
        setReplies((current) => {
          const nextReplies = mergeById(current, [event])
          const currentRoot = rootNoteRef.current
          if (currentRoot) {
            void threadDB.saveThreadSnapshot(noteId, currentRoot, nextReplies)
            if (currentRoot.id !== noteId) {
              void threadDB.saveThreadSnapshot(currentRoot.id, currentRoot, nextReplies)
            }
          }
          return nextReplies
        })
      }
    )
    return unsubscribe
  }, [noteId, social, subscriptionId])

  return { rootNote, replies, loading, error, refresh }
}
