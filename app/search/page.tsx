"use client"
import { Search } from "@/components/ui/search"

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-screen-md mx-auto py-4">
        <Search />
      </div>
    </main>
  )
}