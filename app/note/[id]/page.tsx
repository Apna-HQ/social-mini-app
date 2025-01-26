"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useApp } from "../../providers"
import { Post } from "@/components/ui/post"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import type { INote, INoteReply } from "@apna/sdk"

export default function NotePage() {
  const router = useRouter()
  const { id } = useParams()
  const { replyToNote, fetchNoteAndReplies } = useApp()
  const [replyContent, setReplyContent] = useState("")
  const [mainNote, setMainNote] = useState<INote | null>(null)
  const [replies, setReplies] = useState<INoteReply[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const result = await fetchNoteAndReplies(id as string)
        console.log('Fetched note and replies:', result)
        if (result?.note) {
          setMainNote(result.note)
        }
        if (Array.isArray(result?.replyNotes)) {
          setReplies(result.replyNotes)
        } else {
          console.error('Unexpected replies format:', result?.replyNotes)
          setReplies([])
        }
      } catch (error) {
        console.error("Failed to fetch note:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNote()
  }, [id, fetchNoteAndReplies])

  // Debug logging for replies
  useEffect(() => {
    console.log('Current replies state:', replies)
  }, [replies])

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return
    try {
      await replyToNote(id as string, replyContent)
      setReplyContent("")
      // Fetch updated replies
      const result = await fetchNoteAndReplies(id as string)
      if (Array.isArray(result?.replyNotes)) {
        setReplies(result.replyNotes)
      }
    } catch (error) {
      console.error("Failed to submit reply:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-screen-md py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Loading...</h1>
          </div>
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (!mainNote) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-screen-md py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Note not found</h1>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-screen-md py-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Note</h1>
        </div>

        {/* Main Note */}
        <Post
          id={mainNote.id}
          content={mainNote.content}
          author={{
            name: mainNote.pubkey.slice(0, 8),
            picture: undefined,
            pubkey: mainNote.pubkey
          }}
          timestamp={mainNote.created_at}
        />

        {/* Reply Form */}
        <div className="mt-4 mb-6 space-y-2">
          <Textarea
            placeholder="Write your reply..."
            value={replyContent}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyContent(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmitReply}>Reply</Button>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Replies ({replies.length})</h2>
          {replies.length > 0 ? (
            replies.map((reply) => (
              <Post
                key={reply.id}
                id={reply.id}
                content={reply.content}
                author={{
                  name: reply.pubkey.slice(0, 8),
                  picture: undefined,
                  pubkey: reply.pubkey
                }}
                timestamp={reply.created_at}
              />
            ))
          ) : (
            <p className="text-muted-foreground">No replies yet</p>
          )}
        </div>
      </div>
    </div>
  )
}