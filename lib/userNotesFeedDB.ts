import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface BaseNote {
  id: string
  content: string
  pubkey: string
  created_at: number
}

interface StoredNote extends BaseNote {
  cached_at: number
  user_pubkey: string // The pubkey of the user whose feed this note belongs to
}

// Define the store schema
interface UserNotesStoreSchema extends DBSchema {
  'user-notes': {
    key: string // Note ID
    value: StoredNote
    indexes: {
      'by-user-timestamp': [string, number] // [user_pubkey, created_at] for efficient retrieval
      'by-user-cached-at': [string, number] // [user_pubkey, cached_at] for cleanup
    }
  }
}

export const MAX_CACHE_AGE_DAYS = 14 // Cache items for 14 days
export const MAX_CACHE_ITEMS = 5000 // Maximum number of items to keep in cache per user
export const INITIAL_FETCH_SIZE = 10 // Number of items to fetch on first load
export const LOAD_MORE_SIZE = 50 // Number of items to fetch when loading more

class UserNotesFeedDB {
  private dbName = 'social-mini-app-user-notes-feed'
  private versionKey = 'social-mini-app-user-notes-feed-version'
  private db: IDBPDatabase<UserNotesStoreSchema> | null = null
  
  // Get the current version from localStorage or use default
  private get version(): number {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedVersion = localStorage.getItem(this.versionKey);
      if (storedVersion) {
        return parseInt(storedVersion, 10);
      }
    }
    return 1; // Default version for user notes feed
  }
  
  // Set the version and persist it to localStorage
  private set version(newVersion: number) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.versionKey, newVersion.toString());
    }
  }

  async init() {
    if (this.db) return this.db

    const currentVersion = this.version;
    console.log(`Opening database ${this.dbName} with version ${currentVersion}`);

    try {
      this.db = await openDB<UserNotesStoreSchema>(this.dbName, currentVersion, {
        upgrade(db, oldVersion, newVersion) {
          console.log(`Upgrading database from ${oldVersion} to ${newVersion}`);
          
          // Create the user-notes store if it doesn't exist
          if (!db.objectStoreNames.contains('user-notes')) {
            console.log('Creating user-notes store');
            const store = db.createObjectStore('user-notes', { keyPath: 'id' });
            
            // Create compound indexes for efficient retrieval by user pubkey
            store.createIndex('by-user-timestamp', ['user_pubkey', 'created_at']);
            store.createIndex('by-user-cached-at', ['user_pubkey', 'cached_at']);
            
            console.log('User notes store created successfully');
          }
        },
      });
      
      console.log(`Database opened successfully with version ${currentVersion}`);
      return this.db;
    } catch (error) {
      console.error(`Error opening database:`, error);
      
      // If we get a version error, try to handle it by getting the current version
      if (error instanceof Error && error.name === 'VersionError' && error.message.includes('existing version')) {
        const match = error.message.match(/existing version \((\d+)\)/);
        if (match && match[1]) {
          const existingVersion = parseInt(match[1], 10);
          console.log(`Detected existing database with version ${existingVersion}, updating our version`);
          
          // Update our version tracking
          this.version = existingVersion;
          
          // Try again with the correct version
          this.db = await openDB<UserNotesStoreSchema>(this.dbName, existingVersion);
          console.log(`Successfully opened database with existing version ${existingVersion}`);
          return this.db;
        }
      }
      
      throw error;
    }
  }

  /**
   * Cleans up notes for a specific user
   * @param userPubkey The public key of the user whose notes to clean up
   */
  private async cleanupUserNotes(userPubkey: string) {
    const db = await this.init()
    const tx = db.transaction('user-notes', 'readwrite')
    const store = tx.objectStore('user-notes')
    const userCachedAtIndex = store.index('by-user-cached-at')

    try {
      // Delete old items
      const oldestAllowedDate = Date.now() - (MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000)
      const oldItemsToDelete: string[] = []
      
      // Use the compound index to find old items for this user
      let cursor = await userCachedAtIndex.openCursor(IDBKeyRange.bound(
        [userPubkey, 0],
        [userPubkey, oldestAllowedDate]
      ))
      
      while (cursor) {
        oldItemsToDelete.push(cursor.value.id)
        cursor = await cursor.continue()
      }

      // Delete old items in batch
      await Promise.all(oldItemsToDelete.map(id => store.delete(id)))
      console.log(`Deleted ${oldItemsToDelete.length} old items for user ${userPubkey}`)

      // Count remaining items for this user
      const userTimestampIndex = store.index('by-user-timestamp')
      let count = 0
      let countCursor = await userTimestampIndex.openCursor(IDBKeyRange.bound(
        [userPubkey, 0],
        [userPubkey, Infinity]
      ))
      
      const itemsToDelete: string[] = []
      while (countCursor) {
        count++
        // If we're over the limit, mark for deletion (oldest first)
        if (count > MAX_CACHE_ITEMS) {
          itemsToDelete.push(countCursor.value.id)
        }
        countCursor = await countCursor.continue()
      }

      // Delete excess items in batch
      if (itemsToDelete.length > 0) {
        await Promise.all(itemsToDelete.map(id => store.delete(id)))
        console.log(`Deleted ${itemsToDelete.length} excess items for user ${userPubkey}`)
      }

      await tx.done
    } catch (error) {
      console.error(`Error during cleanup for user ${userPubkey}:`, error)
      throw error
    }
  }

  /**
   * Cleans up all user notes or a specific user's notes
   * @param userPubkey Optional public key of a specific user to clean up
   */
  async cleanup(userPubkey?: string) {
    if (userPubkey) {
      // Clean up a specific user's notes
      await this.cleanupUserNotes(userPubkey)
      return
    }
    
    // Get all unique user pubkeys in the database
    const db = await this.init()
    const tx = db.transaction('user-notes', 'readonly')
    const store = tx.objectStore('user-notes')
    
    const userPubkeys = new Set<string>()
    let cursor = await store.openCursor()
    
    while (cursor) {
      userPubkeys.add(cursor.value.user_pubkey)
      cursor = await cursor.continue()
    }
    
    await tx.done
    
    // Clean up notes for each user
    const pubkeysArray = Array.from(userPubkeys)
    for (const pubkey of pubkeysArray) {
      await this.cleanupUserNotes(pubkey)
    }
  }

  /**
   * Adds notes to a user's notes feed
   * @param userPubkey The public key of the user whose feed these notes belong to
   * @param notes The notes to add
   */
  async addNotes(userPubkey: string, notes: BaseNote[]) {
    if (!userPubkey) {
      throw new Error('User public key is required');
    }
    
    if (!notes || notes.length === 0) {
      console.log(`No notes to add for user ${userPubkey}`);
      return;
    }
    
    console.log(`Adding ${notes.length} notes to user notes feed for user ${userPubkey}`);
    
    try {
      const db = await this.init()
      const tx = db.transaction('user-notes', 'readwrite')
      const store = tx.objectStore('user-notes')
      
      const now = Date.now()
      
      // Get all existing notes in one batch operation
      const existingNotes = await Promise.all(
        notes.map(note => store.get(note.id))
      )
      const existingNoteIds = new Set(
        existingNotes
          .filter((note): note is StoredNote => note !== null && note !== undefined)
          .map(note => note.id)
      )
      
      // Add new notes with cached_at timestamp and user_pubkey
      const notesToAdd = notes.filter(note => !existingNoteIds.has(note.id))
      console.log(`Adding ${notesToAdd.length} new notes (${notes.length - notesToAdd.length} already exist)`);
      
      if (notesToAdd.length === 0) {
        console.log('No new notes to add');
        return;
      }
      
      // Transform BaseNotes to StoredNotes with user_pubkey
      const storedNotes: StoredNote[] = notesToAdd.map(note => ({
        ...note,
        cached_at: now,
        user_pubkey: userPubkey // Add the user pubkey to each note
      }))
      
      // Store the notes
      await Promise.all(
        storedNotes.map(note => store.put(note))
      )
      console.log(`Successfully stored ${storedNotes.length} notes for user ${userPubkey}`);

      // Count notes for this user to check if cleanup is needed
      const userTimestampIndex = store.index('by-user-timestamp')
      let count = 0
      let countCursor = await userTimestampIndex.openCursor(IDBKeyRange.bound(
        [userPubkey, 0],
        [userPubkey, Infinity]
      ))
      
      while (countCursor) {
        count++
        countCursor = await countCursor.continue()
      }
      
      await tx.done
      console.log(`Current note count for user ${userPubkey}: ${count}`);

      // Only trigger cleanup after transaction is complete
      if (count > MAX_CACHE_ITEMS * 0.9) { // Cleanup when at 90% capacity
        console.log(`Store approaching capacity for user ${userPubkey} (${count}/${MAX_CACHE_ITEMS}), triggering cleanup`);
        await this.cleanup(userPubkey)
      }
    } catch (error) {
      console.error(`Error adding notes for user ${userPubkey}:`, error)
      throw error
    }
  }

  /**
   * Gets notes from a user's notes feed
   * @param userPubkey The public key of the user whose notes to retrieve
   * @param limit Maximum number of notes to return
   * @param before Only return notes created before this timestamp
   */
  async getNotes(userPubkey: string, limit: number = 20, before?: number): Promise<StoredNote[]> {
    if (!userPubkey) {
      throw new Error('User public key is required');
    }
    
    const db = await this.init()
    const tx = db.transaction('user-notes', 'readonly')
    const userTimestampIndex = tx.objectStore('user-notes').index('by-user-timestamp')
    const seen = new Set<string>() // Track seen note IDs for deduplication

    // Create a range for the user's notes
    let range
    if (before) {
      // Notes for this user with timestamp less than 'before'
      range = IDBKeyRange.bound(
        [userPubkey, 0],
        [userPubkey, before],
        false, // Include lower bound
        true   // Exclude upper bound
      )
    } else {
      // All notes for this user
      range = IDBKeyRange.bound(
        [userPubkey, 0],
        [userPubkey, Infinity]
      )
    }

    // Open cursor in reverse order (newest first)
    let cursor = await userTimestampIndex.openCursor(range, 'prev')
    const notes: StoredNote[] = []

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

  /**
   * Gets the latest timestamp from a user's notes feed
   * @param userPubkey The public key of the user
   */
  async getLatestTimestamp(userPubkey: string): Promise<number | null> {
    if (!userPubkey) {
      throw new Error('User public key is required');
    }
    
    const db = await this.init()
    const tx = db.transaction('user-notes', 'readonly')
    const userTimestampIndex = tx.objectStore('user-notes').index('by-user-timestamp')
    
    // Get the latest note for this user (highest timestamp)
    const range = IDBKeyRange.bound(
      [userPubkey, 0],
      [userPubkey, Infinity]
    )
    
    const cursor = await userTimestampIndex.openCursor(range, 'prev')
    return cursor ? cursor.value.created_at : null
  }

  /**
   * Gets the oldest timestamp from a user's notes feed
   * @param userPubkey The public key of the user
   */
  async getOldestTimestamp(userPubkey: string): Promise<number | null> {
    if (!userPubkey) {
      throw new Error('User public key is required');
    }
    
    const db = await this.init()
    const tx = db.transaction('user-notes', 'readonly')
    const userTimestampIndex = tx.objectStore('user-notes').index('by-user-timestamp')
    
    // Get the oldest note for this user (lowest timestamp)
    const range = IDBKeyRange.bound(
      [userPubkey, 0],
      [userPubkey, Infinity]
    )
    
    const cursor = await userTimestampIndex.openCursor(range, 'next')
    return cursor ? cursor.value.created_at : null
  }
}

export const userNotesFeedDB = new UserNotesFeedDB()