import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from "idb"
import type { DirectMessage, SocialNotification } from "@apna/sdk"

type InboxStoreName = "notifications" | "messages"

interface StoredNotification extends SocialNotification {
  cacheKey: string
  userPubkey: string
  cachedAt: number
}

interface StoredDirectMessage extends DirectMessage {
  cacheKey: string
  userPubkey: string
  cachedAt: number
  peerPubkeyKey: string
}

interface SocialInboxDBSchema extends DBSchema {
  notifications: {
    key: string
    value: StoredNotification
    indexes: {
      "by-user-timestamp": [string, number]
      "by-user-cached-at": [string, number]
    }
  }
  messages: {
    key: string
    value: StoredDirectMessage
    indexes: {
      "by-user-timestamp": [string, number]
      "by-user-peer-timestamp": [string, string, number]
      "by-user-cached-at": [string, number]
    }
  }
}

const MAX_CACHE_AGE_DAYS = 14
const MAX_CACHE_ITEMS = 5000
const UNKNOWN_PEER = "__unknown__"

function cacheKey(userPubkey: string, itemId: string): string {
  return `${userPubkey}:${itemId}`
}

function stripNotification(stored: StoredNotification): SocialNotification {
  const { cacheKey: _cacheKey, userPubkey: _userPubkey, cachedAt: _cachedAt, ...notification } = stored
  return notification
}

function stripMessage(stored: StoredDirectMessage): DirectMessage {
  const {
    cacheKey: _cacheKey,
    userPubkey: _userPubkey,
    cachedAt: _cachedAt,
    peerPubkeyKey: _peerPubkeyKey,
    ...message
  } = stored
  return message
}

class SocialInboxDB {
  private dbName = "social-mini-app-inbox-cache"
  private dbVersion = 1
  private db: IDBPDatabase<SocialInboxDBSchema> | null = null

