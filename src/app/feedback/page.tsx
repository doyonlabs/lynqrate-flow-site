// src/app/feedback/page.tsx
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type SP = {
  emotion_entry_id?: string | string[];
  code?: string | string[];
  sid?: string | string[];
};

export default function FeedbackEntryRedirectPage({ searchParams }: { searchParams: SP }) {
  // 쿼리 추출 (+ 배열이면 첫 값 사용)
  const getOne = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

  const entryId = getOne(searchParams.emotion_entry_id);
  const code    = getOne(searchParams.code);
  const sid     = getOne(searchParams.sid);

  // 최소 하나라도 있으면 resolve API로 넘기고, 없으면 홈으로 보내기(원하는 곳으로 바꿔도 됨)
  if (entryId || code || sid) {
    const qs = new URLSearchParams();
    if (entryId) qs.set('emotion_entry_id', entryId);
    if (code)    qs.set('code', code);
    if (sid)     qs.set('sid', sid);
    redirect(`/api/resolve-user?${qs.toString()}`);
  }

  // 잘못된 접근일 때
  redirect('/');
}