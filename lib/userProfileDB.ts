import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface UserProfileDBSchema extends DBSchema {
  profiles: {
    key: string // pubkey
    value: {
      pubkey: string
      metadata: {
        name?: string
        about?: string
        picture?: string
      }
      followers: string[]
      following: string[]
      cached_at: number
    }
    indexes: {
      'by-cached-at': number
    }
  }
}

export const MAX_CACHE_AGE_HOURS = 25 // Cache profiles for 1 hour
export const MAX_CACHE_ITEMS = 10000 // Maximum number of profiles to keep in cache
export const STALE_AFTER_MINUTES = 1440 // Consider data stale after 1440 minutes

class UserProfileDB {
  private dbName = 'social-mini-app-profiles'
  private version = 1
  private db: IDBPDatabase<UserProfileDBSchema> | null = null

  async init() {
    if (this.db) return this.db

    this.db = await openDB<UserProfileDBSchema>(this.dbName, this.version, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profiles')) {
          const store = db.createObjectStore('profiles', { keyPath: 'pubkey' })
          store.createIndex('by-cached-at', 'cached_at')
        }
      },
    })

    // Run cleanup on init
    this.cleanup()

    return this.db
  }

  private async cleanup() {
    const db = await this.init()
    
    // First transaction: Delete old items
    const tx1 = db.transaction('profiles', 'readwrite')
    const store1 = tx1.objectStore('profiles')
    const cachedAtIndex1 = store1.index('by-cached-at')
    
    const oldestAllowedDate = Date.now() - (MAX_CACHE_AGE_HOURS * 60 * 60 * 1000)
    let cursor = await cachedAtIndex1.openCursor()
    
    while (cursor) {
      if (cursor.value.cached_at < oldestAllowedDate) {
        await cursor.delete()
      }
      cursor = await cursor.continue()
    }
    
    await tx1.done

    // Second transaction: Check count and delete excess items
    const tx2 = db.transaction('profiles', 'readwrite')
    const store2 = tx2.objectStore('profiles')
    const cachedAtIndex2 = store2.index('by-cached-at')
    
    const count = await store2.count()
    if (count > MAX_CACHE_ITEMS) {
      cursor = await cachedAtIndex2.openCursor()
      let deletedCount = 0
      const deleteCount = count - MAX_CACHE_ITEMS
      
      while (cursor && deletedCount < deleteCount) {
        await cursor.delete()
        deletedCount++
        cursor = await cursor.continue()
      }
    }
    
    await tx2.done
  }

  async getProfile(pubkey: string): Promise<{
    profile: any
    isStale: boolean
  } | null> {
    const db = await this.init()
    const profile = await db.get('profiles', pubkey)

    if (!profile) {
      return null
    }

    // Check if data is stale
    const isStale = Date.now() - profile.cached_at > STALE_AFTER_MINUTES * 60 * 1000

    return {
      profile,
      isStale
    }
  }

  async updateProfile(profile: {
    pubkey: string
    metadata: {
      name?: string
      about?: string
      picture?: string
    }
    followers: string[]
    following: string[]
  }) {
    if (!profile.pubkey) {
      throw new Error('Profile must have a pubkey')
    }

    const db = await this.init()
    const tx = db.transaction('profiles', 'readwrite')
    const store = tx.store

    const profileToStore = {
      pubkey: profile.pubkey,
      metadata: profile.metadata || {},
      followers: profile.followers || [],
      following: profile.following || [],
      cached_at: Date.now()
    }

    await store.put(profileToStore)
    
    // Check count within the same transaction
    const count = await store.count()
    
    await tx.done

    // Trigger cleanup if we might be over limit
    if (count > MAX_CACHE_ITEMS * 0.9) { // Cleanup when at 90% capacity
      await this.cleanup()
    }
  }
}

export const userProfileDB = new UserProfileDB()