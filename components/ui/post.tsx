"use client"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader } from "./card"
import { AuthorInfo } from "./author-info"
import { ContentRenderer } from "./content-renderer"
import { ExpandableContent } from "./expandable-content"
import { PostActions } from "./post-actions"
import { useReactionCounts } from "../../lib/hooks/useReactionCounts"

export interface PostProps {
  id: string
  content: string
  author: {
    name?: string
    picture?: string
    pubkey: string
  }
  timestamp: number
  onHashtagClick?: (hashtag: string) => void
  isReply?: boolean
  parentNoteId?: string
  hideParentNote?: boolean
}

export function Post({
  id,
  content,
  author,
  timestamp,
  onHashtagClick,
  isReply,
  parentNoteId,
  hideParentNote,
}: PostProps) {
  const router = useRouter()
  const { likes, reposts, isLoading } = useReactionCounts(id)
  
  const handleClick = () => {
    router.push(`/note/${id}`)
  }

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/user/${author.pubkey}`)
  }

  return (
    <Card
      className="mb-4 hover:bg-accent/5 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <AuthorInfo
          pubkey={author.pubkey}
          onClick={handleUserClick}
          timestamp={timestamp}
        />
      </CardHeader>
      <CardContent className="pb-3">
        <ExpandableContent
          content={
            <ContentRenderer
              content={content}
              onHashtagClick={onHashtagClick}
              parentNoteId={parentNoteId}
              hideParentNote={hideParentNote}
            />
          }
          contentLength={content.length}
        />
      </CardContent>
      <PostActions
        id={id}
        likes={likes}
        reposts={reposts}
      />
    </Card>
  )
}