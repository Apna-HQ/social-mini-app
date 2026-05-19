import type {
  DirectMessage,
  INote,
  NostrEvent,
  SocialNotification,
} from "@apna/sdk"

export function sortNewestFirst<T extends { created_at: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.created_at - a.created_at)
}

export function mergeById<T extends { id: string; created_at: number }>(
  current: T[],
  incoming: T[]
): T[] {
  const byId = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) {
    byId.set(item.id, item)
  }
  return sortNewestFirst(Array.from(byId.values()))
}

export type SocialNote = NostrEvent & INote

export function isNote(event: NostrEvent): event is SocialNote {
  return event.kind === 1
}

export function getRootEventId(event: Pick<NostrEvent, "tags">): string | undefined {
  return event.tags.find((tag) => tag[0] === "e" && tag[3] === "root")?.[1]
}

export function getReplyParentId(event: Pick<NostrEvent, "tags">): string | undefined {
  const replyTags = event.tags.filter((tag) => tag[0] === "e" && tag[3] === "reply")
  if (replyTags.length > 0) return replyTags[replyTags.length - 1]?.[1]
  const eTags = event.tags.filter((tag) => tag[0] === "e")
  return eTags[eTags.length - 1]?.[1]
}

export function groupMessagesByPeer(messages: DirectMessage[]): Array<{
  peerPubkey: string
  latest: DirectMessage
  messages: DirectMessage[]
  unread: number
}> {
  const groups = new Map<string, DirectMessage[]>()
  for (const message of messages) {
    const peer = message.peerPubkey || "unknown"
    groups.set(peer, [...(groups.get(peer) || []), message])
  }

  return Array.from(groups.entries())
    .map(([peerPubkey, group]) => {
      const sorted = sortNewestFirst(group)
      return {
        peerPubkey,
        latest: sorted[0],
        messages: sorted.reverse(),
        unread: 0,
      }
    })
    .sort((a, b) => b.latest.created_at - a.latest.created_at)
}

export function notificationLabel(notification: SocialNotification): string {
  if (notification.type === "reaction") return "reacted to your note"
  if (notification.type === "reply") return "replied to your note"
  if (notification.type === "repost") return "reposted your note"
  if (notification.type === "quote") return "quoted your note"
  return "mentioned you"
}
