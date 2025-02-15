"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useApp } from "../../providers"
import { Post } from "@/components/ui/post"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import type { INote, INoteReply } from "@apna/sdk"
import { noteToPostProps } from "@/lib/utils/post"

export const dynamic = 'force-dynamic'

// Separate component for reply form to prevent parent re-renders
const ReplyForm = ({ noteId, onSubmit }: { noteId: string; onSubmit: (content: string) => Promise<void> }) => {
  const [content, setContent] = useState("")

  const handleSubmit = async () => {
    if (!content.trim()) return
    await onSubmit(content)
    setContent("")
  }

  return (
    <div className="mt-4 mb-6 ml-12 space-y-2">
      <Textarea
        placeholder="Write your reply..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[100px]"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onSubmit("")}>Cancel</Button>
        <Button onClick={handleSubmit}>Reply</Button>
      </div>
    </div>
  )
}

export default function ThreadPage() {
  const router = useRouter()
  const { id } = useParams()
  const { replyToNote, fetchNoteAndReplies } = useApp()
  const [mainNote, setMainNote] = useState<INote | null>(null)
  const [replies, setReplies] = useState<INoteReply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  useEffect(() => {
    const fetchNote = async () => {
      try {
        // First fetch the current note
        const result = await fetchNoteAndReplies(id as string)
        console.log('Fetched note and replies:', result)
        // Set the initial replyingTo state to the clicked note
        setReplyingTo(id as string)
        
        // Check if this is a reply and has a root note
        const rootNoteId = (result?.note?.tags as string[][])?.find(
          tag => tag[0] === "e" && tag[3] === "root"
        )?.[1]

        // If this is a reply, fetch the thread from root
        if (rootNoteId && rootNoteId !== id) {
          const rootResult = await fetchNoteAndReplies(rootNoteId)
          if (rootResult?.note) {
            setMainNote(rootResult.note)
            if (Array.isArray(rootResult?.replyNotes)) {
              setReplies(rootResult.replyNotes)
            }
          }
        } else {
          // Not a reply or is the root note itself
          if (result?.note) {
            setMainNote(result.note)
          }
          if (Array.isArray(result?.replyNotes)) {
            setReplies(result.replyNotes)
          } else {
            console.error('Unexpected replies format:', result?.replyNotes)
            setReplies([])
          }
        }
      } catch (error) {
        console.error("Failed to fetch note:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNote()
  }, [id, fetchNoteAndReplies])

  const handleReplySubmit = async (noteId: string, content: string) => {
    if (!content) {
      setReplyingTo(null)
      return
    }

    try {
      await replyToNote(noteId, content)
      // Fetch updated replies
      const result = await fetchNoteAndReplies(id as string)
      if (Array.isArray(result?.replyNotes)) {
        setReplies(result.replyNotes)
      }
      // Clear replyingTo after successful reply
      setReplyingTo(null)
    } catch (error) {
      console.error("Failed to submit reply:", error)
    }
  }

  const NotePost = ({ note, level = 0, isTarget = false }: { note: INote | INoteReply; level?: number; isTarget?: boolean }) => {
    const noteRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (isTarget && noteRef.current) {
        setTimeout(() => {
          noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }, [isTarget]);

    return (
      <div ref={noteRef} style={{ marginLeft: `${level * 24}px` }}>
        <Post
          {...noteToPostProps(note, {
            onReply: () => {
              if (noteRef.current) {
                noteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              setReplyingTo(note.id);
            }
          })}
        />
        {replyingTo === note.id && (
          <ReplyForm 
            noteId={note.id} 
            onSubmit={(content) => handleReplySubmit(note.id, content)} 
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-screen-md py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Loading Thread...</h1>
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
            <h1 className="text-xl font-semibold">Thread not found</h1>
          </div>
        </div>
      </div>
    )
  }

  // Helper function to organize replies hierarchically
  const organizeReplies = () => {
    const replyMap = new Map<string, INoteReply[]>();
    
    // Group replies by their direct parent
    replies.forEach(reply => {
      const tags = reply.tags as string[][];
      let parentId = mainNote.id; // Default to main note

      // Find all "e" tags marked as "reply"
      const replyTags = tags?.filter(tag => tag[0] === "e" && tag[3] === "reply");
      if (replyTags?.length > 0) {
        // Use the last reply tag as the parent
        parentId = replyTags[replyTags.length - 1][1];
      } else {
        // If no reply tags, check for root tag
        const rootTag = tags?.find(tag => tag[0] === "e" && tag[3] === "root");
        if (rootTag) {
          parentId = rootTag[1];
        }
      }
      
      if (!replyMap.has(parentId)) {
        replyMap.set(parentId, []);
      }
      replyMap.get(parentId)?.push(reply);
    });

    // Recursive function to render replies with proper indentation
    const renderReplies = (parentId: string, level: number = 0) => {
      const children = replyMap.get(parentId) || [];
      return children.map((reply) => (
        <div key={reply.id}>
          <NotePost note={reply} level={level} isTarget={reply.id === id} />
          {renderReplies(reply.id, level + 1)}
        </div>
      ));
    };

    return renderReplies(mainNote.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-screen-md py-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Thread</h1>
        </div>

        {/* Main Note */}
        <NotePost note={mainNote} isTarget={mainNote.id === id} />
        {replyingTo === mainNote.id && (
          <ReplyForm 
            noteId={mainNote.id} 
            onSubmit={(content) => handleReplySubmit(mainNote.id, content)} 
          />
        )}

        {/* Replies */}
        <div className="space-y-4 mt-6">
          <h2 className="text-lg font-semibold">Replies ({replies.length})</h2>
          {replies.length > 0 ? (
            <div className="space-y-6">
              {organizeReplies()}
            </div>
          ) : (
            <p className="text-muted-foreground">No replies yet</p>
          )}
        </div>
      </div>
    </div>
  )
}