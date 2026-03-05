'use client'

import { createBrowserSupabaseClient } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const supabase = createBrowserSupabaseClient()

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <main style={{ fontFamily: 'Pretendard, sans-serif' }} className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-white text-3xl font-semibold tracking-tight">
          Mind-Echo
        </h1>
        <p className="text-zinc-400 text-sm">
          나의 감정을 기록하고 피드백을 받아보세요
        </p>
        <button
          onClick={handleGoogleLogin}
          className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-full text-sm font-medium hover:bg-zinc-100 transition"
        >
          Google로 시작하기
        </button>
      </div>
    </main>
  )
}