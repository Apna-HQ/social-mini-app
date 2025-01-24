import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { BottomNav } from '@/components/ui/bottom-nav'
import { AppProvider } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Social Mini App',
  description: 'A modern social media experience',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProvider>
          <div className="pb-16">
            {children}
          </div>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  )
}
