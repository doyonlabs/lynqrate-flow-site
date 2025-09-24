// src/app/feedback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function NormalizeFeedbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState('사용자 확인 중…');

  useEffect(() => {
    const entryId = sp.get('emotion_entry_id') || '';
    const code    = sp.get('code') || '';
    const sid     = sp.get('sid') || '';

    if (!entryId && !code && !sid) {
      setMsg('잘못된 접근: emotion_entry_id | code | sid 중 하나가 필요합니다.');
      return;
    }

    (async () => {
      try {
        const qs = new URLSearchParams();
        if (entryId) qs.set('emotion_entry_id', entryId);
        if (code)    qs.set('code', code);
        if (sid)     qs.set('sid', sid);

        const r = await fetch(`/api/resolve-user?${qs.toString()}`, { cache: 'no-store' });
        const j = await r.json();

        if (r.ok && j?.ok && j.user_id) {
          router.replace(`/feedback/user/${j.user_id}`);
        } else {
          setMsg(`연결 실패: ${j?.error || 'USER_NOT_FOUND'}`);
        }
      } catch (e: any) {
        setMsg(`오류: ${e?.message || 'SERVER_ERROR'}`);
      }
    })();
  }, [router, sp]);

  return <div style={{ color:'#a7aec2', padding:24 }}>{msg}</div>;
}