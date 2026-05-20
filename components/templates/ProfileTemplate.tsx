"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Loader2 } from "lucide-react"
import type { ApnaSocialDomain, INote, UserMetadata } from "@apna/sdk"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Fab } from "@/components/ui/fab"
import type { ComposerPublishHandler } from "@/components/ui/note-composer"
import { Post } from "@/components/ui/post"
import { RailCard, SocialHeader, SocialLayout } from "@/components/ui/social-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { NpubDisplay } from "@/components/atoms/NpubDisplay"
import { UserProfileCard } from "@/components/ui/user-profile-card"
import { INITIAL_FETCH_SIZE, LOAD_MORE_SIZE, userNotesFeedDB } from "@/lib/userNotesFeedDB"
import { isNote, mergeById } from "@/lib/utils/social"
import { noteToPostProps } from "@/lib/utils/post"

export interface UserProfile {
  metadata: UserMetadata
  followers: string[]
  following: string[]
  pubkey: string
}

interface ProfileTemplateProps {
  userProfile: UserProfile
  isCurrentUser: boolean
  isFollowing?: boolean
  showBackButton?: boolean
  showEditProfile?: boolean
  showFollowButton?: boolean
  showFab?: boolean
  isEditing?: boolean
  editForm?: UserMetadata
  onEditStart?: (data: UserMetadata) => void
  onEditSave?: (data: UserMetadata) => void
  onEditCancel?: () => void
  onFollowToggle?: () => Promise<void>
  onPublishNote?: ComposerPublishHandler
  social?: ApnaSocialDomain
}

const profileFields: Array<{
  key: keyof UserMetadata
  label: string
  placeholder: string
  multiline?: boolean
}> = [
  { key: "name", label: "Name", placeholder: "short handle" },
  { key: "display_name", label: "Display name", placeholder: "display name" },
  { key: "about", label: "About", placeholder: "bio", multiline: true },
  { key: "picture", label: "Picture", placeholder: "avatar URL" },
  { key: "banner", label: "Banner", placeholder: "banner URL" },
  { key: "website", label: "Website", placeholder: "https://..." },
  { key: "nip05", label: "NIP-05", placeholder: "name@example.com" },
  { key: "lud16", label: "Lightning", placeholder: "name@example.com" },
]

