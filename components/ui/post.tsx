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
  tags?: string[][]
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
  tags,
  onHashtagClick,
  parentNoteId,
  hideParentNote,
}: PostProps) {
  const router = useRouter()
  const { likes, reposts } = useReactionCounts(id)
  
  const handleClick = () => {
    router.push(`/note/${id}`)
  }

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/user/${author.pubkey}`)
  }

  return (
    <Card
      className="mb-0 cursor-pointer rounded-none border-x-0 border-t-0 border-border/80 bg-card px-4 py-4 shadow-none transition-colors hover:bg-secondary/40 sm:rounded-lg sm:border sm:px-5"
      onClick={handleClick}
    >
      <CardHeader className="p-0 pb-3">
        <AuthorInfo
          pubkey={author.pubkey}
          onClick={handleUserClick}
          timestamp={timestamp}
        />
      </CardHeader>
      <CardContent className="p-0">
        <ExpandableContent
          content={
            <ContentRenderer
              content={content}
              tags={tags}
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
        className="border-0"
      />
    </Card>
  )
}
