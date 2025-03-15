"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader } from "./card"
import { AuthorInfo } from "./author-info"
import { useApna } from "@/components/providers/ApnaProvider"

interface ContentSegment {
  type: "text" | "nostr" | "image" | "hashtag" | "youtube" | "url" | "audio" | "video"
  content: string
}

interface ContentRendererProps {
  content: string
  onHashtagClick?: (hashtag: string) => void
  parentNoteId?: string
  hideParentNote?: boolean
}

interface ReferencedNote {
  id: string
  content: string
  author: {
    name?: string
    picture?: string
    pubkey: string
  }
  created_at: number
}

// Custom hook for handling intersection observer
const useInView = () => {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      {
        threshold: 0.1 // Trigger when at least 10% of the element is visible
      }
    )

    const currentRef = ref.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [])

  return { ref, isInView }
}

// Media components that use the intersection observer
const YouTubeEmbed = ({ videoId }: { videoId: string }) => {
  const { ref, isInView } = useInView()
  return (
    <div className="relative w-full aspect-video max-h-64" ref={ref}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}${isInView ? '?autoplay=1&mute=1' : ''}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  )
}

const AudioPlayer = ({ src }: { src: string }) => {
  const { ref, isInView } = useInView()
  return (
    <div ref={ref}>
      <audio src={src} controls autoPlay={isInView} className="w-full">
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}

const VideoPlayer = ({ src }: { src: string }) => {
  const { ref, isInView } = useInView()
  return (
    <div ref={ref}>
      <video src={src} controls autoPlay={isInView} className="w-full aspect-video max-h-64">
        Your browser does not support the video element.
      </video>
    </div>
  )
}

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  let currentIndex = 0

  // Regular expressions for different content types
  const nostrRegex = /nostr:([a-zA-Z0-9]+)/g;
  const imageRegex = /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)(\?\S*)?/gi;
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/)?([a-zA-Z0-9_-]+)/gi;
  const audioRegex = /https?:\/\/\S+\.(mp3|wav|ogg)(\?\S*)?/gi;
  const videoRegex = /https?:\/\/\S+\.(mp4|webm)(\?\S*)?/gi;
  const urlRegex = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gi;

  // Combined regex to match any of the above
  const combinedRegex = new RegExp(
    `${nostrRegex.source}|${imageRegex.source}|${hashtagRegex.source}|${youtubeRegex.source}|${audioRegex.source}|${videoRegex.source}`,
    "gi"
  )

  let match
  while ((match = combinedRegex.exec(content)) !== null) {
    // Add text before the match if there is any
    if (match.index > currentIndex) {
      segments.push({
        type: "text",
        content: content.slice(currentIndex, match.index)
      })
    }

    const matchedContent = match[0]
    if (matchedContent.startsWith("nostr:note") || matchedContent.startsWith("nostr:nevent")) {
      segments.push({
        type: "nostr",
        content: matchedContent.slice(6) // Remove "nostr:" prefix
      })
    } else if (matchedContent.match(imageRegex)) {
      segments.push({
        type: "image",
        content: decodeURIComponent(matchedContent)
      })
    } else if (matchedContent.startsWith("#")) {
      segments.push({
        type: "hashtag",
        content: matchedContent
      })
    } else if (matchedContent.match(youtubeRegex)) {
      const videoId = youtubeRegex.exec(matchedContent)?.[5] || "";
      segments.push({
        type: "youtube",
        content: videoId,
      });
    } else if (matchedContent.match(audioRegex)) {
      segments.push({
        type: "audio",
        content: matchedContent
      })
    } else if (matchedContent.match(videoRegex)) {
      segments.push({
        type: "video",
        content: matchedContent
      })
    }

    currentIndex = match.index + matchedContent.length
  }

  // Add remaining text if any
  if (currentIndex < content.length) {
    const remainingContent = content.slice(currentIndex)
    if (remainingContent.match(urlRegex)) {
      segments.push({
        type: "url",
        content: remainingContent
      })
    } else {
      segments.push({
        type: "text",
        content: remainingContent
      })
    }
  }

  return segments
}

// Import the ExpandableContent component
import { ExpandableContent } from "./expandable-content"

