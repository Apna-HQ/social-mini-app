"use client"

import { Post } from "../ui/post"
import { useReactions } from "../../lib/hooks/useReactions"
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
  currentUserPubkey,
  onReply,
  onHashtagClick,
  isReply,
}: PostWithReactionsProps) {
  const app = useApp()
  
  // Use the reactions hook to get counts and handlers
  const { handleLike, handleRepost } = useReactions({
    noteId: id,
    pubkey: currentUserPubkey,
  })

  // Create handlers that use the app context
  const handleLikeWithApp = async () => {
    try {
      await handleLike()
      // You can also use the app context directly if needed
      // await app.likeNote(id)
    } catch (error) {
      console.error('Error liking note:', error)
    }
  }

  const handleRepostWithApp = async () => {
    try {
      await handleRepost()
      // You can also use the app context directly if needed
      // await app.repostNote(id)
    } catch (error) {
      console.error('Error reposting note:', error)
    }
  }

  return (
    <Post
      id={id}
      content={content}
      author={author}
      timestamp={timestamp}
      onLike={handleLikeWithApp}
      onRepost={handleRepostWithApp}
      onReply={onReply}
      onHashtagClick={onHashtagClick}
      isReply={isReply}
    />
  )
}