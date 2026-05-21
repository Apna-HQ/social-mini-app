"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useMemo } from "react"
import type React from "react"
import { nip19 } from "nostr-tools"
import { Card, CardContent, CardHeader } from "./card"
import { AuthorInfo } from "./author-info"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { useApna } from "@/components/providers/ApnaProvider"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { hexToNpub, trimNpub } from "@/lib/utils/nostr"

interface ContentSegment {
  type:
    | "text"
    | "nostr"
    | "profile"
    | "indexed-tag"
    | "image"
    | "hashtag"
    | "youtube"
    | "url"
    | "audio"
    | "video"
  content: string
}

export interface ContentMention {
  pubkey: string
  npub?: string
  name: string
  handle?: string
  picture?: string
}

interface ContentRendererProps {
  content: string
  onHashtagClick?: (hashtag: string) => void
  parentNoteId?: string
  hideParentNote?: boolean
  mentions?: ContentMention[]
  tags?: string[][]
}

interface ReferencedNote {
  id: string
  content: string
  tags: string[][]
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
  const indexedTagRegex = /#\[\d+\]/g;
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/)?([a-zA-Z0-9_-]+)/gi;
  const audioRegex = /https?:\/\/\S+\.(mp3|wav|ogg)(\?\S*)?/gi;
  const videoRegex = /https?:\/\/\S+\.(mp4|webm)(\?\S*)?/gi;
  const urlRegex = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gi;

  // Combined regex to match any of the above
  const combinedRegex = new RegExp(
    `${nostrRegex.source}|${imageRegex.source}|${indexedTagRegex.source}|${hashtagRegex.source}|${youtubeRegex.source}|${audioRegex.source}|${videoRegex.source}`,
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
    } else if (
      matchedContent.startsWith("nostr:npub") ||
      matchedContent.startsWith("nostr:nprofile")
    ) {
      segments.push({
        type: "profile",
        content: matchedContent.slice(6)
      })
    } else if (matchedContent.startsWith("#[")) {
      segments.push({
        type: "indexed-tag",
        content: matchedContent.slice(2, -1)
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

// Import the ExpandableContent component and PostActions
import { ExpandableContent } from "./expandable-content"
import { PostActions } from "./post-actions"
import { useReactionCounts } from "../../lib/hooks/useReactionCounts"

// Parent Note component to display the parent note
const ParentNote = ({ note }: { note: ReferencedNote }) => {
  const router = useRouter()
  const { likes, reposts } = useReactionCounts(note.id)
  
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
      <CardContent className="pb-3">
        <ExpandableContent
          content={
            <ContentRenderer
              content={note.content}
              tags={note.tags}
              // No parentNoteId or hideParentNote props as per requirements
            />
          }
          contentLength={note.content.length}
        />
      </CardContent>
      <PostActions
        id={note.id}
        likes={likes}
        reposts={reposts}
      />
    </Card>
  )
}

export function ContentRenderer({
  content,
  onHashtagClick,
  parentNoteId,
  hideParentNote,
  mentions = [],
  tags = [],
}: ContentRendererProps) {
  const router = useRouter()
  const apna = useApna()
  const [referencedNotes, setReferencedNotes] = useState<{ [key: string]: ReferencedNote }>({})
  const [parentNote, setParentNote] = useState<ReferencedNote | null>(null)
  const segments = useMemo(() => parseContent(content), [content])
  const mentionLookup = useMemo(() => {
    const byHandle = new Map<string, ContentMention>()
    const byNpub = new Map<string, ContentMention>()
    const byPubkey = new Map<string, ContentMention>()
    const byTagIndex = new Map<number, ContentMention>()

    const registerMention = (mention: ContentMention) => {
      if (mention.pubkey) byPubkey.set(mention.pubkey.toLowerCase(), mention)
      const handle = (mention.handle || mention.name || "").replace(/^@/, "")
      if (handle) byHandle.set(handle.toLowerCase(), mention)
      if (mention.npub) byNpub.set(mention.npub.toLowerCase(), mention)
    }

    const tagMentions = profileTagMentions(tags)
    tagMentions.forEach(({ mention }) => registerMention(mention))
    mentions.forEach((mention) => registerMention(mention))
    tagMentions.forEach(({ index, mention }) => {
      byTagIndex.set(
        index,
        byPubkey.get(mention.pubkey.toLowerCase()) || mention
      )
    })

    return { byHandle, byNpub, byPubkey, byTagIndex }
  }, [mentions, tags])

  // Fetch parent note if parentNoteId is provided
  useEffect(() => {
    const fetchParentNote = async () => {
      if (!parentNoteId) return
      
      try {
        const note = await apna.social!.v1.note(parentNoteId)
        if (note) {
          setParentNote({
            id: note.id,
            content: note.content,
            tags: note.tags || [],
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
          const note = await apna.social!.v1.note(noteId)
          if (note) {
            fetchedNotes[noteId] = {
              id: note.id,
              content: note.content,
              tags: note.tags || [],
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
    <div className="space-y-2 whitespace-pre-wrap break-words">
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
            return (
              <span key={index}>
                {renderTextWithMentions(segment.content, mentionLookup.byHandle, router)}
              </span>
            )

          case "profile":
            return renderProfileMention(
              segment.content,
              mentionLookup,
              router,
              index
            )

          case "indexed-tag": {
            const tagMention = mentionLookup.byTagIndex.get(Number(segment.content))
            if (!tagMention) return <span key={index}>{`#[${segment.content}]`}</span>

            return (
              <AccountMention
                key={index}
                mention={tagMention}
                router={router}
                title={`#[${segment.content}]`}
              />
            )
          }

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
                  <div className="text-sm line-clamp-3 whitespace-pre-wrap break-words">
                    <ContentRenderer
                      content={referencedNote.content}
                      tags={referencedNote.tags}
                      hideParentNote
                    />
                  </div>
                </CardContent>
              </Card>
            )
          }

          case "image": {
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

function renderTextWithMentions(
  text: string,
  mentionsByHandle: Map<string, ContentMention>,
  router: ReturnType<typeof useRouter>
) {
  if (mentionsByHandle.size === 0) return text

  const parts: React.ReactNode[] = []
  const mentionRegex = /(^|[^\w])@([A-Za-z0-9_.-]{2,32})/g
  let currentIndex = 0
  let match: RegExpExecArray | null

  while ((match = mentionRegex.exec(text)) !== null) {
    const fullMatch = match[0]
    const prefix = match[1] || ""
    const handle = match[2]
    const mention = mentionsByHandle.get(handle.toLowerCase())

    if (!mention) continue

    const mentionStart = match.index + prefix.length
    if (mentionStart > currentIndex) {
      parts.push(text.slice(currentIndex, mentionStart))
    }

    parts.push(
      <AccountMention
        key={`${mention.pubkey}-${mentionStart}`}
        mention={mention}
        router={router}
        title={`@${handle}`}
      />
    )

    currentIndex = match.index + fullMatch.length
  }

  if (currentIndex === 0) return text
  if (currentIndex < text.length) parts.push(text.slice(currentIndex))
  return parts
}

function renderProfileMention(
  reference: string,
  mentionLookup: {
    byNpub: Map<string, ContentMention>
    byPubkey: Map<string, ContentMention>
  },
  router: ReturnType<typeof useRouter>,
  key: React.Key
) {
  const resolved = resolveProfileReference(reference, mentionLookup)

  return (
    <AccountMention
      key={key}
      mention={resolved.mention}
      npub={resolved.npub}
      pubkey={resolved.pubkey}
      router={router}
      title={`nostr:${reference}`}
    />
  )
}

function AccountMention({
  mention,
  npub,
  pubkey,
  router,
  title,
}: {
  mention?: ContentMention
  npub?: string
  pubkey?: string
  router: ReturnType<typeof useRouter>
  title?: string
}) {
  const target = mention?.pubkey || pubkey || npub || ""
  const profile = useUserProfile(mention?.pubkey || pubkey || npub || "")
  const resolvedNpub =
    mention?.npub || npub || (pubkey ? hexToNpub(pubkey) : undefined)
  const fallback = resolvedNpub ? trimNpub(resolvedNpub, 8, 4) : "account"
  const displayName = mention?.name || profile.name || fallback
  const picture = mention?.picture || profile.picture
  const initial = displayName.trim().charAt(0).toUpperCase() || "U"

  return (
    <button
      type="button"
      title={title || (resolvedNpub ? `nostr:${resolvedNpub}` : undefined)}
      className="mx-0.5 inline-flex max-w-[14rem] items-center gap-1.5 rounded-full border border-border/80 bg-secondary/70 px-1.5 py-0.5 align-middle text-sm font-medium leading-none text-secondary-foreground transition-colors hover:border-primary/30 hover:bg-accent/70"
      onClick={(event) => {
        event.stopPropagation()
        if (target) router.push(`/user/${target}`)
      }}
    >
      <Avatar className="h-5 w-5 border border-background">
        <AvatarImage src={picture} alt="" />
        <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 truncate">{displayName}</span>
    </button>
  )
}

function profileTagMentions(
  tags: string[][]
): Array<{ index: number; mention: ContentMention }> {
  return tags.flatMap((tag, index) => {
    const pubkey = tag[0] === "p" ? tag[1] : undefined
    if (!pubkey || !isProfilePubkey(pubkey)) return []

    return [
      {
        index,
        mention: {
          pubkey,
          npub: pubkey.startsWith("npub") ? pubkey : hexToNpub(pubkey),
          name: "",
        },
      },
    ]
  })
}

function resolveProfileReference(
  reference: string,
  mentionLookup: {
    byNpub: Map<string, ContentMention>
    byPubkey: Map<string, ContentMention>
  }
): { mention?: ContentMention; npub?: string; pubkey?: string } {
  const directMention = mentionLookup.byNpub.get(reference.toLowerCase())
  if (directMention) {
    return {
      mention: directMention,
      npub: directMention.npub || reference,
      pubkey: directMention.pubkey,
    }
  }

  const decoded = decodeProfileReference(reference)
  const mention = decoded.pubkey
    ? mentionLookup.byPubkey.get(decoded.pubkey.toLowerCase())
    : undefined

  return {
    mention,
    npub: mention?.npub || decoded.npub,
    pubkey: mention?.pubkey || decoded.pubkey,
  }
}

function decodeProfileReference(
  reference: string
): { npub?: string; pubkey?: string } {
  try {
    const decoded = nip19.decode(reference)
    if (decoded.type === "npub" && typeof decoded.data === "string") {
      return { npub: reference, pubkey: decoded.data }
    }

    if (decoded.type === "nprofile") {
      const data = decoded.data as { pubkey?: string }
      if (data.pubkey) return { npub: hexToNpub(data.pubkey), pubkey: data.pubkey }
    }
  } catch {
    // Keep rendering a readable fallback when an account reference is malformed.
  }

  return reference.startsWith("npub") ? { npub: reference } : {}
}

function isProfilePubkey(pubkey: string): boolean {
  return /^[0-9a-f]{64}$/i.test(pubkey) || pubkey.startsWith("npub")
}