// Parent Note component to display the parent note
const ParentNote = ({ note }: { note: ReferencedNote }) => {
  const router = useRouter()
  
  return (
    <Card className="border-muted mb-4 hover:bg-accent/5 transition-colors cursor-pointer"
      onClick={() => router.push(`/note/${note.id}`)}>
      <CardHeader className="pb-2">
        <AuthorInfo
          pubkey={note.author.pubkey}
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/user/${note.author.pubkey}`)
          }}
          timestamp={note.created_at}
        />
      </CardHeader>
      <CardContent>
        <ExpandableContent
          content={
            <ContentRenderer
              content={note.content}
              // No parentNoteId or hideParentNote props as per requirements
            />
          }
          contentLength={note.content.length}
        />
      </CardContent>
    </Card>
  )
}

export function ContentRenderer({ content, onHashtagClick, parentNoteId, hideParentNote }: ContentRendererProps) {
  const router = useRouter()
  const apna = useApna()
  const [referencedNotes, setReferencedNotes] = useState<{ [key: string]: ReferencedNote }>({})
  const [parentNote, setParentNote] = useState<ReferencedNote | null>(null)
  const segments = parseContent(content)

  // Fetch parent note if parentNoteId is provided
  useEffect(() => {
    const fetchParentNote = async () => {
      if (!parentNoteId) return
      
      try {
        const note = await apna.nostr.fetchNote(parentNoteId)
        if (note) {
          setParentNote({
            id: note.id,
            content: note.content,
            author: {
              pubkey: note.pubkey,
              // Additional metadata could be fetched here if needed
            },
            created_at: note.created_at
          })
        }
      } catch (error) {
        console.error(`Failed to fetch parent note ${parentNoteId}:`, error)
      }
    }

    fetchParentNote()
  }, [parentNoteId, apna])

  useEffect(() => {
    const fetchReferencedNotes = async () => {
      const noteIds = segments
        .filter(segment => segment.type === "nostr")
        .map(segment => segment.content)

      const fetchedNotes: { [key: string]: ReferencedNote } = {}
      
      for (const noteId of noteIds) {
        try {
          const note = await apna.nostr.fetchNote(noteId)
          if (note) {
            fetchedNotes[noteId] = {
              id: note.id,
              content: note.content,
              author: {
                pubkey: note.pubkey,
                // Additional metadata could be fetched here if needed
              },
              created_at: note.created_at
            }
          }
        } catch (error) {
          console.error(`Failed to fetch note ${noteId}:`, error)
        }
      }

      setReferencedNotes(fetchedNotes)
    }

    if (segments.some(segment => segment.type === "nostr")) {
      fetchReferencedNotes()
    }
  }, [content, apna, segments])

  return (
    <div className="space-y-2">
      {/* Render parent note if it exists and is not hidden */}
      {parentNote && !hideParentNote && (
        <div className="mb-4 border-b pb-4">
          <div className="text-sm text-muted-foreground mb-2">Replying to:</div>
          <ParentNote note={parentNote} />
        </div>
      )}
      {segments.map((segment, index) => {
        switch (segment.type) {
          case "text":
            return <span key={index}>{segment.content}</span>

          case "nostr": {
            const referencedNote = referencedNotes[segment.content]
            if (!referencedNote) return null

            return (
              <Card key={index} className="border-muted mt-2 hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => router.push(`/note/${referencedNote.id}`)}>
                <CardHeader className="pb-2">
                  <AuthorInfo
                    pubkey={referencedNote.author.pubkey}
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/user/${referencedNote.author.pubkey}`)
                    }}
                    timestamp={referencedNote.created_at}
                  />
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-3 whitespace-pre-wrap break-words">
                    {referencedNote.content}
                  </p>
                </CardContent>
              </Card>
            )
          }

          case "image": {
            const isProfilePic = segment.content.includes("github.com/shadcn.png")
            return (
              <div key={index}
                className={`relative rounded-lg overflow-hidden bg-muted`}
              >
                <Image
                  src={segment.content}
                  alt="Post image"
                  width={500}
                  height={300}
                  style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            )
          }

          case "hashtag":
            return (
              <button
                key={index}
                className="text-primary font-bold hover:text-accent transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onHashtagClick?.(segment.content.slice(1)) // Remove # prefix
                }}
              >
                {segment.content}
              </button>
            )
          case "youtube":
            return <YouTubeEmbed key={index} videoId={segment.content} />
          case "url":
            return (
              <a key={index} href={segment.content} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-accent transition-colors">
                {segment.content}
              </a>
            )
          case "audio":
            return <AudioPlayer key={index} src={segment.content} />
          case "video":
            return <VideoPlayer key={index} src={segment.content} />
          default:
            return null
        }
      })}
    </div>
  )
}