"use client"

import { useMemo, useState } from "react"
import type React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react"
import type { INote } from "@apna/sdk"

import { useApp } from "../../providers"
import { useRealtimeThread } from "@/hooks/useRealtimeThread"
import { Post } from "@/components/ui/post"
import { Button } from "@/components/ui/button"
import { NoteComposer, type ComposerPublishOptions } from "@/components/ui/note-composer"
import { RailCard, SocialHeader, SocialLayout } from "@/components/ui/social-layout"
import { getReplyParentId } from "@/lib/utils/social"
import { noteToPostProps } from "@/lib/utils/post"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default function ThreadPage() {
  const router = useRouter()
  const { id } = useParams()
  const noteId = String(id)
  const { replyToNote } = useApp()
  const { rootNote, replies, loading, error, refresh } = useRealtimeThread(noteId)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const replyMap = useMemo(() => {
    const map = new Map<string, INote[]>()
    if (!rootNote) return map

    replies.forEach((reply) => {
      const parentId = getReplyParentId(reply as any) || rootNote.id
      map.set(parentId, [...(map.get(parentId) || []), reply])
    })
    return map
  }, [replies, rootNote])

  const handleReplySubmit = async (
    targetId: string,
    content: string,
    options?: ComposerPublishOptions
  ) => {
    if (!content.trim()) {
      setReplyingTo(null)
      return
    }
    await replyToNote(targetId, content, options)
    setReplyingTo(null)
    void refresh()
  }

  return (
    <SocialLayout rightRail={<ThreadRail replies={replies.length} />}>
      <SocialHeader
        title="Thread"
        subtitle={rootNote ? `${replies.length} replies` : "conversation"}
        action={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      />

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading thread...</span>
        </div>
      )}

      {!loading && error && (
        <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
          <p className="text-sm font-medium text-destructive">Couldn&apos;t load thread</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={refresh}>
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && !rootNote && (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          Thread not found.
        </div>
      )}

      {rootNote && (
        <div className="divide-y divide-border/80">
          <ThreadPost note={rootNote} isTarget={rootNote.id === noteId} />
          <ReplyToggle
            active={replyingTo === rootNote.id}
            onOpen={() => setReplyingTo(rootNote.id)}
            onSubmit={(content, options) => handleReplySubmit(rootNote.id, content, options)}
          />
          <div className="bg-background px-4 py-3 text-sm font-medium">
            Replies
          </div>
          {renderReplies({
            parentId: rootNote.id,
            replyMap,
            targetId: noteId,
            replyingTo,
            setReplyingTo,
            onSubmit: handleReplySubmit,
          })}
          {replies.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No replies yet.
            </div>
          )}
        </div>
      )}
    </SocialLayout>
  )
}

function ThreadPost({ note, isTarget }: { note: INote; isTarget?: boolean }) {
  return (
    <div className={cn(isTarget && "bg-secondary/40")}>
      <Post {...noteToPostProps(note)} hideParentNote />
    </div>
  )
}

function ReplyToggle({
  active,
  onOpen,
  onSubmit,
}: {
  active: boolean
  onOpen: () => void
  onSubmit: (content: string, options?: ComposerPublishOptions) => Promise<void>
}) {
  if (active) return <ReplyForm onSubmit={onSubmit} />

  return (
    <div className="bg-background px-4 py-3">
      <Button variant="ghost" size="sm" onClick={onOpen}>
        <MessageCircle className="mr-2 h-4 w-4" />
        Reply
      </Button>
    </div>
  )
}

function ReplyForm({
  onSubmit,
}: {
  onSubmit: (content: string, options?: ComposerPublishOptions) => Promise<void>
}) {
  return (
    <div className="bg-background px-4 py-3">
      <NoteComposer
        variant="compact"
        showAvatar={false}
        placeholder="Write your reply..."
        publishLabel="Reply"
        onPublish={onSubmit}
        onCancel={() => onSubmit("")}
      />
    </div>
  )
}

function renderReplies({
  parentId,
  replyMap,
  targetId,
  replyingTo,
  setReplyingTo,
  onSubmit,
  level = 0,
}: {
  parentId: string
  replyMap: Map<string, INote[]>
  targetId: string
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  onSubmit: (noteId: string, content: string, options?: ComposerPublishOptions) => Promise<void>
  level?: number
}): React.ReactNode {
  const children = replyMap.get(parentId) || []
  return children.map((reply) => (
    <div key={reply.id} className={cn(level > 0 && "border-l border-border/80 pl-4")}>
      <ThreadPost note={reply} isTarget={reply.id === targetId} />
      <ReplyToggle
        active={replyingTo === reply.id}
        onOpen={() => setReplyingTo(reply.id)}
        onSubmit={(content, options) => onSubmit(reply.id, content, options)}
      />
      {renderReplies({
        parentId: reply.id,
        replyMap,
        targetId,
        replyingTo,
        setReplyingTo,
        onSubmit,
        level: level + 1,
      })}
    </div>
  ))
}

function ThreadRail({ replies }: { replies: number }) {
  return (
    <div className="space-y-4">
      <RailCard title="Conversation">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Replies</span>
          <span className="font-mono text-[12px]">{replies}</span>
        </div>
      </RailCard>
    </div>
  )
}
