'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // I,O,0,1 제외
const normalize = (s: string) =>
  s.toUpperCase().replace(new RegExp(`[^${ALPHABET}]`, 'g'), '');

export default function RevisitPage() {
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch('/api/revisit/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      // HTTP 에러 코드 기반 메시지 매핑
      if (!r.ok) {
        let msg = '잠시 후 다시 시도해주세요';
        if (r.status === 400) msg = '코드를 입력해주세요';
        else if (r.status === 401) msg = '코드가 올바르지 않아요';
        else if (r.status === 403) msg = '회수되었거나 권한이 없어요';
        else if (r.status === 410) msg = '만료된 코드예요(30일)';
        else {
          // 응답 바디에 error가 있으면 우선 사용
          try {
            const j = await r.json();
            if (j?.error) msg = j.error;
          } catch {}
        }
        setErr(msg);
        return;
      }

      const j = await r.json().catch(() => ({}));
      if (!j?.ok) {
        setErr(j?.error ?? '로그인 실패');
        return;
      }

      // 세션 쿠키 설정 완료 → 결과 페이지로 이동
      router.replace('/feedback');
    } catch (e: any) {
      setErr('네트워크 오류가 발생했어요');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold mb-2">내 기록 다시 보기</h1>
      <p className="text-sm text-gray-500 mb-6">
        발급받은 재방문 코드를 입력하면 결과 페이지로 이동합니다.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(normalize(e.target.value))}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');
            setCode(normalize(text));
          }}
          //placeholder="예: 7KMD3X9QWZP"
          inputMode="text"
          autoComplete="one-time-code"
          maxLength={16} // 12~16자 사용 시 넉넉히 제한
          className="w-full rounded-xl border px-4 py-3 font-mono tracking-wider outline-none focus:ring-2 focus:ring-black/10"
          aria-invalid={!!err}
          aria-describedby={err ? 'err' : undefined}
        />

        <button
        type="submit"
        disabled={loading || !code}
        className="w-full rounded-xl px-4 py-3 bg-black text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
        {loading ? (
            <>
            <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                />
                <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
            </svg>
            확인 중…
            </>
        ) : (
            '내 기록 열기'
        )}
        </button>

        <p className="mt-2 text-xs text-gray-400">
          유효기간: 발급일로부터 30일
        </p>
      </form>
    </main>
  );
}