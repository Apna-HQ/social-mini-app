import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface BaseNote {
  id: string
  content: string
  pubkey: string
  created_at: number
}

interface StoredNote extends BaseNote {
  cached_at: number
}

interface FeedDBSchema extends DBSchema {
  feed: {
    key: string
    value: StoredNote
    indexes: {
      'by-timestamp': number
      'by-cached-at': number
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

    try {
      // Delete old items
      const oldestAllowedDate = Date.now() - (MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000)
      const oldItemsToDelete: string[] = []
      
      let cursor = await cachedAtIndex.openCursor()
      while (cursor) {
        if (cursor.value.cached_at < oldestAllowedDate) {
          oldItemsToDelete.push(cursor.value.id)
        }
        cursor = await cursor.continue()
      }

      // Delete old items in batch
      await Promise.all(oldItemsToDelete.map(id => store.delete(id)))

      // If still too many items, delete oldest by cached_at
      const count = await store.count()
      if (count > MAX_CACHE_ITEMS) {
        const itemsToDelete: string[] = []
        const deleteCount = count - MAX_CACHE_ITEMS
        
        cursor = await cachedAtIndex.openCursor()
        while (cursor && itemsToDelete.length < deleteCount) {
          itemsToDelete.push(cursor.value.id)
          cursor = await cursor.continue()
        }

        // Delete excess items in batch
        await Promise.all(itemsToDelete.map(id => store.delete(id)))
      }

      await tx.done
    } catch (error) {
      console.error('Error during cleanup:', error)
      throw error
    }
  }

  async addNotes(notes: BaseNote[]) {
    const db = await this.init()
    const tx = db.transaction('feed', 'readwrite')
    const store = tx.store
    
    const now = Date.now()
    
    try {
      // Get all existing notes in one batch operation
      const existingNotes = await Promise.all(
        notes.map(note => store.get(note.id))
      )
      const existingNoteIds = new Set(
        existingNotes
          .filter((note): note is StoredNote => note !== null && note !== undefined)
          .map(note => note.id)
      )
      
      // Add new notes with cached_at timestamp
      const notesToAdd = notes.filter(note => !existingNoteIds.has(note.id))
      
      // Transform BaseNotes to StoredNotes
      const storedNotes: StoredNote[] = notesToAdd.map(note => ({
        ...note,
        cached_at: now
      }))
      
      // Store the notes
      await Promise.all(
        storedNotes.map(note => store.put(note))
      )

      // Check count and trigger cleanup while transaction is still active
      const count = await store.count()
      await tx.done

      // Only trigger cleanup after transaction is complete
      if (count > MAX_CACHE_ITEMS * 0.9) { // Cleanup when at 90% capacity
        await this.cleanup()
      }
    } catch (error) {
      console.error('Error adding notes:', error)
      throw error
    }
  }

  async getNotes(limit: number = 20, before?: number): Promise<StoredNote[]> {
    const db = await this.init()
    const tx = db.transaction('feed', 'readonly')
    const index = tx.store.index('by-timestamp')
    const seen = new Set<string>() // Track seen note IDs for deduplication

    let cursor = before
      ? await index.openCursor(IDBKeyRange.upperBound(before), 'prev')
      : await index.openCursor(null, 'prev')

    const notes: StoredNote[] = []

    while (cursor) {
      const note = cursor.value as StoredNote
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