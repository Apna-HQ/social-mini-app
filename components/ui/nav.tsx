"use client"

import { useRouter, usePathname } from "next/navigation"
import { Home, User, Search } from "lucide-react"

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
      <div className="container max-w-screen-md">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push("/")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => router.push("/search")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              pathname === "/search" ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <Search className="w-6 h-6" />
            <span className="text-xs mt-1">Search</span>
          </button>
          <button
            onClick={() => router.push("/profile")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              pathname === "/profile" ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  )
}