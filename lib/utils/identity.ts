import type { ApnaIdentityDomain, UserProfile } from "@apna/sdk"

type IdentityV1WithFastPubkey = ApnaIdentityDomain["v1"] & {
  activePubkey?: () => Promise<string>
}

export async function getActivePubkey(
  identity: ApnaIdentityDomain | undefined
): Promise<string | null> {
  if (!identity) return null

  const v1 = identity.v1 as IdentityV1WithFastPubkey
  if (typeof v1.activePubkey === "function") {
    try {
      const pubkey = await v1.activePubkey()
      if (pubkey) return pubkey
    } catch (error) {
      console.warn("Fast active pubkey lookup failed; falling back to profile", error)
    }
  }

  const profile = await identity.v1.me()
  return profile?.pubkey ?? null
}

export async function getActiveUserProfile(
  identity: ApnaIdentityDomain | undefined
): Promise<UserProfile | null> {
  if (!identity) return null
  return identity.v1.me()
}
