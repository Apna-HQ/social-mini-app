import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import type { INote } from "@apna/sdk"

export interface ThreadSnapshot {
  id: string
  root_id: string
  root_note: INote
  replies: INote[]
  cached_at: number
}

interface ThreadDBSchema extends DBSchema {
  threads: {
    key: string
    value: ThreadSnapshot
    indexes: {
      "by-root-id": string
      "by-cached-at": number
    }
  }
}

const DB_NAME = "social-mini-app-thread-cache"
const DB_VERSION = 1
const MAX_CACHE_AGE_MS = 14 * 24 * 60 * 60 * 1000

class ThreadDB {
  private db: IDBPDatabase<ThreadDBSchema> | null = null

  private get canUseIndexedDB() {
    return typeof window !== "undefined" && typeof indexedDB !== "undefined"
  }

  private async init() {
    if (!this.canUseIndexedDB) return null
    if (this.db) return this.db

    this.db = await openDB<ThreadDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("threads")) {
          const store = db.createObjectStore("threads", { keyPath: "id" })
          store.createIndex("by-root-id", "root_id")
          store.createIndex("by-cached-at", "cached_at")
        }
      },
    })

    return this.db
  }

  async getThreadSnapshot(id: string): Promise<ThreadSnapshot | null> {
    if (!id) return null

    try {
      const db = await this.init()
      if (!db) return null

      const snapshot = await db.get("threads", id)
      if (!snapshot) return null

      if (Date.now() - snapshot.cached_at > MAX_CACHE_AGE_MS) {
        await db.delete("threads", id)
        return null
      }

      return snapshot
    } catch (error) {
      console.error("Error reading thread cache:", error)
      return null
    }
  }

  async saveThreadSnapshot(
    id: string,
    rootNote: INote | null,
    replies: INote[]
  ): Promise<void> {
    if (!id || !rootNote) return

    try {
      const db = await this.init()
      if (!db) return

      await db.put("threads", {
        id,
        root_id: rootNote.id,
        root_note: rootNote,
        replies,
        cached_at: Date.now(),
      })
      void this.cleanup()
    } catch (error) {
      console.error("Error saving thread cache:", error)
    }
  }

  private async cleanup() {
    try {
      const db = await this.init()
      if (!db) return

      const tx = db.transaction("threads", "readwrite")
      const store = tx.objectStore("threads")
      const cachedAtIndex = store.index("by-cached-at")
      const oldestAllowed = Date.now() - MAX_CACHE_AGE_MS

      let cursor = await cachedAtIndex.openCursor()
      while (cursor) {
        if (cursor.value.cached_at >= oldestAllowed) break
        await store.delete(cursor.primaryKey)
        cursor = await cursor.continue()
      }

      await tx.done
    } catch (error) {
      console.error("Error cleaning thread cache:", error)
    }
  }
}

export const threadDB = new ThreadDB()
