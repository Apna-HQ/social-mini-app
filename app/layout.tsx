"use client"

import { AppProvider } from "./providers"
import { Nav } from "@/components/ui/nav"
import "./globals.css"
import { ApnaProvider } from "@/components/providers/ApnaProvider"
import { Suspense } from "react"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body>
        <ApnaProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <AppProvider>
              {children}
              <Nav />
              {/* Add padding to account for fixed nav */}
              <div className="pb-16" />
            </AppProvider>
          </Suspense>
        </ApnaProvider>
      </body>
    </html>
  )
}
