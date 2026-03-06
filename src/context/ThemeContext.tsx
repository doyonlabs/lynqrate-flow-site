'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { setThemeCookie } from '@/lib/themeCookie'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  isDark: boolean
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  isDark: true,
})

export function ThemeProvider({
  children,
  defaultTheme,
}: {
  children: ReactNode
  defaultTheme: Theme
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const isDark = theme === 'dark'

  const toggleTheme = () => {
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeCookie(next)
    // 배경 즉시 반영
    document.documentElement.style.background = next === 'dark' ? '#0a0a0a' : '#ffffff'
    document.body.style.background = next === 'dark' ? '#0a0a0a' : '#ffffff'
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
