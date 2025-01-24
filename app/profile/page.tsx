"use client"
import { useApp } from "../providers"
import Image from "next/image"

export default function ProfilePage() {
  const { profile, loading } = useApp()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading profile data...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-destructive">Failed to load profile data</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-screen-md mx-auto">
        {profile.metadata.banner && (
          <div className="w-full h-48 relative">
            <Image
              src={profile.metadata.banner}
              alt="Profile banner"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-center space-x-4">
            {profile.metadata.picture && (
              <div className="relative w-24 h-24">
                <Image
                  src={profile.metadata.picture}
                  alt={profile.metadata.name || 'Profile picture'}
                  width={96}
                  height={96}
                  className="rounded-full border-4 border-background shadow-lg"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">
                {profile.metadata.name || 'Anonymous'}
              </h1>
              {profile.metadata.nip05 && (
                <p className="text-sm text-muted-foreground truncate">{profile.metadata.nip05}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6 pb-6 border-b">
            <div className="text-center">
              <p className="text-2xl font-bold">{profile.stats.posts}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
          </div>

          {profile.metadata.about && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-muted-foreground whitespace-pre-wrap break-words">{profile.metadata.about}</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <h2 className="text-lg font-semibold mb-2">Public Key</h2>
            <p className="text-sm text-muted-foreground break-all font-mono bg-accent/50 p-3 rounded-lg">
              {profile.pubkey}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}