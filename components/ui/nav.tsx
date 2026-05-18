"use client"

import { useRouter, usePathname } from "next/navigation"
import { User, Search, Rss } from "lucide-react"

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/90 backdrop-blur md:hidden">
      <div className="mx-auto max-w-screen-md px-3">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push("/")}
            className={`flex min-w-[64px] flex-col items-center rounded-lg p-2 transition-colors ${
              pathname === "/" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Rss className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => router.push("/search")}
            className={`flex min-w-[64px] flex-col items-center rounded-lg p-2 transition-colors ${
              pathname === "/search" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Search</span>
          </button>
          <button
            onClick={() => router.push("/profile")}
            className={`flex min-w-[64px] flex-col items-center rounded-lg p-2 transition-colors ${
              pathname === "/profile" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
