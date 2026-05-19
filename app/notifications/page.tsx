"use client"

import { Bell, Loader2, MessageCircle, RefreshCcw, Repeat2, Smile } from "lucide-react"
import { useRouter } from "next/navigation"
import type { SocialNotification } from "@apna/sdk"

import { useNotifications } from "@/hooks/useNotifications"
import { AuthorInfo } from "@/components/ui/author-info"
import { Button } from "@/components/ui/button"
import { RailCard, SocialHeader, SocialLayout } from "@/components/ui/social-layout"
import { notificationLabel } from "@/lib/utils/social"

export default function NotificationsPage() {
  const router = useRouter()
  const { notifications, loading, error, refresh } = useNotifications()

  return (
    <SocialLayout rightRail={<NotificationsRail count={notifications.length} />}>
      <SocialHeader
        title="Notifications"
        subtitle={`${notifications.length} recent events`}
        action={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading notifications...</span>
        </div>
      )}

      {!loading && error && (
        <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
          <p className="text-sm font-medium text-destructive">Couldn&apos;t load notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      )}

      <div className="divide-y divide-border/80">
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => {
              const target = notification.targetEventId || notification.event.id
              router.push(`/note/${target}`)
            }}
            className="grid w-full grid-cols-[32px_1fr] gap-3 bg-card px-4 py-4 text-left transition-colors hover:bg-secondary/40"
          >
            <span className="mt-1 grid h-8 w-8 place-items-center rounded-lg bg-secondary text-secondary-foreground">
              <NotificationIcon notification={notification} />
            </span>
            <span className="min-w-0">
              <AuthorInfo pubkey={notification.actorPubkey} timestamp={notification.created_at} />
              <span className="mt-2 block text-sm text-muted-foreground">
                {notificationLabel(notification)}
              </span>
              {notification.event.content && (
                <span className="mt-1 line-clamp-2 block text-sm">
                  {notification.event.content}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </SocialLayout>
  )
}

function NotificationIcon({
  notification,
}: {
  notification: SocialNotification
}) {
  if (notification.type === "reply" || notification.type === "mention") {
    return <MessageCircle className="h-4 w-4" />
  }
  if (notification.type === "repost" || notification.type === "quote") {
    return <Repeat2 className="h-4 w-4" />
  }
  return <Smile className="h-4 w-4" />
}

function NotificationsRail({ count }: { count: number }) {
  return (
    <div className="space-y-4">
      <RailCard title="Activity">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Bell className="h-4 w-4" />
            Events
          </span>
          <span className="font-mono text-[12px]">{count}</span>
        </div>
      </RailCard>
    </div>
  )
}
