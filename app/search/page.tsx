"use client"
import { Search } from "@/components/ui/search"

export const dynamic = 'force-dynamic'

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-background pb-24 md:pb-0">
      <div className="mx-auto max-w-screen-md px-4 py-4">
        <Search />
      </div>
    </main>
  )
}
