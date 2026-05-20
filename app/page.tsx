"use client"

import React, { useState } from "react"
import { Loader2, RefreshCcw, Rss, Wifi } from "lucide-react"
import type { INote } from "@apna/sdk"

import { useApp } from "./providers"
import { useFeed } from "@/hooks/useFeed"
import { Post } from "@/components/ui/post"
import { Fab } from "@/components/ui/fab"
import { Button } from "@/components/ui/button"
import { CreateNoteModal } from "@/components/ui/create-note-modal"
import { NoteComposer, type ComposerPublishHandler } from "@/components/ui/note-composer"
import { RailCard, SocialHeader, SocialLayout } from "@/components/ui/social-layout"
import { noteToPostProps } from "@/lib/utils/post"

export default function Home() {
  const [composerOpen, setComposerOpen] = useState(false)
  const { notes, loading, loadingMore, refreshing, error, loadMore, refreshFeed } = useFeed()
  const { publishNote, profile } = useApp()

  const handlePublish: ComposerPublishHandler = async (content, options) => {
    await publishNote(content, options)
    void refreshFeed()
  }

  return (
    <>
      <SocialLayout onCompose={() => setComposerOpen(true)} rightRail={<HomeRail notes={notes.length} />}>
        <SocialHeader
          title="Home"
          subtitle={notes.length ? `${notes.length} notes and replies` : "following feed"}
          action={
            <Button
              variant="outline"
              size="sm"
              className="border-border/80 bg-card"
              onClick={() => refreshFeed()}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          }
        />

        <section className="border-b border-border/80 bg-background px-4 py-4">
          <NoteComposer
            onPublish={handlePublish}
            avatarName={
              (profile?.metadata.display_name as string | undefined) ||
              (profile?.metadata.name as string | undefined)
            }
            avatarImage={profile?.metadata.picture as string | undefined}
          />
        </section>

        <div className="divide-y divide-border/80">
          {notes.map((note: INote) => (
            <Post key={note.id} {...noteToPostProps(note)} />
          ))}
        </div>

        <FeedState
          notesLength={notes.length}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          onRefresh={refreshFeed}
          onLoadMore={loadMore}
        />
      </SocialLayout>

      <Fab onClick={() => setComposerOpen(true)} />
      <CreateNoteModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPublish={handlePublish}
      />
    </>
  )
}

function FeedState({
  notesLength,
  loading,
  loadingMore,
  error,
  onRefresh,
  onLoadMore,
}: {
  notesLength: number
  loading: boolean
  loadingMore: boolean
  error: string | null
  onRefresh: () => void
  onLoadMore: () => void
}) {
  if (notesLength === 0 && loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading your feed...</span>
      </div>
    )
  }

  if (notesLength === 0 && error) {
    return (
      <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
        <p className="text-sm font-medium text-destructive">Couldn&apos;t load your feed</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRefresh}>
          Try again
        </Button>
      </div>
    )
  }

  if (notesLength === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        No posts yet. Follow some users to see their posts here.
      </div>
    )
  }

  return (
    <div className="flex justify-center px-4 py-6">
      <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
        {loadingMore ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading
          </>
        ) : (
          "Load more"
        )}
      </Button>
    </div>
  )
}

function HomeRail({ notes }: { notes: number }) {
  return (
    <div className="space-y-4">
      <RailCard title="Live Status">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Feed stream</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-mono text-[11px] text-secondary-foreground">
            <Wifi className="h-3 w-3" />
            Live
          </span>
        </div>
      </RailCard>
      <RailCard title="Timeline">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Rss className="h-4 w-4" />
              Loaded
            </span>
            <span className="font-mono text-[12px]">{notes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Source</span>
            <span className="font-mono text-[12px]">Following</span>
          </div>
        </div>
      </RailCard>
    </div>
  )
}
