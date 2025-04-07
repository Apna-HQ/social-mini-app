"use client"
import { useApp } from "./providers"; // For non-feed actions and scroll position
import { useFeed } from "@/hooks/useFeed"; // Import the new feed hook
import { Post } from "@/components/ui/post"
import { Fab } from "@/components/ui/fab"
import React, { useEffect, useCallback } from "react" // Remove useRef, useMemo
import { useRouter } from "next/navigation"
import type { INote } from "@apna/sdk";
import { noteToPostProps } from "@/lib/utils/post";
import { Button } from "@/components/ui/button"; // Import Button component
import { Loader2 } from "lucide-react"; // For loading spinner icon

export default function Home() {
  const router = useRouter()
  // Get feed-specific state and actions from useFeed
  const { notes, loadingMore, refreshing, loadMore, refreshFeed } = useFeed();
  // Get other actions and scroll position from useApp
  // Removed saveScrollPosition and savedScrollAnchorId from destructuring
  const { publishNote, likeNote, repostNote, replyToNote } = useApp();
  // Removed refs: bottomRef, pullStartY, pullMoveY, refreshIndicatorRef
 // Removed all scroll-related refs (observer, postElements, currentAnchorId, isRestoringScroll)

  // Removed handleTouchStart, handleTouchMove, handleTouchEnd

 // Removed pixel-based scroll handler and listener effect

  // Removed all scroll restoration and saving logic (useEffects, handlers)

  // Removed useEffect for scroll listener

  return (
    <main
      className="h-full bg-background relative pb-20"
      // Removed touch handlers
    >
      {/* Removed Refresh Indicator Div */}

      <div className="max-w-screen-md mx-2 py-4">
        {/* Refresh Button */}
        <div className="flex justify-center mb-4">
          <Button onClick={() => refreshFeed()} disabled={refreshing}>
            {refreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              "Refresh Feed"
            )}
          </Button>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {notes.map((note: INote) => (
          <Post
            key={note.id} // Assuming note structure from useFeed matches INote
            {...noteToPostProps(note)}
            // PostActions will handle these internally using useApp
          />
          ))}
          {notes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No posts yet. Follow some users to see their posts here!
            </div>
          )}

          {/* Load More Button */}
          {notes.length > 0 && ( // Only show if there are notes
            <div className="flex justify-center mt-6">
              <Button onClick={() => loadMore()} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading More...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
          {/* Removed Bottom detector div */}
        </div>
      </div>

      {/* Floating Action Button */}
      <Fab onPublish={publishNote} />
    </main>
  )
}
