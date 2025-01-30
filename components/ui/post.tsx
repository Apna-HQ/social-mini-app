"use client"
import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "./card"
import { Heart, MessageCircle, Repeat2, ChevronDown, ChevronUp } from "lucide-react"
import { AuthorInfo } from "./author-info"

interface PostProps {
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
  isReply?: boolean
}

import { useRouter } from "next/navigation"

export function Post({ content, author, timestamp, onLike, onRepost, onReply, id, isReply }: PostProps & { id?: string }) {
  const router = useRouter()
  
  const handleClick = () => {
    if (id) {
      router.push(`/note/${id}`)
    }
  }

  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation()
    action?.()
  }

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/user/${author.pubkey}`)
  }

  const [isExpanded, setIsExpanded] = useState(false)
  const shouldTruncate = content.length > 280

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
        <div className="relative">
          {isReply && (
            <span className="text-xs text-muted-foreground/50 mb-1 block">
              reply
            </span>
          )}
          <p className={`whitespace-pre-wrap break-words ${!isExpanded && shouldTruncate ? "line-clamp-4" : ""}`}>
            {content}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary hover:text-primary/90 text-sm font-medium flex items-center gap-1 mt-2"
            >
              {isExpanded ? (
                <>
                  Show less
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show more
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
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
            <span className="text-sm">Repost</span>
          </button>
          <button
            onClick={(e) => handleAction(e, onLike)}
            className="flex items-center gap-1 hover:text-red-500 transition-colors"
          >
            <Heart className="w-4 h-4" />
            <span className="text-sm">Like</span>
          </button>
        </div>
      </CardFooter>
    </Card>
  )
}