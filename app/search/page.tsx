"use client"
import { Search } from "@/components/ui/search"

export const dynamic = 'force-dynamic'

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-screen-md mx-2 py-4">
        <Search />
      </div>
    </main>
  )
}