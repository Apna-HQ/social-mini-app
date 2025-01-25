"use client"
import { useApp } from "./providers"
import { Post } from "@/components/ui/post"
import { Fab } from "@/components/ui/fab"
import { useEffect, useRef, useCallback } from "react"

export default function Home() {
  const { notes, loadingMore, loadMore, publishNote, likeNote, repostNote, replyToNote, saveScrollPosition, savedScrollPosition } = useApp()
  const bottomRef = useRef<HTMLDivElement>(null)
  const isRestoringScroll = useRef(false)

  const handleScroll = useCallback(() => {
    if (!bottomRef.current || loadingMore) return

    const bottomElement = bottomRef.current
    const rect = bottomElement.getBoundingClientRect()
    const isVisible = rect.top <= window.innerHeight

    // Save scroll position if we're not in the process of restoring it
    if (!isRestoringScroll.current) {
      saveScrollPosition(window.scrollY)
    }

    if (isVisible) {
      loadMore()
    }
  }, [loadMore, loadingMore, saveScrollPosition])

  // Restore scroll position when component mounts or notes change
  useEffect(() => {
    if (savedScrollPosition !== null && notes.length > 0 && !isRestoringScroll.current) {
      isRestoringScroll.current = true
      window.scrollTo(0, savedScrollPosition)
      // Reset the flag after a short delay to allow for normal scrolling
      setTimeout(() => {
        isRestoringScroll.current = false
      }, 100)
    }
  }, [savedScrollPosition, notes])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-screen-md py-4">
        {/* Feed */}
        <div className="space-y-4">
          {notes.map((note) => (
            <Post
              key={note.id}
              content={note.content}
              author={{
                name: note.pubkey.slice(0, 8),
                picture: undefined,
                pubkey: note.pubkey
              }}
              timestamp={note.created_at}
              onLike={() => likeNote(note.id)}
              onRepost={() => repostNote(note.id)}
              onReply={() => replyToNote(note.id, `Reply to ${note.content.slice(0, 10)}...`)}
            />
          ))}
          {notes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No posts yet. Follow some users to see their posts here!
            </div>
          )}
          {/* Loading indicator */}
          {loadingMore && (
            <div className="text-center py-4 text-muted-foreground">
              Loading more posts...
            </div>
          )}
          {/* Bottom detector */}
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* Floating Action Button */}
      <Fab onPublish={publishNote} />
    </main>
  )
}
