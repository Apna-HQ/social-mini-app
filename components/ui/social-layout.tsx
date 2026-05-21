"use client"

import { usePathname, useRouter } from "next/navigation"
import { Bell, Home, Mail, Plus, Search, User } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useComposer } from "@/components/ui/global-compose"
import { cn } from "@/lib/utils"

const navItems: Array<{
  label: string
  href: string
  icon: LucideIcon
}> = [
  { label: "Home", href: "/", icon: Home },
  { label: "Search", href: "/search", icon: Search },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Messages", href: "/messages", icon: Mail },
  { label: "Profile", href: "/profile", icon: User },
]

export function SocialLayout({
  children,
  rightRail,
  onCompose,
}: {
  children: React.ReactNode
  rightRail?: React.ReactNode
  onCompose?: () => void
}) {
  return (
    <main className="min-h-screen bg-background pb-24 text-foreground md:pb-0">
      <div className="mx-auto grid min-h-screen max-w-[1280px] md:grid-cols-[220px_minmax(0,680px)] lg:grid-cols-[220px_minmax(0,680px)_320px]">
        <SocialSidebar onCompose={onCompose} />
        <section className="min-w-0 border-x border-border/80 bg-card">
          {children}
        </section>
        <aside className="sticky top-0 hidden h-screen overflow-auto bg-background p-5 lg:block">
          {rightRail}
        </aside>
      </div>
    </main>
  )
}

export function SocialHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-normal">{title}</h1>
          {subtitle && (
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </header>
  )
}

export function RailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border/80 bg-card p-4">
      <h2 className="mb-2 font-mono text-[11px] font-medium uppercase text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

function SocialSidebar({ onCompose }: { onCompose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { openComposer } = useComposer()
  const handleCompose = onCompose ?? (() => openComposer())

  return (
    <aside className="sticky top-0 hidden h-screen border-r border-border/80 bg-background px-3 py-5 md:block">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="mb-5 flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-secondary/70"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground">
          S
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Social</span>
          <span className="block font-mono text-[11px] text-muted-foreground">
            mini-app
          </span>
        </span>
      </button>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <Button
        className="mt-5 w-full rounded-lg"
        onClick={handleCompose}
      >
        <Plus className="mr-2 h-4 w-4" />
        Compose
      </Button>
    </aside>
  )
}
