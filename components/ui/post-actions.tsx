"use client"

import { Heart, MessageCircle, Repeat2, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

import { useApp } from "@/app/providers"
import { CardFooter } from "./card"

interface PostActionsProps {
  id: string
  likes?: number
  reposts?: number
  className?: string
}

export function PostActions({
  id,
  likes = 0,
  reposts = 0,
  className = "",
}: PostActionsProps) {
  const { likeNote, repostNote } = useApp()
  const router = useRouter()

  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation()
    action?.()
  }

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/note/${id}`)
  }

  return (
    <CardFooter className={`px-0 pb-0 pt-3 ${className}`}>
      <div className="flex w-full items-center justify-between gap-2 font-mono text-[12px] text-muted-foreground">
        <ActionButton
          label="Reply"
          icon={MessageCircle}
          onClick={handleReplyClick}
        />
        <ActionButton
          label={reposts > 0 ? String(reposts) : "Repost"}
          icon={Repeat2}
          hoverClass="hover:text-emerald-600"
          onClick={(event) => handleAction(event, () => repostNote(id))}
        />
        <ActionButton
          label={likes > 0 ? String(likes) : "Like"}
          icon={Heart}
          hoverClass="hover:text-rose-600"
          onClick={(event) => handleAction(event, () => likeNote(id))}
        />
        <ActionButton
          label="Zap"
          icon={Zap}
          hoverClass="hover:text-[#c97a2b]"
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    </CardFooter>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  hoverClass = "hover:text-foreground",
}: {
  icon: typeof Heart
  label: string
  onClick: (event: React.MouseEvent) => void
  hoverClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${hoverClass}`}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  )
}
