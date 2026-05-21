import { useEffect, useState } from 'react'
import { useApna } from '@/components/providers/ApnaProvider'
import { socialCacheDB } from '@/lib/socialCacheDB'

interface UserProfile {
  name?: string
  about?: string
  picture?: string
  pubkey: string
}

/**
 * Process-wide cache + in-flight dedupe for kind-0 metadata.
 * The feed renders one Post per note, and many notes can share an
 * author — fetching metadata once per render once is fine, but once
 * per Post per render is what was making the feed feel broken.
 */
const metadataCache = new Map<string, UserProfile>()
const inFlight = new Map<string, Promise<UserProfile>>()

export function useUserProfile(pubkey: string): UserProfile {
  const [profile, setProfile] = useState<UserProfile>(
    () => metadataCache.get(pubkey) ?? { name: undefined, picture: undefined, pubkey }
  )
  const apna = useApna()

  useEffect(() => {
    if (!pubkey || !apna.social) return
    const cached = metadataCache.get(pubkey)
    if (cached) {
      setProfile(cached)
      return
    }

    let cancelled = false
    void socialCacheDB.getProfile(pubkey).then((cachedMetadata) => {
      if (cancelled || !cachedMetadata || metadataCache.has(pubkey)) return

      const cachedProfile = profileFromMetadata(pubkey, cachedMetadata)
      metadataCache.set(pubkey, cachedProfile)
      setProfile(cachedProfile)
    })

    const existing = inFlight.get(pubkey)
    const work = existing ?? (async () => {
      // userMetadata fetches only kind-0 (avatar/name) instead of the
      // full profile (which also pulls followers — much heavier).
      const meta = (await apna.social!.v1.userMetadata(pubkey).catch(() => ({}))) || {}
      const next = profileFromMetadata(pubkey, meta)
      metadataCache.set(pubkey, next)
      void socialCacheDB.saveProfile(pubkey, meta)
      return next
    })()
    if (!existing) inFlight.set(pubkey, work)

    work.then((result) => {
      inFlight.delete(pubkey)
      if (!cancelled) setProfile(result)
    })

    return () => { cancelled = true }
  }, [pubkey, apna])

  return profile
}

function profileFromMetadata(pubkey: string, metadata: unknown): UserProfile {
  const meta = (metadata || {}) as {
    about?: string
    display_name?: string
    name?: string
    picture?: string
  }

  return {
    name: meta.display_name || meta.name,
    about: meta.about,
    picture: meta.picture,
    pubkey,
  }
}
