import { openDB, DBSchema, IDBPDatabase } from 'idb'

export interface StoredNote {
  id: string
  content: string
  pubkey: string
  created_at: number
  tags: string[][]
  sig: string
  cached_at: number
  user_pubkey: string
}

export interface StoredNotification {
  id: string
  kind: number
  created_at: number
  content: string
  pubkey: string
  tags: string[][]
  sig: string
  cached_at: number
  user_pubkey: string
  [key: string]: any
}

export interface StoredMessage {
  id: string
  sender: string
  recipient: string
  content: string
  created_at: number
  sig: string
  cached_at: number
  user_pubkey: string
  [key: string]: any
}

export interface StoredProfile {
  pubkey: string
  metadata: any
  cached_at: number
}

interface SocialCacheDBSchema extends DBSchema {
  'feed': {
    key: string
    value: StoredNote
    indexes: {
      'by-user-timestamp': [string, number]
      'by-user-cached-at': [string, number]
    }
  }
  'user-notes': {
    key: string
    value: StoredNote
    indexes: {
      'by-user-timestamp': [string, number]
      'by-user-cached-at': [string, number]
    }
  }
  'notifications': {
    key: string
    value: StoredNotification
    indexes: {
      'by-user-timestamp': [string, number]
      'by-user-cached-at': [string, number]
    }
  }
  'messages': {
    key: string
    value: StoredMessage
    indexes: {
      'by-user-timestamp': [string, number]
      'by-user-cached-at': [string, number]
    }
  }
  'profiles': {
    key: string
    value: StoredProfile
    indexes: {
      'by-cached-at': number
    }
  }
}

export const MAX_CACHE_AGE_DAYS = 14
export const MAX_CACHE_ITEMS = 5000

class SocialCacheDB {
  private dbName = 'social-mini-app-unified-cache'
  private dbVersion = 1
  private db: IDBPDatabase<SocialCacheDBSchema> | null = null

  async init(): Promise<IDBPDatabase<SocialCacheDBSchema>> {
    if (this.db) return this.db

    try {
      this.db = await openDB<SocialCacheDBSchema>(this.dbName, this.dbVersion, {
        upgrade(db, oldVersion, newVersion) {
          console.log(`Upgrading socialCacheDB from ${oldVersion} to ${newVersion}`)
          
          const stores = ['feed', 'user-notes', 'notifications', 'messages'] as const
          for (const name of stores) {
            if (!db.objectStoreNames.contains(name)) {
              console.log(`Creating store: ${name}`)
              const store = db.createObjectStore(name, { keyPath: 'id' })
              store.createIndex('by-user-timestamp', ['user_pubkey', 'created_at'])
              store.createIndex('by-user-cached-at', ['user_pubkey', 'cached_at'])
            }
          }

          if (!db.objectStoreNames.contains('profiles')) {
            console.log(`Creating store: profiles`)
            const store = db.createObjectStore('profiles', { keyPath: 'pubkey' })
            store.createIndex('by-cached-at', 'cached_at')
          }
        }
      })
      return this.db
    } catch (error) {
      console.error('Error opening socialCacheDB:', error)
      throw error
    }
  }

  // Generic methods to handle feed, user-notes, notifications, messages
  async addItems(
    storeName: 'feed' | 'user-notes' | 'notifications' | 'messages',
    userPubkey: string,
    items: any[]
  ) {
    if (!userPubkey) return
    if (!items || items.length === 0) return

    try {
      const db = await this.init()
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const now = Date.now()

      // Fetch existing items to avoid overwriting or redundant writes
      const existingItems = await Promise.all(items.map(item => store.get(item.id)))
      const existingIds = new Set(existingItems.filter(Boolean).map(item => item!.id))

      const newItems = items.filter(item => !existingIds.has(item.id))
      if (newItems.length === 0) return

      await Promise.all(
        newItems.map(item => {
          const storedValue = {
            ...item,
            user_pubkey: userPubkey,
            cached_at: now
          }
          return store.put(storedValue)
        })
      )

      await tx.done

      // Trigger cleanup async if items count grows too large
      this.checkAndCleanupStore(storeName, userPubkey)
    } catch (error) {
      console.error(`Error adding items to ${storeName} for user ${userPubkey}:`, error)
    }
  }

