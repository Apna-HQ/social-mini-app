"use client"

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type React from "react"
import { AtSign, ImageIcon, Loader2, Send, X } from "lucide-react"
import { nip19 } from "nostr-tools"
import type { ApnaSocialDomain, UserMetadata, UserProfile } from "@apna/sdk"

import { ApnaContext } from "@/components/providers/ApnaProvider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ContentRenderer } from "@/components/ui/content-renderer"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { hexToNpub, trimNpub } from "@/lib/utils/nostr"

export interface ComposerMention {
  pubkey: string
  npub?: string
  name: string
  handle?: string
  picture?: string
}

export interface ComposerPublishOptions {
  mentions?: Array<{
    pubkey: string
    relay?: string
    marker?: string
  }>
}

export type ComposerPublishHandler = (
  content: string,
  options?: ComposerPublishOptions
) => void | Promise<unknown>

interface NoteComposerProps {
  onPublish: ComposerPublishHandler
  onPublished?: () => void
  onCancel?: () => void
  placeholder?: string
  publishLabel?: string
  cancelLabel?: string
  className?: string
  textareaClassName?: string
  variant?: "inline" | "modal" | "compact"
  autoFocus?: boolean
  showAvatar?: boolean
  avatarName?: string
  avatarImage?: string
}

type SocialWithSuggestions = ApnaSocialDomain & {
  v1: ApnaSocialDomain["v1"] & {
    profileSuggestions?: (
      query?: string,
      opts?: { limit?: number; includeFollowing?: boolean }
    ) => Promise<UserProfile[]>
    uploadMedia?: (opts: {
      data: ArrayBuffer
      contentType?: string
      fileName?: string
      description?: string
    }) => Promise<{
      url: string
      sha256: string
      size: number
      type?: string
    }>
  }
}

interface MentionCandidate extends ComposerMention {
  handle: string
  displayName: string
}

interface ActiveToken {
  start: number
  end: number
  query: string
}

const NPUB_MENTION_REGEX =
  /nostr:(npub1[023456789acdefghjklmnpqrstuvwxyz]{20,})/gi

