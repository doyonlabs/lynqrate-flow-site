'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RevisitPage() {
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch('/api/revisit/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code: code.trim().toUpperCase() })
    });
    const j = await r.json();
    if (j?.ok) router.replace('/feedback'); else setErr(j?.error ?? '로그인 실패');
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto p-6 space-y-3">
      <h1 className="text-xl font-semibold">다시보기</h1>
      <input className="w-full border rounded-xl px-3 py-2 font-mono"
             placeholder="재방문 코드"
             value={code}
             onChange={e=>setCode(e.target.value)} />
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <button className="w-full border rounded-xl px-3 py-2">열기</button>
    </form>
  );
}