  async getItems(
    storeName: 'feed' | 'user-notes' | 'notifications' | 'messages',
    userPubkey: string,
    limit = 20,
    before?: number
  ): Promise<any[]> {
    if (!userPubkey) return []

    try {
      const db = await this.init()
      const tx = db.transaction(storeName, 'readonly')
      const index = tx.objectStore(storeName).index('by-user-timestamp')
      const seen = new Set<string>()

      let range
      if (before) {
        range = IDBKeyRange.bound(
          [userPubkey, 0],
          [userPubkey, before],
          false,
          true
        )
      } else {
        range = IDBKeyRange.bound(
          [userPubkey, 0],
          [userPubkey, Infinity]
        )
      }

      let cursor = await index.openCursor(range, 'prev')
      const results: any[] = []

      while (cursor) {
        const val = cursor.value
        if (!seen.has(val.id)) {
          seen.add(val.id)
          results.push(val)
          if (results.length >= limit) break
        }
        cursor = await cursor.continue()
      }

      return results
    } catch (error) {
      console.error(`Error getting items from ${storeName} for user ${userPubkey}:`, error)
      return []
    }
  }

  async getLatestTimestamp(
    storeName: 'feed' | 'user-notes' | 'notifications' | 'messages',
    userPubkey: string
  ): Promise<number | null> {
    if (!userPubkey) return null
    try {
      const db = await this.init()
      const tx = db.transaction(storeName, 'readonly')
      const index = tx.objectStore(storeName).index('by-user-timestamp')
      const range = IDBKeyRange.bound([userPubkey, 0], [userPubkey, Infinity])
      const cursor = await index.openCursor(range, 'prev')
      return cursor ? cursor.value.created_at : null
    } catch (error) {
      return null
    }
  }

  private async checkAndCleanupStore(
    storeName: 'feed' | 'user-notes' | 'notifications' | 'messages',
    userPubkey: string
  ) {
    try {
      const db = await this.init()
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const userCachedIndex = store.index('by-user-cached-at')

      // 1. Delete old items beyond TTL
      const oldestAllowedDate = Date.now() - (MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000)
      const range = IDBKeyRange.bound(
        [userPubkey, 0],
        [userPubkey, oldestAllowedDate]
      )
      let cursor = await userCachedIndex.openCursor(range)
      const toDelete: string[] = []
      while (cursor) {
        toDelete.push(cursor.value.id)
        cursor = await cursor.continue()
      }
      await Promise.all(toDelete.map(id => store.delete(id)))

      // 2. Bound total items per user
      const userTimestampIndex = store.index('by-user-timestamp')
      let count = 0
      let countCursor = await userTimestampIndex.openCursor(
        IDBKeyRange.bound([userPubkey, 0], [userPubkey, Infinity])
      )
      const excessToDelete: string[] = []
      while (countCursor) {
        count++
        if (count > MAX_CACHE_ITEMS) {
          excessToDelete.push(countCursor.value.id)
        }
        countCursor = await countCursor.continue()
      }
      await Promise.all(excessToDelete.map(id => store.delete(id)))

      await tx.done
    } catch (error) {
      console.error(`Error during cleanup of ${storeName} for user ${userPubkey}:`, error)
    }
  }

  // Profile-specific methods
  async saveProfile(pubkey: string, metadata: any) {
    if (!pubkey) return
    try {
      const db = await this.init()
      const tx = db.transaction('profiles', 'readwrite')
      const store = tx.objectStore('profiles')
      await store.put({
        pubkey,
        metadata,
        cached_at: Date.now()
      })
      await tx.done
    } catch (error) {
      console.error(`Error saving profile metadata for ${pubkey}:`, error)
    }
  }

  async getProfile(pubkey: string): Promise<any | null> {
    if (!pubkey) return null
    try {
      const db = await this.init()
      const val = await db.get('profiles', pubkey)
      return val ? val.metadata : null
    } catch (error) {
      return null
    }
  }
}

export const socialCacheDB = new SocialCacheDB()
