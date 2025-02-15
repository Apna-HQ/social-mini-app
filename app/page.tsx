"use client"
import { useApp } from "./providers"
import { Post } from "@/components/ui/post"
import { Fab } from "@/components/ui/fab"
import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { INote } from "@apna/sdk"
import { noteToPostProps } from "@/lib/utils/post"

export default function Home() {
  const router = useRouter()
  const { notes, loadingMore, refreshing, loadMore, refreshFeed, publishNote, likeNote, repostNote, replyToNote, saveScrollPosition, savedScrollPosition } = useApp()
  const bottomRef = useRef<HTMLDivElement>(null)
  const isRestoringScroll = useRef(false)
  const pullStartY = useRef<number | null>(null)
  const pullMoveY = useRef<number | null>(null)
  const refreshIndicatorRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent): void => {
    // Only enable pull to refresh when at top of page
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent): void => {
    if (!pullStartY.current) return

    pullMoveY.current = e.touches[0].clientY
    const pullDistance = pullMoveY.current - pullStartY.current

    if (pullDistance > 0 && refreshIndicatorRef.current) {
      // Resist pull after 100px
      const resistance = pullDistance > 100 ? 0.5 : 1
      const translateY = Math.min(pullDistance * resistance, 150)
      refreshIndicatorRef.current.style.transform = `translateY(${translateY}px)`
    }
  }

  const handleTouchEnd = async (): Promise<void> => {
    if (!pullStartY.current || !pullMoveY.current) return

    const pullDistance = pullMoveY.current - pullStartY.current
    
    if (pullDistance > 100 && !refreshing) {
      await refreshFeed()
    }

    // Reset pull tracking
    pullStartY.current = null
    pullMoveY.current = null
    
    if (refreshIndicatorRef.current) {
      refreshIndicatorRef.current.style.transform = 'translateY(0)'
    }
  }

  const handleScroll = useCallback((): void => {
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
    <main
      className="min-h-screen bg-background relative pb-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh Indicator */}
      <div
        ref={refreshIndicatorRef}
        className="absolute top-0 left-0 right-0 flex items-center justify-center h-16 bg-background transition-transform duration-200 -translate-y-full"
        style={{ zIndex: 50 }}
      >
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          {refreshing ? (
            <>
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Refreshing...</span>
            </>
          ) : (
            <span>Pull down to refresh</span>
          )}
        </div>
      </div>

      <div className="max-w-screen-md mx-auto py-4">
        {/* Feed */}
        <div className="space-y-4">
          {notes.map((note: INote) => (
            <Post
              key={note.id}
              {...noteToPostProps(note, {
                onLike: () => likeNote(note.id),
                onRepost: () => repostNote(note.id),
                onReply: () => router.push(`/note/${note.id}`)
              })}
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
