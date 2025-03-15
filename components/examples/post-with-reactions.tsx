"use client"

import { Post } from "../ui/post"
import { useApp } from "../../app/providers"

interface PostWithReactionsProps {
  id: string
  content: string
  author: {
    name?: string
    picture?: string
    pubkey: string
  }
  timestamp: number
  currentUserPubkey: string
  onReply?: () => void
  onHashtagClick?: (hashtag: string) => void
  isReply?: boolean
}

/**
 * Example component that demonstrates how to use the Post component with reactions
 *
 * This component:
 * 1. Uses the useReactions hook to get reaction handlers
 * 2. Displays cached reaction counts initially
 * 3. Fetches fresh counts from the nostr API in the background
 * 4. Updates the UI when fresh counts are received
 */
export function PostWithReactions({
  id,
  content,
  author,
  timestamp,
  onHashtagClick,
  isReply,
}: PostWithReactionsProps) {
  const app = useApp()


  return (
    <Post
      id={id}
      content={content}
      author={author}
      timestamp={timestamp}
      onHashtagClick={onHashtagClick}
      isReply={isReply}
    />
  )
}