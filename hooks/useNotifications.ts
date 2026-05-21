"use client"

import { useCallback, useEffect, useState } from "react"
import type { SocialNotification } from "@apna/sdk"

import { useApna } from "@/components/providers/ApnaProvider"
import { getActivePubkey } from "@/lib/utils/identity"
import { socialInboxDB } from "@/lib/socialInboxDB"
import { mergeById } from "@/lib/utils/social"

export function useNotifications() {
  const apna = useApna()
  const { social } = apna
  const [notifications, setNotifications] = useState<SocialNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userPubkey, setUserPubkey] = useState<string | null>(null)

  // Get active pubkey
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
        console.error("Failed to get active pubkey in useNotifications:", err)
        setLoading(false)
      }
    }
    void initialize()
    return () => {
      cancelled = true
    }
  }, [apna.identity])

  const refresh = useCallback(async () => {
    if (!social || !userPubkey) return
    setError(null)
    try {
      const items = await social.v1.notifications({ limit: 80 })
      setNotifications((current) => mergeById(current, items))
      void socialInboxDB.saveNotifications(userPubkey, items)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [social, userPubkey])

  // Load cached notifications immediately on pubkey availability
  useEffect(() => {
    if (!userPubkey) return
    let cancelled = false
    
    const loadCached = async () => {
      try {
        const cached = await socialInboxDB.getNotifications(userPubkey, 80)
        if (!cancelled && cached.length > 0) {
          setNotifications(cached)
          setLoading(false)
        }
      } catch (err) {
        console.error("Error loading cached notifications:", err)
      }
      
      void refresh()
    }
    
    void loadCached()
    return () => {
      cancelled = true
    }
  }, [userPubkey, refresh])

  useEffect(() => {
    if (!social || !userPubkey) return
    const unsubscribe = social.v1.subscribeNotifications(
      { since: Math.floor(Date.now() / 1000), limit: 100 },
      (event) => {
        setNotifications((current) => mergeById(current, [event]))
        void socialInboxDB.saveNotifications(userPubkey, [event])
      }
    )
    return unsubscribe
  }, [social, userPubkey])

  return { notifications, loading, error, refresh }
}
