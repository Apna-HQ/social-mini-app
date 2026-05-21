import { useEffect, useState } from 'react'
import { useApna } from '@/components/providers/ApnaProvider'

interface UserProfile {
  name?: string
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
    if (!pubkey) return
    const cached = metadataCache.get(pubkey)
    if (cached) {
      setProfile(cached)
      return
    }

    let cancelled = false
    const existing = inFlight.get(pubkey)
    const work = existing ?? (async () => {
      // userMetadata fetches only kind-0 (avatar/name) instead of the
      // full profile (which also pulls followers — much heavier).
      const meta = (await apna.social!.v1.userMetadata(pubkey).catch(() => ({}))) || {}
      const displayName =
        (meta as { display_name?: string }).display_name ||
        (meta as { name?: string }).name
      const next: UserProfile = {
        name: displayName,
        picture: (meta as { picture?: string }).picture,
        pubkey,
      }
      metadataCache.set(pubkey, next)
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
