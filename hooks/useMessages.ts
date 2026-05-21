"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { DirectMessage } from "@apna/sdk"

import { useApna } from "@/components/providers/ApnaProvider"
import { socialInboxDB } from "@/lib/socialInboxDB"
import { getActivePubkey } from "@/lib/utils/identity"
import { groupMessagesByPeer, mergeById } from "@/lib/utils/social"

export function useMessages(peerPubkey?: string) {
  const apna = useApna()
  const { social } = apna
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userPubkey, setUserPubkey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const initialize = async () => {
      try {
        const pubkey = await getActivePubkey(apna.identity)
        if (cancelled) return
        if (pubkey) {
          setUserPubkey(pubkey)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error("Failed to get active pubkey in useMessages:", err)
        if (!cancelled) setLoading(false)
      }
    }

    void initialize()
    return () => {
      cancelled = true
    }
  }, [apna.identity])

  const refresh = useCallback(async () => {
    if (!social) return
    setError(null)
    try {
      const items = await social.v1.messages({ peerPubkey, limit: 120 })
      setMessages(items)
      if (userPubkey) {
        void socialInboxDB.saveMessages(userPubkey, items)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [peerPubkey, social, userPubkey])

  const sendMessage = useCallback(
    async (targetPubkey: string, content: string) => {
      if (!social || !content.trim()) return
      const sent = await social.v1.sendDirectMessage(targetPubkey, content)
      setMessages((current) => mergeById(current, [sent]))
      if (userPubkey) {
        void socialInboxDB.saveMessages(userPubkey, [sent])
      }
      return sent
    },
    [social, userPubkey]
  )

  useEffect(() => {
    if (!userPubkey) return
    let cancelled = false

    const loadCached = async () => {
      const cached = await socialInboxDB.getMessages(userPubkey, { peerPubkey, limit: 120 })
      if (!cancelled && cached.length > 0) {
        setMessages(cached)
        setLoading(false)
      }

      void refresh()
    }

    void loadCached()
    return () => {
      cancelled = true
    }
  }, [peerPubkey, refresh, userPubkey])

  useEffect(() => {
    if (!social || !userPubkey) return
    const unsubscribe = social.v1.subscribeMessages(
      {
        peerPubkey,
        since: Math.floor(Date.now() / 1000),
        limit: 100,
      },
      (event) => {
        setMessages((current) => mergeById(current, [event]))
        void socialInboxDB.saveMessages(userPubkey, [event])
      }
    )
    return unsubscribe
  }, [peerPubkey, social, userPubkey])

  const conversations = useMemo(() => groupMessagesByPeer(messages), [messages])

  return { conversations, messages, loading, error, refresh, sendMessage }
}
