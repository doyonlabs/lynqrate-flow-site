import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { ThemeProvider } from '@/context/ThemeContext'
import { Analytics } from '@vercel/analytics/react';
import './globals.css'

export const metadata: Metadata = {
  title: 'Mind Echo',
  description: '나의 감정을 기록하고 AI 피드백을 받아보세요',
  other: {
    'theme-color': '#0a0a0a',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('mind-echo-theme')
  const defaultTheme = themeCookie?.value === 'light' ? 'light' : 'dark'

  const bgColor = defaultTheme === 'dark' ? '#0a0a0a' : '#ffffff'

  return (
    <html lang="ko" data-theme={defaultTheme} className={defaultTheme === 'dark' ? 'dark' : ''} style={{ background: bgColor }}>
      <body style={{
        margin: 0,
        padding: 0,
        background: bgColor,
        minHeight: '100vh',
      }}>
        <ThemeProvider defaultTheme={defaultTheme}>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
