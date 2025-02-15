import { useEffect, useState } from 'react'
import { userProfileDB } from '../userProfileDB'
import { useApna } from '@/components/providers/ApnaProvider'

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
  const apna = useApna()

  useEffect(() => {
    let isMounted = true

    const fetchProfile = async () => {
      try {
        // First try to get from cache
        const cachedResult = await userProfileDB.getProfile(pubkey)
        
        if (cachedResult?.profile) {
          if (isMounted) {
            setProfile({
              name: cachedResult.profile.metadata.name,
              picture: cachedResult.profile.metadata.picture,
              pubkey
            })
          }

          // If data is stale, fetch fresh data
          if (cachedResult.isStale) {
            try {
              // First try to get full profile
              const freshProfile = await apna.nostr.fetchUserProfile(pubkey)
              
              if (freshProfile && isMounted) {
                // Update cache
                await userProfileDB.updateProfile({
                  pubkey,
                  metadata: freshProfile.metadata,
                  followers: freshProfile.followers || [],
                  following: freshProfile.following || []
                })

                // Update state with fresh data
                setProfile({
                  name: freshProfile.metadata.name,
                  picture: freshProfile.metadata.picture,
                  pubkey
                })
              }
            } catch (error) {
              // If full profile fetch fails, try to get just metadata
              try {
                const metadata = await apna.nostr.fetchUserMetadata(pubkey)
                if (metadata && isMounted) {
                  // Update cache with just metadata
                  await userProfileDB.updateProfile({
                    pubkey,
                    metadata,
                    followers: [],
                    following: []
                  })

                  // Update state
                  setProfile({
                    name: metadata.name,
                    picture: metadata.picture,
                    pubkey
                  })
                }
              } catch (metadataError) {
                console.error('Error fetching user metadata:', metadataError)
              }
            }
          }
        } else {
          // No cached data, fetch fresh
          try {
            // First try to get full profile
            const freshProfile = await apna.nostr.fetchUserProfile(pubkey)
            
            if (freshProfile && isMounted) {
              // Update cache
              await userProfileDB.updateProfile({
                pubkey,
                metadata: freshProfile.metadata,
                followers: freshProfile.followers || [],
                following: freshProfile.following || []
              })

              // Update state
              setProfile({
                name: freshProfile.metadata.name,
                picture: freshProfile.metadata.picture,
                pubkey
              })
            }
          } catch (error) {
            // If full profile fetch fails, try to get just metadata
            try {
              const metadata = await apna.nostr.fetchUserMetadata(pubkey)
              if (metadata && isMounted) {
                // Update cache with just metadata
                await userProfileDB.updateProfile({
                  pubkey,
                  metadata,
                  followers: [],
                  following: []
                })

                // Update state
                setProfile({
                  name: metadata.name,
                  picture: metadata.picture,
                  pubkey
                })
              }
            } catch (metadataError) {
              console.error('Error fetching user metadata:', metadataError)
            }
          }
        }
      } catch (error) {
        console.error('Error in profile fetch:', error)
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [pubkey, apna])

  return profile
}