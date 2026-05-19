"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { DirectMessage } from "@apna/sdk"

import { useApna } from "@/components/providers/ApnaProvider"
import { groupMessagesByPeer, mergeById } from "@/lib/utils/social"

export function useMessages(peerPubkey?: string) {
  const { social } = useApna()
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!social) return
    setError(null)
    try {
      const items = await social.v1.messages({ peerPubkey, limit: 120 })
      setMessages(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [peerPubkey, social])

  const sendMessage = useCallback(
    async (targetPubkey: string, content: string) => {
      if (!social || !content.trim()) return
      const sent = await social.v1.sendDirectMessage(targetPubkey, content)
      setMessages((current) => mergeById(current, [sent]))
      return sent
    },
    [social]
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!social) return
    const unsubscribe = social.v1.subscribeMessages(
      {
        peerPubkey,
        since: Math.floor(Date.now() / 1000),
        limit: 100,
      },
      (event) => setMessages((current) => mergeById(current, [event]))
    )
    return unsubscribe
  }, [peerPubkey, social])

  const conversations = useMemo(() => groupMessagesByPeer(messages), [messages])

  return { conversations, messages, loading, error, refresh, sendMessage }
}
