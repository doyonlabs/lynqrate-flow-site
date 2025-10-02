// app/api/session/by-entry/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { issueSession } from '@/lib/session';
import { randomInt } from 'crypto';

const COOKIE = 'lf_sess';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // I,O,0,1 제외
function genCode(len = 12) {
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export async function POST(req: Request){
  const { entry_id } = await req.json().catch(()=>({}));
  if(!entry_id) return NextResponse.json({ ok:false, error:'entry_id required' }, { status:400 });

  // entry → pass
  const { data: entry, error: e1 } = await supabaseAdmin
    .from('emotion_entries')
    .select('user_pass_id')
    .eq('id', entry_id)
    .single();
  if (e1 || !entry) return NextResponse.json({ ok:false, error:'entry not found' }, { status:404 });

  const passId = entry.user_pass_id as string;

  // 세션 쿠키 (12시간 토큰)
  const token = await issueSession(passId, 60 * 60 * 12);

  // 재방문 코드: 없으면 생성/있으면 유지
  const { data: existing } = await supabaseAdmin
    .from('revisit_keys')
    .select('code, expires_at, revoked_at')
    .eq('user_pass_id', passId)
    .maybeSingle();

  const now = new Date();
  let revisitCode: string | undefined;

  const active = !!(existing && !existing.revoked_at && existing.expires_at && new Date(existing.expires_at) > now);

  if (active) {
    revisitCode = existing!.code; // 이미 발급된 코드 보여주기
  } else {
    const expiresAt = new Date(Date.now()+1000*60*60*24*30).toISOString();
    // 3회 정도 유니크 충돌(23505) 재시도
    for (let i = 0; i < 3; i++) {
      const code = genCode();
      const { error } = await supabaseAdmin
        .from('revisit_keys')
        .upsert({ user_pass_id: passId, code, expires_at: expiresAt }, { onConflict:'user_pass_id' });
      if (!error) { revisitCode = code; break; }
      // @ts-ignore supabase error code 접근 (환경별로 다를 수 있어 그냥 한 번 더 시도)
      if (error?.code !== '23505') throw error;
      if (i === 2) throw error;
    }
  }

  const res = NextResponse.json({ ok:true, revisit_code: revisitCode ?? null });
  res.cookies.set({
    name: COOKIE, 
    value: token, 
    httpOnly: true, 
    sameSite: 'lax', 
    secure: process.env.NODE_ENV === 'production', 
    path: '/',
    //maxAge: 60 * 60 * 24 * 30,
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}