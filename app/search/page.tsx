"use client"
import { Search } from "@/components/ui/search"
import { SocialHeader, SocialLayout } from "@/components/ui/social-layout"

export const dynamic = 'force-dynamic'

export default function SearchPage() {
  return (
    <SocialLayout>
      <SocialHeader title="Search" subtitle="profiles and notes" />
      <div className="px-4 py-4">
        <Search />
      </div>
    </SocialLayout>
  )
}
