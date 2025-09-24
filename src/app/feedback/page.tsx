// src/app/feedback/page.tsx
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

type SP =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

export default async function FeedbackEntryResolver({
  searchParams,
}: {
  searchParams: SP;
}) {
  // ✅ Next 15: searchParams는 await 해야 함
  const sp = (await searchParams) ?? {};
  const emotion_entry_id = Array.isArray(sp.emotion_entry_id)
    ? sp.emotion_entry_id[0]
    : sp.emotion_entry_id;
  const code = Array.isArray(sp.code) ? sp.code[0] : sp.code;
  const sid = Array.isArray(sp.sid) ? sp.sid[0] : sp.sid;

  if (!emotion_entry_id && !code && !sid) {
    redirect('/fail');
  }

  // ✅ 서버에서 절대 URL 구성
  const h = await headers();            // ✅ ReadonlyHeaders
  const host  = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  const qs = new URLSearchParams();
  if (emotion_entry_id) qs.set('emotion_entry_id', emotion_entry_id);
  if (code) qs.set('code', code);
  if (sid) qs.set('sid', sid);

  const r = await fetch(`${origin}/api/resolve-user?${qs.toString()}`, {
    cache: 'no-store',
  });
  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok || !j?.user_id) {
    redirect('/fail');
  }

  redirect(`/feedback/user/${j.user_id}`);
}