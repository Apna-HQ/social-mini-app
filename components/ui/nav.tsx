"use client"

import { useRouter, usePathname } from "next/navigation"
import { Bell, Home, Mail, Search, User } from "lucide-react"

const items = [
  { label: "Home", href: "/", icon: Home },
  { label: "Search", href: "/search", icon: Search },
  { label: "Alerts", href: "/notifications", icon: Bell },
  { label: "DMs", href: "/messages", icon: Mail },
  { label: "Profile", href: "/profile", icon: User },
]

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/90 backdrop-blur md:hidden">
      <div className="mx-auto max-w-screen-md px-3">
        <div className="grid grid-cols-5 gap-1 py-2">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex min-w-0 flex-col items-center rounded-lg p-2 transition-colors ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="mt-1 max-w-full truncate text-[11px]">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