export function ProfileTemplate({
  userProfile,
  isCurrentUser,
  isFollowing = false,
  showBackButton = false,
  showEditProfile = false,
  showFollowButton = false,
  showFab = false,
  isEditing = false,
  editForm = {},
  onEditStart,
  onEditSave,
  onEditCancel,
  onFollowToggle,
  onPublishNote,
  social,
}: ProfileTemplateProps) {
  const router = useRouter()
  const [userNotes, setUserNotes] = useState<INote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const metadata = userProfile.metadata || {}
  const displayName = stringField(metadata.display_name) || stringField(metadata.name) || "Unknown"
  const handle = stringField(metadata.name) || "nostr user"
  const banner = imageSrc(metadata.banner)

  const fetchNotes = useCallback(async (before?: number, currentLength = 0) => {
    try {
      const cachedNotes = await userNotesFeedDB.getNotes(
        userProfile.pubkey,
        before ? LOAD_MORE_SIZE : INITIAL_FETCH_SIZE,
        before
      )
      const convertedCached = cachedNotes.map(toNote)

      if (convertedCached.length > 0) {
        setUserNotes((current) =>
          before ? mergeById(current, convertedCached) : convertedCached
        )
        setHasMore(cachedNotes.length >= (before ? LOAD_MORE_SIZE : INITIAL_FETCH_SIZE))
      }

      if (!social) {
        if (convertedCached.length === 0) setHasMore(false)
        return
      }

      const latestTimestamp = before
        ? undefined
        : await userNotesFeedDB.getLatestTimestamp(userProfile.pubkey)
      const freshEvents = await social.v1.userFeed(userProfile.pubkey, "NOTES_FEED", {
        since: before ? undefined : latestTimestamp ? latestTimestamp + 1 : undefined,
        until: before,
        limit: before ? LOAD_MORE_SIZE : INITIAL_FETCH_SIZE,
      })
      const freshNotes = freshEvents.filter(isNote)

      if (freshNotes.length > 0) {
        await userNotesFeedDB.addNotes(userProfile.pubkey, freshNotes)
        const updatedNotes = await userNotesFeedDB.getNotes(
          userProfile.pubkey,
          before ? currentLength + LOAD_MORE_SIZE : INITIAL_FETCH_SIZE
        )
        setUserNotes(updatedNotes.map(toNote))
        setHasMore(freshNotes.length >= (before ? LOAD_MORE_SIZE : INITIAL_FETCH_SIZE))
      } else if (convertedCached.length === 0) {
        setUserNotes([])
        setHasMore(false)
      }
    } catch (error) {
      console.error("Failed to fetch user notes:", error)
    }
  }, [social, userProfile.pubkey])

  useEffect(() => {
    setLoadingNotes(true)
    void fetchNotes().finally(() => setLoadingNotes(false))
  }, [fetchNotes])

  useEffect(() => {
    if (!social) return
    const unsubscribe = social.v1.subscribeUserFeed(
      userProfile.pubkey,
      "NOTES_FEED",
      { since: Math.floor(Date.now() / 1000), limit: 100 },
      (event) => {
        if (!isNote(event)) return
        setUserNotes((current) => mergeById(current, [event]))
        void userNotesFeedDB.addNotes(userProfile.pubkey, [event])
      }
    )
    return unsubscribe
  }, [social, userProfile.pubkey])

  const loadMoreNotes = async () => {
    if (loadingMore || !hasMore) return
    const oldestNote = userNotes[userNotes.length - 1]
    if (!oldestNote) return

    setLoadingMore(true)
    try {
      await fetchNotes(oldestNote.created_at, userNotes.length)
    } finally {
      setLoadingMore(false)
    }
  }

  const updateField = (key: keyof UserMetadata, value: string) => {
    onEditStart?.({
      ...editForm,
      [key]: value,
    })
  }

  return (
    <>
      <SocialLayout
        rightRail={
          <ProfileRail
            notes={userNotes.length}
            followers={userProfile.followers.length}
            following={userProfile.following.length}
          />
        }
      >
        <SocialHeader
          title={displayName}
          subtitle={isCurrentUser ? "your profile" : "profile"}
          action={
            showBackButton ? (
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : null
          }
        />

        <section className="border-b border-border/80 bg-card">
          {banner && (
            <div className="relative h-32 overflow-hidden border-b border-border/80 bg-secondary">
              <Image
                src={banner}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 680px"
                className="object-cover"
              />
            </div>
          )}

          <div className="p-4">
            {isEditing ? (
              <div className="space-y-4">
                <ProfileIdentity
                  name={stringField(editForm.display_name) || stringField(editForm.name) || displayName}
                  picture={stringField(editForm.picture) || stringField(metadata.picture)}
                  pubkey={userProfile.pubkey}
                />

                <div className="grid gap-3">
                  {profileFields.map((field) => (
                    <label key={String(field.key)} className="grid gap-1 text-sm">
                      <span className="font-medium">{field.label}</span>
                      {field.multiline ? (
                        <Textarea
                          value={stringField(editForm[field.key])}
                          onChange={(event) => updateField(field.key, event.target.value)}
                          placeholder={field.placeholder}
                          className="min-h-[96px]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={stringField(editForm[field.key])}
                          onChange={(event) => updateField(field.key, event.target.value)}
                          placeholder={field.placeholder}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      )}
                    </label>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => onEditSave?.(editForm)}>Save</Button>
                  <Button variant="outline" onClick={onEditCancel}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <ProfileIdentity
                    name={displayName}
                    picture={stringField(metadata.picture)}
                    pubkey={userProfile.pubkey}
                  />
                  <div className="ml-auto flex shrink-0 gap-2">
                    {showEditProfile && isCurrentUser && (
                      <Button
                        variant="outline"
                        onClick={() => onEditStart?.({ ...metadata })}
                      >
                        Edit
                      </Button>
                    )}
                    {showFollowButton && !isCurrentUser && (
                      <Button onClick={onFollowToggle} variant={isFollowing ? "outline" : "default"}>
                        {isFollowing ? "Unfollow" : "Follow"}
                      </Button>
                    )}
                  </div>
                </div>

                {stringField(metadata.about) && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {stringField(metadata.about)}
                  </p>
                )}

                <ProfileMetadata metadata={metadata} />

                <div className="grid grid-cols-3 rounded-lg border border-border/80 text-center text-sm">
                  <Stat label="Notes" value={userNotes.length} />
                  <Stat label="Followers" value={userProfile.followers.length} />
                  <Stat label="Following" value={userProfile.following.length} />
                </div>
              </div>
            )}
          </div>
        </section>

        <Tabs defaultValue="notes">
          <TabsList className="w-full rounded-none border-b border-border/80 bg-background">
            <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
            <TabsTrigger value="followers" className="flex-1">Followers</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="m-0">
            {loadingNotes ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading notes...</span>
              </div>
            ) : userNotes.length > 0 ? (
              <>
                <div className="divide-y divide-border/80">
                  {userNotes.map((note) => (
                    <Post key={note.id} {...noteToPostProps(note)} />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center px-4 py-6">
                    <Button variant="outline" onClick={loadMoreNotes} disabled={loadingMore}>
                      {loadingMore ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No notes yet.
              </div>
            )}
          </TabsContent>

          <TabsContent value="followers" className="m-0 divide-y divide-border/80">
            {userProfile.followers.length > 0 ? (
              userProfile.followers.map((pubkey) => (
                <div key={pubkey} className="px-4 py-3">
                  <UserProfileCard pubkey={pubkey} />
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No followers yet.
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="m-0 divide-y divide-border/80">
            {userProfile.following.length > 0 ? (
              userProfile.following.map((pubkey) => (
                <div key={pubkey} className="px-4 py-3">
                  <UserProfileCard pubkey={pubkey} />
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Not following anyone yet.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SocialLayout>

      {showFab && onPublishNote && <Fab onPublish={onPublishNote} />}
    </>
  )
}

function ProfileIdentity({
  name,
  picture,
  pubkey,
}: {
  name: string
  picture?: string
  pubkey: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <Avatar className="h-20 w-20 text-2xl">
        <AvatarImage src={picture} alt="" />
        <AvatarFallback className="text-2xl font-bold">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold">{name}</h1>
        <NpubDisplay pubkey={pubkey} className="text-sm text-muted-foreground" />
      </div>
    </div>
  )
}

function ProfileMetadata({ metadata }: { metadata: UserMetadata }) {
  const fields = [
    stringField(metadata.website),
    stringField(metadata.nip05),
    stringField(metadata.lud16 || metadata.lud06),
  ].filter(Boolean)

  if (fields.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <span
          key={field}
          className="rounded-md bg-secondary px-2 py-1 font-mono text-[11px] text-secondary-foreground"
        >
          {field}
        </span>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-border/80 px-2 py-3 last:border-r-0">
      <p className="font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function ProfileRail({
  notes,
  followers,
  following,
}: {
  notes: number
  followers: number
  following: number
}) {
  return (
    <div className="space-y-4">
      <RailCard title="Profile">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Notes</span>
            <span className="font-mono text-[12px]">{notes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Followers</span>
            <span className="font-mono text-[12px]">{followers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Following</span>
            <span className="font-mono text-[12px]">{following}</span>
          </div>
        </div>
      </RailCard>
    </div>
  )
}

function toNote(note: any): INote {
  return {
    ...note,
    kind: 1,
    sig: note.sig || "",
    tags: note.tags || [],
  }
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function imageSrc(value: unknown): string {
  const src = stringField(value)
  if (src.startsWith("https://") || src.startsWith("http://") || src.startsWith("/")) {
    return src
  }
  return ""
}
