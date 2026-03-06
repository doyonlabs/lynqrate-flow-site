// 클라이언트에서 테마 쿠키 저장
export function setThemeCookie(theme: 'dark' | 'light') {
  document.cookie = `mind-echo-theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

// 서버에서 테마 쿠키 읽기 (Next.js 서버 컴포넌트용)
export function getThemeFromCookieString(cookieHeader: string | null): 'dark' | 'light' {
  if (!cookieHeader) return 'dark'
  const match = cookieHeader.match(/mind-echo-theme=(dark|light)/)
  return (match?.[1] as 'dark' | 'light') ?? 'dark'
}
