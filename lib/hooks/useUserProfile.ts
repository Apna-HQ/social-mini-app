import { useEffect, useState } from 'react'
import { useApp } from '@/app/providers'

interface UserProfile {
  name?: string
  picture?: string
  pubkey: string
}

export function useUserProfile(pubkey: string): UserProfile {
  const [profile, setProfile] = useState<UserProfile>({
    name: undefined,
    picture: undefined,
    pubkey
  })
  const { fetchUserProfile } = useApp();

  useEffect(() => {
    const fetchProfile = async () => {
      const result = await fetchUserProfile(pubkey)
      setProfile({
        name: result?.metadata.name,
        picture: result?.metadata.picture,
        pubkey
      })
    }

    fetchProfile()
  }, [pubkey, fetchUserProfile])

  return profile
}