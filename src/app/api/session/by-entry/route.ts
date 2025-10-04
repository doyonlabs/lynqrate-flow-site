// app/api/session/by-entry/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { issueSession } from '@/lib/session';
import { randomInt } from 'crypto';

const ENABLE_REVISIT = process.env.ENABLE_REVISIT === 'true';
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

  // 1) entry → passId
  const { data: entry, error: e1 } = await supabaseAdmin
    .from('emotion_entries')
    .select('user_pass_id')
    .eq('id', entry_id)
    .single();
  if (e1 || !entry) return NextResponse.json({ ok:false, error:'entry not found' }, { status:404 });

  const passId = entry.user_pass_id as string;

  // 2) pass → userId
  const { data: passRow, error: e2 } = await supabaseAdmin
    .from('user_passes')
    .select('user_id')
    .eq('id', passId)
    .single();
  if (e2 || !passRow) return NextResponse.json({ ok:false, error:'pass not found' }, { status:404 });
  const userId = passRow.user_id as string;

  // 3) 사용자 전체에 “살아있는” 재방문 코드가 있는지 먼저 확인 (미회수 + 미만료)
  // ▶️ 재방문 코드: 플래그가 켜진 경우에만 수행 (기본 꺼짐)
  let revisitCode: string | undefined;
  if (ENABLE_REVISIT) {
    const now = new Date();
    const nowIso = now.toISOString();
    // 사용자 모든 pass id 수집
    const { data: passesAll } = await supabaseAdmin
      .from('user_passes')
      .select('id')
      .eq('user_id', userId);
    const passIds = (passesAll ?? []).map(p => p.id as string);

    if (passIds.length > 0) {
      const { data: activeKey } = await supabaseAdmin
        .from('revisit_keys')
        .select('code, expires_at, revoked_at, user_pass_id')
        .in('user_pass_id', passIds)
        .is('revoked_at', null)
        .gt('expires_at', nowIso)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activeKey?.code) revisitCode = activeKey.code;
    }
    if (!revisitCode) {
      const { data: existingForThisPass } = await supabaseAdmin
        .from('revisit_keys')
        .select('code, expires_at, revoked_at')
        .eq('user_pass_id', passId)
        .maybeSingle();
      const stillValid =
        !!(existingForThisPass &&
          !existingForThisPass.revoked_at &&
          existingForThisPass.expires_at &&
          new Date(existingForThisPass.expires_at) > new Date());
      if (stillValid) {
        revisitCode = existingForThisPass!.code!;
      } else {
        const expiresAt = new Date(Date.now()+1000*60*60*24*30).toISOString();
        for (let i = 0; i < 3; i++) {
          const code = genCode();
          const { error } = await supabaseAdmin
            .from('revisit_keys')
            .upsert({ user_pass_id: passId, code, expires_at: expiresAt }, { onConflict:'user_pass_id' });
          if (!error) { revisitCode = code; break; }
          // @ts-ignore
          if (error?.code !== '23505' || i === 2) throw error;
        }
      }
    }
  }

  // 5) 세션 쿠키 (12시간)
  const token = await issueSession(passId, 60 * 60 * 12);

  const res = NextResponse.json({ ok:true, revisit_code: ENABLE_REVISIT ? (revisitCode ?? null) : null });
  res.cookies.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // maxAge 생략 → 브라우저/세션 종료 시 소멸(브라우저별 동작 상이)
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}