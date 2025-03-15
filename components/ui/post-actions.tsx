"use client"

import { Heart, MessageCircle, Repeat2 } from "lucide-react"
import { CardFooter } from "./card"
import { useApp } from "@/app/providers"
import { useRouter } from "next/navigation"

interface PostActionsProps {
  id: string
  likes?: number
  reposts?: number
  className?: string
}

/**
 * PostActions - A reusable component for post interaction buttons
 *
 * @param id - The post ID
 * @param likes - Number of likes
 * @param reposts - Number of reposts
 * @param className - Additional CSS classes for the CardFooter
 */
export function PostActions({
  id,
  likes = 0,
  reposts = 0,
  className = "",
}: PostActionsProps) {
  const { likeNote, repostNote } = useApp()
  const router = useRouter()
  
  // Internal handler to stop event propagation
  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation()
    action?.()
  }
  return (
    <CardFooter className={`border-t pt-3 ${className}`}>
      <div className="flex gap-6 text-muted-foreground">
        <button
          onClick={(e) => handleAction(e, () => router.push(`/note/${id}`))}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm">Reply</span>
        </button>
        <button
          onClick={(e) => handleAction(e, () => repostNote(id))}
          className="flex items-center gap-1 hover:text-green-500 transition-colors"
        >
          <Repeat2 className="w-4 h-4" />
          <span className="text-sm">
            Repost{reposts > 0 && <span className="ml-1">({reposts})</span>}
          </span>
        </button>
        <button
          onClick={(e) => handleAction(e, () => likeNote(id))}
          className="flex items-center gap-1 hover:text-red-500 transition-colors"
        >
          <Heart className="w-4 h-4" />
          <span className="text-sm">
            Like{likes > 0 && <span className="ml-1">({likes})</span>}
          </span>
        </button>
      </div>
    </CardFooter>
  )
}