  private async init(): Promise<IDBPDatabase<SocialInboxDBSchema>> {
    if (this.db) return this.db

    this.db = await openDB<SocialInboxDBSchema>(this.dbName, this.dbVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("notifications")) {
          const store = db.createObjectStore("notifications", { keyPath: "cacheKey" })
          store.createIndex("by-user-timestamp", ["userPubkey", "created_at"])
          store.createIndex("by-user-cached-at", ["userPubkey", "cachedAt"])
        }

        if (!db.objectStoreNames.contains("messages")) {
          const store = db.createObjectStore("messages", { keyPath: "cacheKey" })
          store.createIndex("by-user-timestamp", ["userPubkey", "created_at"])
          store.createIndex("by-user-peer-timestamp", ["userPubkey", "peerPubkeyKey", "created_at"])
          store.createIndex("by-user-cached-at", ["userPubkey", "cachedAt"])
        }
      },
    })

    return this.db
  }

  async getNotifications(userPubkey: string, limit = 80): Promise<SocialNotification[]> {
    if (!userPubkey) return []

    try {
      const stored = await this.readByUser("notifications", userPubkey, limit)
      return stored.map(stripNotification)
    } catch (error) {
      console.error("Error reading cached notifications:", error)
      return []
    }
  }

  async saveNotifications(userPubkey: string, notifications: SocialNotification[]): Promise<void> {
    if (!userPubkey || notifications.length === 0) return

    const now = Date.now()
    const stored = notifications.map((notification) => ({
      ...notification,
      cacheKey: cacheKey(userPubkey, notification.id),
      userPubkey,
      cachedAt: now,
    }))

    await this.writeItems("notifications", userPubkey, stored)
  }

  async getMessages(
    userPubkey: string,
    opts: { peerPubkey?: string; limit?: number } = {}
  ): Promise<DirectMessage[]> {
    if (!userPubkey) return []

    try {
      const db = await this.init()
      const tx = db.transaction("messages", "readonly")
      const limit = opts.limit ?? 120
      const results: StoredDirectMessage[] = []

      if (opts.peerPubkey) {
        const index = tx.objectStore("messages").index("by-user-peer-timestamp")
        const range = IDBKeyRange.bound(
          [userPubkey, opts.peerPubkey, 0],
          [userPubkey, opts.peerPubkey, Infinity]
        )
        let cursor = await index.openCursor(range, "prev")
        while (cursor && results.length < limit) {
          results.push(cursor.value)
          cursor = await cursor.continue()
        }
      } else {
        results.push(...(await this.readByUser("messages", userPubkey, limit, tx)))
      }

      await tx.done
      return results.map(stripMessage)
    } catch (error) {
      console.error("Error reading cached messages:", error)
      return []
    }
  }

  async saveMessages(userPubkey: string, messages: DirectMessage[]): Promise<void> {
    if (!userPubkey || messages.length === 0) return

    const now = Date.now()
    const stored = messages.map((message) => ({
      ...message,
      cacheKey: cacheKey(userPubkey, message.id),
      userPubkey,
      cachedAt: now,
      peerPubkeyKey: message.peerPubkey || UNKNOWN_PEER,
    }))

    await this.writeItems("messages", userPubkey, stored)
  }

  private async readByUser<TStoreName extends InboxStoreName>(
    storeName: TStoreName,
    userPubkey: string,
    limit: number,
    existingTx?: IDBPTransaction<
      SocialInboxDBSchema,
      [TStoreName],
      "readonly"
    >
  ): Promise<SocialInboxDBSchema[TStoreName]["value"][]> {
    const db = await this.init()
    const tx = existingTx ?? db.transaction(storeName, "readonly")
    const index = tx.objectStore(storeName).index("by-user-timestamp")
    const range = IDBKeyRange.bound([userPubkey, 0], [userPubkey, Infinity])
    const results: SocialInboxDBSchema[TStoreName]["value"][] = []

    let cursor = await index.openCursor(range, "prev")
    while (cursor && results.length < limit) {
      results.push(cursor.value)
      cursor = await cursor.continue()
    }

    if (!existingTx) await tx.done
    return results
  }

  private async writeItems<TStoreName extends InboxStoreName>(
    storeName: TStoreName,
    userPubkey: string,
    items: SocialInboxDBSchema[TStoreName]["value"][]
  ): Promise<void> {
    try {
      const db = await this.init()
      const tx = db.transaction(storeName, "readwrite")
      const store = tx.objectStore(storeName)

      await Promise.all(items.map((item) => store.put(item)))
      await tx.done

      void this.cleanup(storeName, userPubkey)
    } catch (error) {
      console.error(`Error writing cached ${storeName}:`, error)
    }
  }

  private async cleanup(storeName: InboxStoreName, userPubkey: string): Promise<void> {
    try {
      const db = await this.init()
      const tx = db.transaction(storeName, "readwrite")
      const store = tx.objectStore(storeName)
      const cachedAtIndex = store.index("by-user-cached-at")
      const oldestAllowedDate = Date.now() - MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000
      const expiredRange = IDBKeyRange.bound([userPubkey, 0], [userPubkey, oldestAllowedDate])
      const idsToDelete: string[] = []

      let cursor = await cachedAtIndex.openCursor(expiredRange)
      while (cursor) {
        idsToDelete.push(cursor.value.cacheKey)
        cursor = await cursor.continue()
      }

      const timestampIndex = store.index("by-user-timestamp")
      let count = 0
      let timestampCursor = await timestampIndex.openCursor(
        IDBKeyRange.bound([userPubkey, 0], [userPubkey, Infinity])
      )
      while (timestampCursor) {
        count += 1
        if (count > MAX_CACHE_ITEMS) {
          idsToDelete.push(timestampCursor.value.cacheKey)
        }
        timestampCursor = await timestampCursor.continue()
      }

      await Promise.all(Array.from(new Set(idsToDelete)).map((id) => store.delete(id)))
      await tx.done
    } catch (error) {
      console.error(`Error cleaning cached ${storeName}:`, error)
    }
  }
}

export const socialInboxDB = new SocialInboxDB()
