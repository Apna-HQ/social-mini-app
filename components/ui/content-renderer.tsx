"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "./card"
import { AuthorInfo } from "./author-info"
import { useApna } from "@/components/providers/ApnaProvider"

interface ContentSegment {
  type: "text" | "nostr" | "image" | "hashtag"
  content: string
}

interface ContentRendererProps {
  content: string
  onHashtagClick?: (hashtag: string) => void
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

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  let currentIndex = 0

  // Regular expressions for different content types
  const nostrRegex = /nostr:([a-zA-Z0-9]+)/g
  const imageRegex = /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)(\?\S*)?/gi
  const hashtagRegex = /#[a-zA-Z0-9_]+/g

  // Combined regex to match any of the above
  const combinedRegex = new RegExp(`${nostrRegex.source}|${imageRegex.source}|${hashtagRegex.source}`, "gi")

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
    if (matchedContent.startsWith("nostr:")) {
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
    }

    currentIndex = match.index + matchedContent.length
  }

  // Add remaining text if any
  if (currentIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(currentIndex)
    })
  }

  return segments
}

export function ContentRenderer({ content, onHashtagClick }: ContentRendererProps) {
  const router = useRouter()
  const apna = useApna()
  const [referencedNotes, setReferencedNotes] = useState<{ [key: string]: ReferencedNote }>({})
  const segments = parseContent(content)

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
  }, [content, apna])

  return (
    <div className="space-y-2">
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
                className={`relative rounded-lg overflow-hidden bg-muted ${
                  isProfilePic ? "w-32 h-32" : "w-full aspect-video"
                }`}
              >
                <Image
                  src={segment.content}
                  alt="Post image"
                  fill
                  className="object-cover"
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

          default:
            return null
        }
      })}
    </div>
  )
}