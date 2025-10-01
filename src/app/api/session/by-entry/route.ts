import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { issueSession } from '@/lib/session';

const COOKIE = 'lf_sess';

function genCode(len=9){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out=''; for(let i=0;i<len;i++) out+=chars[Math.floor(Math.random()*chars.length)];
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

  // 세션 쿠키
  const token = await issueSession(passId);
  const res = NextResponse.json({ ok:true });
  res.cookies.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  // (선택) 캐시 방지
  res.headers.set('Cache-Control', 'no-store');

  // 재방문 코드: 없으면 생성/있으면 유지
  const { data: existing } = await supabaseAdmin
    .from('revisit_keys')
    .select('code, expires_at, revoked_at')
    .eq('user_pass_id', passId)
    .maybeSingle();

  const now = new Date();
  if (!(existing && !existing.revoked_at && new Date(existing.expires_at) > now)) {
    const code = genCode();
    const expiresAt = new Date(Date.now()+1000*60*60*24*30).toISOString();
    await supabaseAdmin.from('revisit_keys')
      .upsert({ user_pass_id: passId, code, expires_at: expiresAt }, { onConflict:'user_pass_id' });
  }

  return res;
}