import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface FeedDBSchema extends DBSchema {
  feed: {
    key: string
    value: {
      id: string
      content: string
      pubkey: string
      created_at: number
      cached_at: number // New field to track when the note was cached
    }
    indexes: {
      'by-timestamp': number
      'by-cached-at': number // New index for cache cleanup
    }
  }
}

export const MAX_CACHE_AGE_DAYS = 14 // Cache items for 14 days
export const MAX_CACHE_ITEMS = 5000 // Maximum number of items to keep in cache
export const INITIAL_FETCH_SIZE = 100 // Number of items to fetch on first load
export const LOAD_MORE_SIZE = 50 // Number of items to fetch when loading more

class FeedDB {
  private dbName = 'social-mini-app-feed'
  private version = 2 // Increased version for schema update
  private db: IDBPDatabase<FeedDBSchema> | null = null

  async init() {
    if (this.db) return this.db

    this.db = await openDB<FeedDBSchema>(this.dbName, this.version, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // For new databases or upgrades
        if (!db.objectStoreNames.contains('feed')) {
          const store = db.createObjectStore('feed', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'created_at');
          store.createIndex('by-cached-at', 'cached_at');
        }

        // For version 1 to 2 upgrade, add cached_at to existing records
        if (oldVersion === 1 && db.objectStoreNames.contains('feed')) {
          const store = transaction.objectStore('feed');
          if (!store.indexNames.contains('by-cached-at')) {
            store.createIndex('by-cached-at', 'cached_at');
          }

          // Add cached_at to all existing records
          const now = Date.now();
          store.openCursor().then(async function updateCursors(cursor) {
            if (!cursor) return;
            await cursor.update({
              ...cursor.value,
              cached_at: now
            });
            const nextCursor = await cursor.continue();
            await updateCursors(nextCursor);
          });
        }
      },
    })

    // Run cleanup on init
    this.cleanup()

    return this.db
  }

  private async cleanup() {
    const db = await this.init()
    const tx = db.transaction('feed', 'readwrite')
    const store = tx.objectStore('feed')
    const cachedAtIndex = store.index('by-cached-at')

    // Delete old items
    const oldestAllowedDate = Date.now() - (MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000)
    let cursor = await cachedAtIndex.openCursor()
    
    while (cursor) {
      if (cursor.value.cached_at < oldestAllowedDate) {
        await cursor.delete()
      }
      cursor = await cursor.continue()
    }

    // If still too many items, delete oldest by cached_at
    const count = await store.count()
    if (count > MAX_CACHE_ITEMS) {
      cursor = await cachedAtIndex.openCursor()
      let deletedCount = 0
      const deleteCount = count - MAX_CACHE_ITEMS
      
      while (cursor && deletedCount < deleteCount) {
        await cursor.delete()
        deletedCount++
        cursor = await cursor.continue()
      }
    }

    await tx.done
  }

  async addNotes(notes: any[]) {
    const db = await this.init()
    const tx = db.transaction('feed', 'readwrite')
    const store = tx.store
    
    const now = Date.now()
    const existingNotes = new Set()
    
    // Get existing note IDs to prevent duplicates
    for (const note of notes) {
      const existing = await store.get(note.id)
      if (existing) {
        existingNotes.add(note.id)
      }
    }
    
    // Add new notes with cached_at timestamp
    await Promise.all([
      ...notes
        .filter(note => !existingNotes.has(note.id))
        .map(note => store.put({
          ...note,
          cached_at: now
        })),
      tx.done
    ])

    // Trigger cleanup if we might be over limit
    const count = await store.count()
    if (count > MAX_CACHE_ITEMS * 0.9) { // Cleanup when at 90% capacity
      this.cleanup()
    }
  }

  async getNotes(limit: number = 20, before?: number): Promise<any[]> {
    const db = await this.init()
    const tx = db.transaction('feed', 'readonly')
    const index = tx.store.index('by-timestamp')
    const seen = new Set<string>() // Track seen note IDs for deduplication

    let cursor = before
      ? await index.openCursor(IDBKeyRange.upperBound(before), 'prev')
      : await index.openCursor(null, 'prev')

    const notes: any[] = []

    while (cursor) {
      const note = cursor.value
      if (!seen.has(note.id)) {
        seen.add(note.id)
        notes.push(note)
        if (notes.length >= limit) break
      }
      cursor = await cursor.continue()
    }

    return notes
  }

  async getLatestTimestamp(): Promise<number | null> {
    const db = await this.init()
    const tx = db.transaction('feed', 'readonly')
    const index = tx.store.index('by-timestamp')
    
    const cursor = await index.openCursor(null, 'prev')
    return cursor ? cursor.value.created_at : null
  }

  async getOldestTimestamp(): Promise<number | null> {
    const db = await this.init()
    const tx = db.transaction('feed', 'readonly')
    const index = tx.store.index('by-timestamp')
    
    const cursor = await index.openCursor(null, 'next')
    return cursor ? cursor.value.created_at : null
  }
}

export const feedDB = new FeedDB()