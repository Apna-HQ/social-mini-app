"use client"

import { AppProvider } from "./providers"
import { Nav } from "@/components/ui/nav"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          {children}
          <Nav />
          {/* Add padding to account for fixed nav */}
          <div className="pb-16" />
        </AppProvider>
      </body>
    </html>
  )
}
