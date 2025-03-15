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
  // Find parent note ID from tags
  // In Nostr, reply relationships are stored in tags with format ["e", noteId, ...]
  // Filter for all "e" tags and take the last one as the parent
  const eTags = note.tags?.filter(
    (tag) => Array.isArray(tag) && tag[0] === "e"
  ) || [];
  
  // Get the last e tag as the parent
  const parentTag = eTags.length > 0 ? eTags[eTags.length - 1] : undefined;
  
  const parentNoteId = parentTag ? parentTag[1] : undefined;
  
  const isReply = !!parentNoteId;

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
    isReply,
    parentNoteId,
  }
}