export function NoteComposer({
  onPublish,
  onPublished,
  onCancel,
  placeholder = "What's happening?",
  publishLabel = "Post",
  cancelLabel = "Cancel",
  className,
  textareaClassName,
  variant = "inline",
  autoFocus = false,
  showAvatar = variant === "inline",
  avatarName,
  avatarImage,
}: NoteComposerProps) {
  const apnaContext = useContext(ApnaContext)
  const social = apnaContext?.social as SocialWithSuggestions | undefined
  const identity = apnaContext?.identity
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pendingNpubs = useRef(new Set<string>())

  const [content, setContent] = useState("")
  const [caret, setCaret] = useState(0)
  const [focused, setFocused] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishProgress, setPublishProgress] = useState(0)
  const [publishStage, setPublishStage] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [mentionMap, setMentionMap] = useState<Map<string, ComposerMention>>(
    () => new Map()
  )
  const [profiles, setProfiles] = useState<MentionCandidate[]>([])
  const [shouldLoadProfiles, setShouldLoadProfiles] = useState(autoFocus)

  useEffect(() => {
    if (!autoFocus) return
    setShouldLoadProfiles(true)
    const timeout = window.setTimeout(() => textareaRef.current?.focus(), 50)
    return () => window.clearTimeout(timeout)
  }, [autoFocus])

  const activeToken = useMemo(
    () => getActiveToken(content, caret),
    [content, caret]
  )

  useEffect(() => {
    if (activeToken) setShouldLoadProfiles(true)
  }, [activeToken])

  useEffect(() => {
    if (!social || !identity || !shouldLoadProfiles) return

    let cancelled = false
    const loadProfiles = async () => {
      try {
        const suggested = await social.v1.profileSuggestions?.("", {
          limit: 24,
          includeFollowing: true,
        })

        if (suggested && suggested.length > 0) {
          if (!cancelled) setProfiles(toCandidates(suggested))
          return
        }

        const me = await identity.v1.me().catch(() => null)
        const following = me?.following?.slice(0, 24) ?? []
        const resolved = await Promise.all(
          following.map((pubkey) =>
            social.v1.userProfile(pubkey).catch(() => null)
          )
        )

        if (!cancelled) {
          setProfiles(toCandidates(resolved.filter(Boolean) as UserProfile[]))
        }
      } catch {
        if (!cancelled) setProfiles([])
      }
    }

    void loadProfiles()
    return () => {
      cancelled = true
    }
  }, [identity, shouldLoadProfiles, social])

  const suggestions = useMemo(() => {
    if (!activeToken) return []
    const query = activeToken.query.toLowerCase()
    const knownMentions = toCandidates(
      Array.from(mentionMap.values()).map((mention) => ({
        pubkey: mention.pubkey,
        npub: mention.npub || hexToNpub(mention.pubkey),
        metadata: {
          name: mention.name,
          display_name: mention.name,
          picture: mention.picture,
        },
        following: [],
        followers: [],
      }))
    )
    const merged = uniqueByPubkey([...knownMentions, ...profiles])

    return merged
      .filter((profile) => {
        const haystack = `${profile.displayName} ${profile.handle} ${profile.npub || ""}`.toLowerCase()
        return haystack.includes(query)
      })
      .slice(0, 5)
  }, [activeToken, mentionMap, profiles])

  const showSuggestions = focused && !!activeToken && suggestions.length > 0
  const referencedNpubs = useMemo(() => getReferencedNpubs(content), [content])
  const previewMentions = useMemo(
    () =>
      Array.from(mentionMap.values()).filter((mention) =>
        referencedNpubs.has(mentionNpub(mention).toLowerCase())
      ),
    [mentionMap, referencedNpubs]
  )

  const addMention = useCallback((candidate: ComposerMention) => {
    setMentionMap((current) => {
      const next = new Map(current)
      next.set(candidate.pubkey, candidate)
      return next
    })
  }, [])

  const resolveNpubToken = useCallback(
    async (npub: string) => {
      if (!social || pendingNpubs.current.has(npub)) return

      try {
        const decoded = nip19.decode(npub)
        if (decoded.type !== "npub") return
      } catch {
        return
      }

      pendingNpubs.current.add(npub)
      try {
        const profile = await social.v1.userProfile(npub)
        const candidate = toCandidate(profile)
        addMention(candidate)
      } finally {
        pendingNpubs.current.delete(npub)
      }
    },
    [addMention, social]
  )

  useEffect(() => {
    const matches = Array.from(content.matchAll(NPUB_MENTION_REGEX))
    matches.forEach((match) => {
      const npub = match[1]
      if (npub) void resolveNpubToken(npub)
    })
  }, [content, resolveNpubToken])

  const updateCaret = (target: HTMLTextAreaElement) => {
    setCaret(target.selectionStart ?? target.value.length)
  }

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value)
    updateCaret(event.target)
    setError(null)
  }

  const insertMention = (candidate: MentionCandidate) => {
    const token = activeToken
    if (!token) return

    const reference = `nostr:${mentionNpub(candidate)}`
    const before = content.slice(0, token.start)
    const after = content.slice(token.end)
    const nextContent = `${before}${reference} ${after}`
    const nextCaret = before.length + reference.length + 1

    addMention(candidate)
    setContent(nextContent)
    setCaret(nextCaret)
    window.setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret)
    }, 0)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault()
      insertMention(suggestions[0])
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setFocused(false)
    }
  }

  const buildPublishOptions = (): ComposerPublishOptions | undefined => {
    const mentions = Array.from(mentionMap.values())
      .filter((mention) =>
        referencedNpubs.has(mentionNpub(mention).toLowerCase())
      )
      .map((mention) => ({
        pubkey: mention.pubkey,
        marker: "mention",
      }))

    return mentions.length > 0 ? { mentions } : undefined
  }

  const handlePublish = async () => {
    const trimmed = content.trim()
    if (!trimmed || publishing) return

    setPublishing(true)
    setPublishProgress(12)
    setPublishStage("Preparing")
    setError(null)
    const progressTimer = window.setInterval(() => {
      setPublishProgress((current) => {
        if (current >= 88) return current
        return Math.min(88, current + Math.max(3, (88 - current) * 0.16))
      })
    }, 140)

    try {
      setPublishStage("Publishing")
      await onPublish(trimmed, buildPublishOptions())
      setPublishProgress(100)
      setPublishStage("Published")
      setContent("")
      setMentionMap(new Map())
      setUploadedImages([])
      onPublished?.()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message || "Could not publish")
      setPublishStage("Failed")
    } finally {
      window.clearInterval(progressTimer)
      window.setTimeout(() => {
        setPublishing(false)
        setPublishProgress(0)
        setPublishStage("")
      }, 350)
    }
  }

  const appendInlineImage = (url: string) => {
    setContent((current) => {
      const prefix = current.trimEnd()
      return `${prefix}${prefix ? "\n\n" : ""}${url}\n`
    })
    setUploadedImages((current) => [...current, url])
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleImageSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file to upload.")
      return
    }

    if (!social?.v1.uploadMedia) {
      setError("Image uploads are not available in this host yet.")
      return
    }

    setUploadingImage(true)
    setError(null)
    try {
      const descriptor = await social.v1.uploadMedia({
        data: await file.arrayBuffer(),
        contentType: file.type,
        fileName: file.name,
        description: `social note image: ${file.name}`,
      })
      appendInlineImage(descriptor.url)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message || "Could not upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  const fallbackInitial = (avatarName || "U").charAt(0).toUpperCase()

  return (
    <div
      className={cn(
        showAvatar && "grid grid-cols-[40px_minmax(0,1fr)] gap-3",
        className
      )}
    >
      {showAvatar && (
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage src={avatarImage} alt="" />
          <AvatarFallback>{fallbackInitial}</AvatarFallback>
        </Avatar>
      )}

      <div className="min-w-0 space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={content}
            onChange={handleChange}
            onSelect={(event) => updateCaret(event.currentTarget)}
            onClick={(event) => updateCaret(event.currentTarget)}
            onKeyUp={(event) => updateCaret(event.currentTarget)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true)
              setShouldLoadProfiles(true)
            }}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            className={cn(
              "resize-none border-border/80 bg-background shadow-none",
              variant === "modal" && "min-h-[160px]",
              variant === "inline" && "min-h-[104px]",
              variant === "compact" && "min-h-[96px]",
              textareaClassName
            )}
          />

          {showSuggestions && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
              {suggestions.map((candidate) => (
                <button
                  key={candidate.pubkey}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    insertMention(candidate)
                  }}
                  className="grid w-full grid-cols-[32px_minmax(0,1fr)] gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/70"
                >
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={candidate.picture} alt="" />
                    <AvatarFallback>
                      {candidate.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {candidate.displayName}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      @{candidate.handle}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {content.trim() && (
          <div className="rounded-lg border border-border/80 bg-secondary/25 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] uppercase text-muted-foreground">
                Preview
              </span>
              {previewMentions.length > 0 && (
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {previewMentions.length} tag
                  {previewMentions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="rounded-md bg-background px-3 py-2 text-sm">
              <ContentRenderer
                content={content}
                mentions={previewMentions}
                hideParentNote
              />
            </div>
          </div>
        )}

        {publishing && (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-150 ease-out"
                style={{ width: `${publishProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span>{publishStage}</span>
              <span>{Math.round(publishProgress)}%</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AtSign className="h-4 w-4" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelected}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || publishing}
              title="Add image"
            >
              {uploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              <span className="sr-only">Add image</span>
            </Button>
            {uploadedImages.length > 0 && (
              <span className="font-mono text-[11px]">
                {uploadedImages.length} image{uploadedImages.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={publishing}
              >
                <X className="mr-2 h-4 w-4" />
                {cancelLabel}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="rounded-full px-4"
              onClick={handlePublish}
              disabled={!content.trim() || publishing}
            >
              {publishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {publishing ? "Posting" : publishLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getActiveToken(content: string, caret: number): ActiveToken | null {
  const before = content.slice(0, caret)
  const match = /(^|\s)@([A-Za-z0-9_.-]*)$/.exec(before)
  if (!match) return null

  const token = match[2]

  const start = match.index + match[1].length
  return {
    start,
    end: caret,
    query: token,
  }
}

function getReferencedNpubs(content: string): Set<string> {
  return new Set(
    Array.from(content.matchAll(NPUB_MENTION_REGEX))
      .map((match) => match[1]?.toLowerCase())
      .filter(Boolean) as string[]
  )
}

function mentionNpub(mention: ComposerMention): string {
  return mention.npub || hexToNpub(mention.pubkey)
}

function toCandidates(profiles: UserProfile[]): MentionCandidate[] {
  return uniqueByPubkey(profiles.map(toCandidate))
}

function toCandidate(profile: UserProfile): MentionCandidate {
  const metadata = profile.metadata || {}
  const displayName =
    stringField(metadata.display_name) ||
    stringField(metadata.name) ||
    trimNpub(profile.npub || hexToNpub(profile.pubkey), 6, 4)
  const handle =
    slugHandle(stringField(metadata.name) || stringField(metadata.display_name)) ||
    trimNpub(profile.npub || hexToNpub(profile.pubkey), 6, 4).replace(/\W/g, "")

  return {
    pubkey: profile.pubkey,
    npub: profile.npub || hexToNpub(profile.pubkey),
    name: displayName,
    displayName,
    handle,
    picture: stringField(metadata.picture),
  }
}

function uniqueByPubkey<T extends { pubkey: string }>(profiles: T[]): T[] {
  const byPubkey = new Map<string, T>()
  profiles.forEach((profile) => byPubkey.set(profile.pubkey, profile))
  return Array.from(byPubkey.values())
}

function slugHandle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "").slice(0, 24)
}

function stringField(value: UserMetadata[keyof UserMetadata] | unknown): string {
  return typeof value === "string" ? value : ""
}
