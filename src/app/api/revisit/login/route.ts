import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { issueSession } from '@/lib/session';

const COOKIE='lf_sess';

export async function POST(req: Request){
  const { code } = await req.json().catch(()=>({}));
  if(!code) return NextResponse.json({ok:false,error:'code required'},{status:400});

  const { data:key, error } = await supabaseAdmin
    .from('revisit_keys')
    .select('id,user_pass_id,expires_at,revoked_at')
    .eq('code', code)
    .single();

  if (error || !key) return NextResponse.json({ ok:false, error:'invalid code' }, { status:401 });
  if (key.revoked_at) return NextResponse.json({ ok:false, error:'revoked' }, { status:403 });
  if (new Date(key.expires_at) <= new Date()) return NextResponse.json({ ok:false, error:'expired' }, { status:410 });

  const token = await issueSession(key.user_pass_id, 60 * 60 * 12);

  await supabaseAdmin.from('revisit_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id);

  const res = NextResponse.json({ ok:true });
  res.cookies.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    //maxAge: 60 * 60 * 24 * 30, // 30일
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}