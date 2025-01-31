"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, Search } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
      <div className="container flex h-16 max-w-screen-md items-center justify-around">
        <Link 
          href="/"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/" 
              ? "text-primary" 
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </Link>
        <Link 
          href="/search"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/search" 
              ? "text-primary" 
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-xs">Search</span>
        </Link>
        <Link 
          href="/profile"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/profile" 
              ? "text-primary" 
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </nav>
  )
}