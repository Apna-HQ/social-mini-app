import { openDB, DBSchema, IDBPDatabase, StoreNames } from 'idb'

// Define the reaction types
export enum ReactionType {
  LIKE = 'like',
  REPOST = 'repost'
}

interface BaseReaction {
  id: string // Unique ID for the reaction
  noteId: string // ID of the note being reacted to
  pubkey: string // Public key of the user who reacted
  type: ReactionType // Type of reaction (like or repost)
  created_at: number // Timestamp when the reaction was created
}

interface StoredReaction extends BaseReaction {
  cached_at: number // Timestamp when the reaction was cached
}

// Define the store schema
interface ReactionStoreSchema {
  key: string
  value: StoredReaction
  indexes: {
    'by-note-id': string
    'by-type': string
    'by-timestamp': number
    'by-cached-at': number
  }
}

// Dynamic schema that supports reaction stores
interface ReactionDBSchema extends DBSchema {
  reactions: ReactionStoreSchema
  [key: string]: ReactionStoreSchema
}

// Type assertion helper function to bypass TypeScript type checking
function asStoreNames<T>(name: string): StoreNames<T> {
  return name as unknown as StoreNames<T>;
}

export const MAX_CACHE_AGE_DAYS = 30 // Cache reactions for 30 days
export const MAX_CACHE_ITEMS = 10000 // Maximum number of reactions to keep in cache

class FeedReactionsDB {
  private dbName = 'social-mini-app-reactions'
  private versionKey = 'social-mini-app-reactions-version'
  private db: IDBPDatabase<ReactionDBSchema> | null = null
  
  // Get the current version from localStorage or use default
  private get version(): number {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedVersion = localStorage.getItem(this.versionKey);
      if (storedVersion) {
        return parseInt(storedVersion, 10);
      }
    }
    return 1; // Default version
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
    console.log(`Opening reactions database ${this.dbName} with version ${currentVersion}`);

