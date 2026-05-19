"use client"

import { useCallback, useEffect, useState } from "react"
import type { SocialNotification } from "@apna/sdk"

import { useApna } from "@/components/providers/ApnaProvider"
import { mergeById } from "@/lib/utils/social"

export function useNotifications() {
  const { social } = useApna()
  const [notifications, setNotifications] = useState<SocialNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!social) return
    setError(null)
    try {
      const items = await social.v1.notifications({ limit: 80 })
      setNotifications(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [social])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!social) return
    const unsubscribe = social.v1.subscribeNotifications(
      { since: Math.floor(Date.now() / 1000), limit: 100 },
      (event) => setNotifications((current) => mergeById(current, [event]))
    )
    return unsubscribe
  }, [social])

  return { notifications, loading, error, refresh }
}
