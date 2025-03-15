"use client"
import { useRouter } from "next/navigation"
import { Heart, MessageCircle, Repeat2 } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader } from "./card"
import { AuthorInfo } from "./author-info"
import { ContentRenderer } from "./content-renderer"
import { ExpandableContent } from "./expandable-content"
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
  onLike?: () => void
  onRepost?: () => void
  onReply?: () => void
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
  onLike,
  onRepost,
  onReply,
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

  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation()
    action?.()
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
      <CardFooter className="border-t pt-3">
        <div className="flex gap-6 text-muted-foreground">
          <button
            onClick={(e) => handleAction(e, onReply)}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">Reply</span>
          </button>
          <button
            onClick={(e) => handleAction(e, onRepost)}
            className="flex items-center gap-1 hover:text-green-500 transition-colors"
          >
            <Repeat2 className="w-4 h-4" />
            <span className="text-sm">
              Repost{reposts > 0 && <span className="ml-1">({reposts})</span>}
            </span>
          </button>
          <button
            onClick={(e) => handleAction(e, onLike)}
            className="flex items-center gap-1 hover:text-red-500 transition-colors"
          >
            <Heart className="w-4 h-4" />
            <span className="text-sm">
              Like{likes > 0 && <span className="ml-1">({likes})</span>}
            </span>
          </button>
        </div>
      </CardFooter>
    </Card>
  )
}