    try {
      this.db = await openDB<ReactionDBSchema>(this.dbName, currentVersion, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log(`Upgrading reactions database from ${oldVersion} to ${newVersion}`);
          
          // Create the reactions store if it doesn't exist
          if (!db.objectStoreNames.contains(asStoreNames<ReactionDBSchema>('reactions'))) {
            console.log('Creating reactions store');
            const store = db.createObjectStore(asStoreNames<ReactionDBSchema>('reactions'), { keyPath: 'id' });
            store.createIndex('by-note-id', 'noteId');
            store.createIndex('by-type', 'type');
            store.createIndex('by-timestamp', 'created_at');
            store.createIndex('by-cached-at', 'cached_at');
            console.log('Reactions store created successfully');
          }
        },
      });
      
      console.log(`Reactions database opened successfully with version ${currentVersion}`);
      return this.db;
    } catch (error) {
      console.error(`Error opening reactions database:`, error);
      
      // If we get a version error, try to handle it by getting the current version
      if (error instanceof Error && error.name === 'VersionError' && error.message.includes('existing version')) {
        const match = error.message.match(/existing version \((\d+)\)/);
        if (match && match[1]) {
          const existingVersion = parseInt(match[1], 10);
          console.log(`Detected existing reactions database with version ${existingVersion}, updating our version`);
          
          // Update our version tracking
          this.version = existingVersion;
          
          // Try again with the correct version
          this.db = await openDB<ReactionDBSchema>(this.dbName, existingVersion);
          console.log(`Successfully opened reactions database with existing version ${existingVersion}`);
          return this.db;
        }
      }
      
      throw error;
    }
  }

  /**
   * Cleans up the reactions store
   */
  async cleanup() {
    const db = await this.init()
    const tx = db.transaction(asStoreNames<ReactionDBSchema>('reactions'), 'readwrite')
    const store = tx.objectStore(asStoreNames<ReactionDBSchema>('reactions'))
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
      console.error('Error during reactions cleanup:', error)
      throw error
    }
  }

  /**
   * Adds a reaction to a note
   * @param reaction The reaction to add
   */
  async addReaction(reaction: BaseReaction) {
    if (!reaction.noteId || !reaction.pubkey || !reaction.type) {
      throw new Error('Invalid reaction: noteId, pubkey, and type are required');
    }
    
    try {
      const db = await this.init()
      const tx = db.transaction(asStoreNames<ReactionDBSchema>('reactions'), 'readwrite')
      const store = tx.objectStore(asStoreNames<ReactionDBSchema>('reactions'))
      
      // Generate a unique ID if not provided
      if (!reaction.id) {
        reaction.id = `${reaction.pubkey}:${reaction.noteId}:${reaction.type}`;
      }
      
      const now = Date.now()
      
      // Check if this reaction already exists
      const existingReaction = await store.get(reaction.id)
      
      if (existingReaction) {
        console.log(`Reaction ${reaction.id} already exists, updating timestamp`);
        // Update the cached_at timestamp
        await store.put({
          ...existingReaction,
          cached_at: now
        })
      } else {
        console.log(`Adding new reaction ${reaction.id}`);
        // Add the new reaction with cached_at timestamp
        await store.put({
          ...reaction,
          cached_at: now
        })
      }
      
      // Check count and trigger cleanup while transaction is still active
      const count = await store.count()
      await tx.done
      console.log(`Current reactions store count: ${count}`);

      // Only trigger cleanup after transaction is complete
      if (count > MAX_CACHE_ITEMS * 0.9) { // Cleanup when at 90% capacity
        console.log(`Reactions store approaching capacity (${count}/${MAX_CACHE_ITEMS}), triggering cleanup`);
        await this.cleanup()
      }
      
      return true;
    } catch (error) {
      console.error(`Error adding reaction:`, error)
      throw error
    }
  }

  /**
   * Gets reactions for a specific note
   * @param noteId The ID of the note
   * @param type Optional reaction type filter
   */
  async getReactionsForNote(noteId: string, type?: ReactionType): Promise<StoredReaction[]> {
    if (!noteId) {
      throw new Error('Note ID is required');
    }
    
    const db = await this.init()
    const tx = db.transaction(asStoreNames<ReactionDBSchema>('reactions'), 'readonly')
    const store = tx.objectStore(asStoreNames<ReactionDBSchema>('reactions'))
    const noteIdIndex = store.index('by-note-id')
    
    // Get all reactions for this note
    const reactions: StoredReaction[] = []
    let cursor = await noteIdIndex.openCursor(noteId)
    
    while (cursor) {
      // If type is specified, filter by type
      if (!type || cursor.value.type === type) {
        reactions.push(cursor.value)
      }
      cursor = await cursor.continue()
    }
    
    return reactions
  }

  /**
   * Gets reaction counts for a specific note
   * @param noteId The ID of the note
   */
  async getReactionCountsForNote(noteId: string): Promise<{ [key in ReactionType]: number }> {
    if (!noteId) {
      throw new Error('Note ID is required');
    }
    
    const reactions = await this.getReactionsForNote(noteId)
    
    // Count reactions by type
    const counts = {
      [ReactionType.LIKE]: 0,
      [ReactionType.REPOST]: 0
    }
    
    for (const reaction of reactions) {
      if (reaction.type in counts) {
        counts[reaction.type as ReactionType]++
      }
    }
    
    return counts
  }

  /**
   * Checks if a user has reacted to a note
   * @param noteId The ID of the note
   * @param pubkey The public key of the user
   * @param type The reaction type
   */
  async hasUserReacted(noteId: string, pubkey: string, type: ReactionType): Promise<boolean> {
    if (!noteId || !pubkey || !type) {
      throw new Error('Note ID, pubkey, and reaction type are required');
    }
    
    const db = await this.init()
    const reactionId = `${pubkey}:${noteId}:${type}`;
    const reaction = await db.get(asStoreNames<ReactionDBSchema>('reactions'), reactionId)
    
    return !!reaction
  }

  /**
   * Removes a user's reaction to a note
   * @param noteId The ID of the note
   * @param pubkey The public key of the user
   * @param type The reaction type
   */
  async removeReaction(noteId: string, pubkey: string, type: ReactionType): Promise<boolean> {
    if (!noteId || !pubkey || !type) {
      throw new Error('Note ID, pubkey, and reaction type are required');
    }
    
    try {
      const db = await this.init()
      const reactionId = `${pubkey}:${noteId}:${type}`;
      
      await db.delete(asStoreNames<ReactionDBSchema>('reactions'), reactionId)
      return true;
    } catch (error) {
      console.error(`Error removing reaction:`, error)
      throw error
    }
  }
}

export const feedReactionsDB = new FeedReactionsDB()