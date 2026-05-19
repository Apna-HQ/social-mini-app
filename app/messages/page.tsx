"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Mail, RefreshCcw, Send } from "lucide-react"

import { useMessages } from "@/hooks/useMessages"
import { useApp } from "@/app/providers"
import { AuthorInfo } from "@/components/ui/author-info"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RailCard, SocialHeader, SocialLayout } from "@/components/ui/social-layout"
import { trimNpub } from "@/lib/utils/nostr"
import { cn } from "@/lib/utils"

export default function MessagesPage() {
  const { profile } = useApp()
  const { conversations, loading, error, refresh, sendMessage } = useMessages()
  const [selectedPeer, setSelectedPeer] = useState<string>("")
  const [newPeer, setNewPeer] = useState("")
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!selectedPeer && conversations[0]?.peerPubkey) {
      setSelectedPeer(conversations[0].peerPubkey)
    }
  }, [conversations, selectedPeer])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.peerPubkey === selectedPeer),
    [conversations, selectedPeer]
  )
  const targetPeer = selectedPeer || newPeer.trim()

  const handleSend = async () => {
    if (!targetPeer || !draft.trim()) return
    setSending(true)
    try {
      await sendMessage(targetPeer, draft)
      setDraft("")
      if (!selectedPeer) setSelectedPeer(targetPeer)
    } finally {
      setSending(false)
    }
  }

  return (
    <SocialLayout rightRail={<MessagesRail count={conversations.length} />}>
      <SocialHeader
        title="Messages"
        subtitle={`${conversations.length} conversations`}
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
          <span className="text-sm">Loading messages...</span>
        </div>
      )}

      {!loading && error && (
        <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
          <p className="text-sm font-medium text-destructive">Couldn&apos;t load messages</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid min-h-[calc(100vh-73px)] md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-border/80 bg-background md:border-b-0 md:border-r">
            <div className="space-y-2 p-3">
              <input
                value={newPeer}
                onChange={(event) => {
                  setNewPeer(event.target.value)
                  setSelectedPeer("")
                }}
                placeholder="Peer pubkey or npub"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
              {conversations.length === 0 && (
                <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                  No messages yet.
                </div>
              )}
              {conversations.map((conversation) => (
                <button
                  key={conversation.peerPubkey}
                  type="button"
                  onClick={() => {
                    setSelectedPeer(conversation.peerPubkey)
                    setNewPeer("")
                  }}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left transition-colors",
                    selectedPeer === conversation.peerPubkey
                      ? "bg-secondary text-foreground"
                      : "hover:bg-secondary/70"
                  )}
                >
                  <AuthorInfo
                    pubkey={conversation.peerPubkey}
                    timestamp={conversation.latest.created_at}
                  />
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {conversation.latest.plaintext || "Encrypted message"}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col bg-card">
            <div className="border-b border-border/80 bg-background px-4 py-3">
              {targetPeer ? (
                <AuthorInfo pubkey={targetPeer} showTimestamp={false} showNpub />
              ) : (
                <div className="text-sm text-muted-foreground">Select a conversation</div>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
              {activeConversation?.messages.map((message) => {
                const mine = message.pubkey === profile?.pubkey
                return (
                  <div
                    key={message.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[82%] rounded-lg border border-border/80 px-3 py-2 text-sm",
                        mine ? "bg-primary text-primary-foreground" : "bg-background"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.plaintext || "Encrypted message"}
                      </p>
                      <p className="mt-1 font-mono text-[10px] opacity-70">
                        {trimNpub(message.id, 5, 4)}
                      </p>
                    </div>
                  </div>
                )
              })}
              {targetPeer && !activeConversation && (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  New conversation.
                </div>
              )}
            </div>

            <div className="border-t border-border/80 bg-background p-3">
              <div className="grid gap-2">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message..."
                  className="min-h-[88px]"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSend}
                    disabled={!targetPeer || !draft.trim() || sending}
                  >
                    {sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </SocialLayout>
  )
}

function MessagesRail({ count }: { count: number }) {
  return (
    <div className="space-y-4">
      <RailCard title="Inbox">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            Conversations
          </span>
          <span className="font-mono text-[12px]">{count}</span>
        </div>
      </RailCard>
    </div>
  )
}
