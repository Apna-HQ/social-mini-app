import { openDB, DBSchema, IDBPDatabase, StoreNames } from 'idb'

interface BaseNote {
  id: string
  content: string
  pubkey: string
  created_at: number
}

interface StoredNote extends BaseNote {
  cached_at: number
}

// Define the store schema
interface FeedStoreSchema {
  key: string
  value: StoredNote
  indexes: {
    'by-timestamp': number
    'by-cached-at': number
  }
}

// Dynamic schema that supports feed stores
interface FeedDBSchema extends DBSchema {
  // Use a more explicit type for the DBSchema
  feed: FeedStoreSchema
  [key: string]: FeedStoreSchema
}

// Type assertion helper function to bypass TypeScript type checking
function asStoreNames<T>(name: string): StoreNames<T> {
  return name as unknown as StoreNames<T>;
}

export const MAX_CACHE_AGE_DAYS = 14 // Cache items for 14 days
export const MAX_CACHE_ITEMS = 5000 // Maximum number of items to keep in cache
export const INITIAL_FETCH_SIZE = 20 // Number of items to fetch on first load
export const LOAD_MORE_SIZE = 20 // Number of items to fetch when loading more

class FeedDB {
  private dbName = 'social-mini-app-feed'
  private versionKey = 'social-mini-app-feed-version'
  private db: IDBPDatabase<FeedDBSchema> | null = null
  
  // Get the current version from localStorage or use default
  private get version(): number {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedVersion = localStorage.getItem(this.versionKey);
      if (storedVersion) {
        return parseInt(storedVersion, 10);
      }
    }
    return 3; // Default version
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
      this.db = await openDB<FeedDBSchema>(this.dbName, currentVersion, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log(`Upgrading database from ${oldVersion} to ${newVersion}`);
          
          // Handle migration from version 2 to 3 (user-specific feeds)
          if (oldVersion <= 2) {
            // If old 'feed' store exists, we'll migrate its data later
            const hasFeedStore = db.objectStoreNames.contains(asStoreNames<FeedDBSchema>('feed'));
            console.log(`Old 'feed' store exists: ${hasFeedStore}`);
            
            // We don't create any stores here - they'll be created dynamically
            
            // If we have the old feed store, migrate its data
            if (hasFeedStore && oldVersion === 2) {
              console.log(`Will migrate data from old 'feed' store when a user store is created`);
              // We'll keep the old store for now to migrate data
              // It will be deleted after migration
            }
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
          this.db = await openDB<FeedDBSchema>(this.dbName, existingVersion);
          console.log(`Successfully opened database with existing version ${existingVersion}`);
          return this.db;
        }
      }
      
