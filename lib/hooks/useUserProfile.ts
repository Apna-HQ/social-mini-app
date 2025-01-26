import { useEffect, useState } from 'react'
import { userProfileDB } from '../userProfileDB'

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

  useEffect(() => {
    const fetchProfile = async () => {
      const result = await userProfileDB.getProfile(pubkey)
      if (result?.profile) {
        setProfile({
          name: result.profile.metadata.name,
          picture: result.profile.metadata.picture,
          pubkey
        })
      }
    }

    fetchProfile()
  }, [pubkey])

  return profile
}