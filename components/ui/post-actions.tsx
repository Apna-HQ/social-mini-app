"use client"

import { Heart, MessageCircle, Repeat2 } from "lucide-react"
import { CardFooter } from "./card"
import { useApp } from "@/app/providers"; // Re-add useApp import
import { useRouter } from "next/navigation" // Keep useRouter if needed for reply navigation fallback
// Removed imports for Dialog, Button, Textarea, useState - ensure they are actually removed

interface PostActionsProps {
  id: string
  likes?: number
  reposts?: number;
  className?: string;
  // Removed interaction handlers from props
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
  // Removed interaction handlers from destructuring
}: PostActionsProps) {
 const { likeNote, repostNote, replyToNote } = useApp(); // Get actions from context
  const router = useRouter();
 // Removed state for dialog and reply content - ensure it's actually removed
  
  // Internal handler to stop event propagation and call the action
  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation();
    action?.();
  };

  // Reverted handleReplyClick to navigate directly
  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/note/${id}`);
  };
 // Removed handleReplySubmit - ensure it's actually removed
  return (
  // Removed React Fragment wrapper
    <CardFooter className={`border-t pt-3 ${className}`}>
      <div className="flex gap-6 text-muted-foreground">
        <button
          onClick={handleReplyClick} // Navigate on click
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm">Reply</span>
        </button>
        <button
          onClick={(e) => handleAction(e, () => repostNote(id))} // Use repostNote from context
          className="flex items-center gap-1 hover:text-green-500 transition-colors"
        >
          <Repeat2 className="w-4 h-4" />
          <span className="text-sm">
            Repost{reposts > 0 && <span className="ml-1">({reposts})</span>}
          </span>
        </button>
        <button
          onClick={(e) => handleAction(e, () => likeNote(id))} // Use likeNote from context
          className="flex items-center gap-1 hover:text-red-500 transition-colors"
        >
          <Heart className="w-4 h-4" />
          <span className="text-sm">
            Like{likes > 0 && <span className="ml-1">({likes})</span>}
          </span>
        </button>
      </div>
    </CardFooter>
    // Removed Dialog JSX
  );
}