      throw error;
    }
  }

  /**
   * Creates a feed store for a user
   * @param pubkey The public key of the user
   */
  async createUserStore(pubkey: string) {
    if (!pubkey) {
      throw new Error('Public key is required');
    }

    try {
      const db = await this.init();
      
      // Create the user's feed store if it doesn't exist
      const storeName = this.getUserStoreName(pubkey);
      if (!db.objectStoreNames.contains(asStoreNames<FeedDBSchema>(storeName))) {
        console.log(`Creating new store for user ${pubkey}`);
        
        // Close the database to modify its schema
        db.close();
        
        // Calculate new version (ensure it's an integer)
        const currentVersion = this.version;
        const newVersion = Math.floor(currentVersion) + 1;
        console.log(`Upgrading database from version ${currentVersion} to ${newVersion}`);
        
        // Reopen with version bump to add the new store
        this.db = await openDB<FeedDBSchema>(this.dbName, newVersion, {
          upgrade(db, oldVersion, newVersion, transaction) {
            console.log(`Running upgrade from ${oldVersion} to ${newVersion}`);
            
            if (!db.objectStoreNames.contains(asStoreNames<FeedDBSchema>(storeName))) {
              console.log(`Creating object store: ${storeName}`);
              const store = db.createObjectStore(asStoreNames<FeedDBSchema>(storeName), { keyPath: 'id' });
              store.createIndex('by-timestamp', 'created_at');
              store.createIndex('by-cached-at', 'cached_at');
              console.log(`Store created successfully`);
            }
            
            // If this is the first user after migration from v2, migrate old data
            if (db.objectStoreNames.contains(asStoreNames<FeedDBSchema>('feed'))) {
              console.log(`Migrating data from old 'feed' store to ${storeName}`);
              const oldStore = transaction.objectStore(asStoreNames<FeedDBSchema>('feed'));
              const newStore = transaction.objectStore(asStoreNames<FeedDBSchema>(storeName));
              
              oldStore.openCursor().then(async function migrateCursors(cursor) {
                if (!cursor) {
                  // Delete the old store after migration
                  console.log(`Migration complete, deleting old 'feed' store`);
                  db.deleteObjectStore(asStoreNames<FeedDBSchema>('feed'));
                  return;
                }
                
                // Copy the note to the new user-specific store
                if (cursor.value.pubkey === pubkey) {
                  await newStore.put(cursor.value);
                }
                
                const nextCursor = await cursor.continue();
                await migrateCursors(nextCursor);
              });
            }
          },
        });
        
        // Update our version to match the new database version
        this.version = newVersion;
        
        // Verify the store was created
        const updatedDb = await this.init();
        if (!updatedDb.objectStoreNames.contains(asStoreNames<FeedDBSchema>(storeName))) {
          throw new Error(`Store creation failed for user ${pubkey}`);
        }
        
        console.log(`Store created successfully for user ${pubkey}`);
      }
      
      return this.db;
    } catch (error) {
      console.error(`Error creating store for user ${pubkey}:`, error);
      throw error;
    }
  }
  
  /**
   * Gets the store name for a user
   * @param pubkey The public key of the user
   */
  private getUserStoreName(pubkey: string): string {
    if (!pubkey) {
      throw new Error('Public key is required');
    }
    return `feed-${pubkey}`;
  }

  /**
   * Cleans up a specific user's feed store
   * @param pubkey The public key of the user
   */
  private async cleanupUserStore(pubkey: string) {
    const db = await this.init()
    const storeName = this.getUserStoreName(pubkey)
    
    // Check if the store exists
    if (!db.objectStoreNames.contains(asStoreNames<FeedDBSchema>(storeName))) {
      return;
    }
    
    const tx = db.transaction(asStoreNames<FeedDBSchema>(storeName), 'readwrite')
    const store = tx.objectStore(asStoreNames<FeedDBSchema>(storeName))
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

  /**
   * Cleans up all feed stores or a specific user's feed store
   * @param pubkey Optional public key of a specific user to clean up
   */
  async cleanup(pubkey?: string) {
    const db = await this.init()
    
    if (pubkey) {
      // Clean up a specific user's store
      await this.cleanupUserStore(pubkey)
      return
    }
    
    // Clean up all user stores
    const storeNames = Array.from(db.objectStoreNames)
    const feedStores = storeNames.filter(name => name.startsWith('feed-'))
    
    // Process each store
    for (const storeName of feedStores) {
      // Extract pubkey from store name
      const pubkey = storeName.replace('feed-', '')
      await this.cleanupUserStore(pubkey)
    }
  }

  /**
   * Adds notes to a user's feed
   * @param pubkey The public key of the user
   * @param notes The notes to add
   */
  async addNotes(pubkey: string, notes: BaseNote[]) {
    if (!pubkey) {
      throw new Error('Public key is required');
    }
    
    if (!notes || notes.length === 0) {
      console.log(`No notes to add for user ${pubkey}`);
      return;
    }
    
    console.log(`Adding ${notes.length} notes for user ${pubkey}`);
    
    try {
      const db = await this.init()
      const storeName = this.getUserStoreName(pubkey)
      
      // Check if the store exists
      if (!db.objectStoreNames.contains(asStoreNames<FeedDBSchema>(storeName))) {
        console.log(`Store ${storeName} doesn't exist, creating it now`);
        // Create the store if it doesn't exist
        await this.createUserStore(pubkey);
        // Get the db again after creating the store
        const updatedDb = await this.init();
        
        // If the store still doesn't exist, something went wrong
        if (!updatedDb.objectStoreNames.contains(asStoreNames<FeedDBSchema>(storeName))) {
          throw new Error(`Failed to create store for user ${pubkey}`);
        }
      }
      
      // Get a fresh reference to the database
      const currentDb = await this.init();
      const tx = currentDb.transaction(asStoreNames<FeedDBSchema>(storeName), 'readwrite')
      const store = tx.objectStore(asStoreNames<FeedDBSchema>(storeName))
      
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
      
      // Add new notes with cached_at timestamp
      const notesToAdd = notes.filter(note => !existingNoteIds.has(note.id))
      console.log(`Adding ${notesToAdd.length} new notes (${notes.length - notesToAdd.length} already exist)`);
      
      if (notesToAdd.length === 0) {
        console.log('No new notes to add');
        return;
      }
      
      // Transform BaseNotes to StoredNotes
      const storedNotes: StoredNote[] = notesToAdd.map(note => ({
        ...note,
        cached_at: now
      }))
      
      // Store the notes
      await Promise.all(
        storedNotes.map(note => store.put(note))
      )
      console.log(`Successfully stored ${storedNotes.length} notes`);

      // Check count and trigger cleanup while transaction is still active
      const count = await store.count()
      await tx.done
      console.log(`Current store count: ${count}`);

      // Only trigger cleanup after transaction is complete
      if (count > MAX_CACHE_ITEMS * 0.9) { // Cleanup when at 90% capacity
        console.log(`Store approaching capacity (${count}/${MAX_CACHE_ITEMS}), triggering cleanup`);
        await this.cleanup(pubkey)
      }
    } catch (error) {
      console.error(`Error adding notes for user ${pubkey}:`, error)
      throw error
    }
  }

  /**
   * Gets notes from a user's feed
   * @param pubkey The public key of the user
   * @param limit Maximum number of notes to return
   * @param before Only return notes created before this timestamp
   */
  async getNotes(pubkey: string, limit: number = 20, before?: number): Promise<StoredNote[]> {
    if (!pubkey) {
      throw new Error('Public key is required');
    }
    
    const db = await this.init()
    const storeName = this.getUserStoreName(pubkey)
    
    // Check if the store exists
    if (!db.objectStoreNames.contains(asStoreNames<FeedDBSchema>(storeName))) {
      return []; // Return empty array if store doesn't exist yet
    }
    
    const tx = db.transaction(asStoreNames<FeedDBSchema>(storeName), 'readonly')
    const index = tx.objectStore(asStoreNames<FeedDBSchema>(storeName)).index('by-timestamp')
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

  /**
   * Gets the latest timestamp from a user's feed
   * @param pubkey The public key of the user
   */
  async getLatestTimestamp(pubkey: string): Promise<number | null> {
    if (!pubkey) {
      throw new Error('Public key is required');
    }
    
    const db = await this.init()
    const storeName = this.getUserStoreName(pubkey)
    
    // Check if the store exists
    if (!db.objectStoreNames.contains(asStoreNames<FeedDBSchema>(storeName))) {
      return null; // Return null if store doesn't exist yet
    }
    
    const tx = db.transaction(asStoreNames<FeedDBSchema>(storeName), 'readonly')
    const index = tx.objectStore(asStoreNames<FeedDBSchema>(storeName)).index('by-timestamp')
    
    const cursor = await index.openCursor(null, 'prev')
    return cursor ? cursor.value.created_at : null
  }

  /**
   * Gets the oldest timestamp from a user's feed
   * @param pubkey The public key of the user
   */
  async getOldestTimestamp(pubkey: string): Promise<number | null> {
    if (!pubkey) {
      throw new Error('Public key is required');
    }
    
    const db = await this.init()
    const storeName = this.getUserStoreName(pubkey)
    
    // Check if the store exists
    if (!db.objectStoreNames.contains(asStoreNames<FeedDBSchema>(storeName))) {
      return null; // Return null if store doesn't exist yet
    }
    
    const tx = db.transaction(asStoreNames<FeedDBSchema>(storeName), 'readonly')
    const index = tx.objectStore(asStoreNames<FeedDBSchema>(storeName)).index('by-timestamp')
    
    const cursor = await index.openCursor(null, 'next')
    return cursor ? cursor.value.created_at : null
  }
}

export const feedDB = new FeedDB()