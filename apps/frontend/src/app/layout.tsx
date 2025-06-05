import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/lib/providers/query-provider'
import { ToasterProvider } from '@/lib/providers/toaster-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IT Support Tools Platform',
  description: 'Comprehensive IT support management system for hospital environments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <ToasterProvider />
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
