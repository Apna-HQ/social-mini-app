"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Bookmark,
  Hash,
  Home as HomeIcon,
  Loader2,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  User,
  Wallet,
  Zap,
} from "lucide-react"
import type { INote } from "@apna/sdk"

import { useApp } from "./providers"
import { useFeed } from "@/hooks/useFeed"
import { Post } from "@/components/ui/post"
import { Fab } from "@/components/ui/fab"
import { Button } from "@/components/ui/button"
import { noteToPostProps } from "@/lib/utils/post"

const navItems = [
  { label: "Home", icon: HomeIcon, active: true, href: "/" },
  { label: "Discover", icon: Search, href: "/search" },
  { label: "Notifications", icon: Bell, badge: 3 },
  { label: "Messages", icon: Mail, badge: 2 },
  { label: "Bookmarks", icon: Bookmark },
  { label: "Profile", icon: User, href: "/profile" },
]

export default function Home() {
  const router = useRouter()
  const { notes, loading, loadingMore, refreshing, error, loadMore, refreshFeed } = useFeed()
  const { publishNote, profile } = useApp()

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground md:pb-0">
      <div className="mx-auto grid min-h-screen max-w-[1280px] md:grid-cols-[220px_minmax(0,680px)] lg:grid-cols-[220px_minmax(0,680px)_320px]">
        <SocialSidebar onNavigate={(href) => href && router.push(href)} />

        <section className="min-w-0 border-x border-border/80 bg-card">
          <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-normal">Home</h1>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {notes.length ? `${notes.length} notes loaded` : "open social feed"}
                </p>
              </div>
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
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-border/80 bg-card p-1 text-sm">
              {["Following", "For you", "Replies"].map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                    index === 0
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </header>

          <ComposerPreview name={profile?.metadata.name} />

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
        </section>

        <RightRail />
      </div>

      <Fab onPublish={publishNote} />
    </main>
  )
}

function SocialSidebar({ onNavigate }: { onNavigate: (href?: string) => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-border/80 bg-background px-3 py-5 md:block">
      <div className="mb-5 flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground">
          S
        </span>
        <div>
          <p className="text-sm font-semibold">Social</p>
          <p className="font-mono text-[11px] text-muted-foreground">mini-app</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.href)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              item.active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] text-accent-foreground">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <Button className="mt-5 w-full rounded-lg">
        <Plus className="mr-2 h-4 w-4" />
        Compose
      </Button>

      <div className="absolute bottom-5 left-3 right-3 rounded-lg border border-border/80 bg-card p-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Identity
        </p>
        <p className="mt-1 truncate text-sm font-semibold">Apna signer</p>
        <p className="font-mono text-[11px] text-muted-foreground">host permissioned</p>
      </div>
    </aside>
  )
}

function ComposerPreview({ name }: { name?: string }) {
  return (
    <section className="border-b border-border/80 bg-background px-4 py-4">
      <div className="grid grid-cols-[40px_1fr] gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary text-sm font-semibold">
          {(name || "U").charAt(0).toUpperCase()}
        </span>
        <div>
          <button
            type="button"
            className="w-full rounded-lg border border-border/80 bg-card px-3 py-3 text-left text-sm text-muted-foreground"
          >
            What&apos;s happening?
          </button>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent">
              <Hash className="h-4 w-4" />
              <Zap className="h-4 w-4" />
              <Bookmark className="h-4 w-4" />
            </div>
            <Button size="sm" className="rounded-full px-4">Post</Button>
          </div>
        </div>
      </div>
    </section>
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

function RightRail() {
  return (
    <aside className="sticky top-0 hidden h-screen space-y-4 overflow-auto bg-background p-5 lg:block">
      <section className="rounded-xl bg-gradient-to-br from-[#4a3a28] to-[#1d1712] p-4 text-[#f3ead8]">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] opacity-70">
          <Wallet className="h-3.5 w-3.5" />
          Wallet context
        </div>
        <p className="mt-2 text-2xl font-semibold">248,109 sats</p>
        <p className="font-mono text-[11px] opacity-60">available for zaps</p>
      </section>

      <RailCard title="Trending">
        {["#nostr", "#bitcoin", "#cashu", "#zap", "#design"].map((tag, index) => (
          <div key={tag} className="flex items-center gap-3 py-2">
            <span className="w-5 font-mono text-[11px] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 text-sm font-medium">{tag}</span>
            <span className="font-mono text-[11px] text-emerald-600">+{9 + index * 4}%</span>
          </div>
        ))}
      </RailCard>

      <RailCard title="Shell">
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Nostr plumbing is hidden in the feed.</p>
          <p className="text-muted-foreground">Permissions are requested through Apna.</p>
        </div>
      </RailCard>
    </aside>
  )
}

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border/80 bg-card p-4">
      <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}
