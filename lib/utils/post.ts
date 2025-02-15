import type { INote } from "@apna/sdk"
import type { PostProps } from "@/components/ui/post"

export function noteToPostProps(
  note: INote,
  {
    onLike,
    onRepost,
    onReply,
  }: {
    onLike?: () => void
    onRepost?: () => void
    onReply?: () => void
  } = {}
): PostProps {
  return {
    id: note.id,
    content: note.content,
    author: {
      name: note.pubkey.slice(0, 8),
      picture: undefined,
      pubkey: note.pubkey,
    },
    timestamp: note.created_at,
    onLike,
    onRepost,
    onReply,
    isReply: note.tags?.some(
      (tag) =>
        Array.isArray(tag) &&
        tag[0] === "e" &&
        (tag[3] === "reply" || tag[3] === "root")
    ),
  }
}