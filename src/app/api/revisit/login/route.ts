// app/api/revisit/login/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { issueSession } from '@/lib/session';

const COOKIE = 'lf_sess';

export async function POST(req: Request) {
  try {
    const { code } = await req.json().catch(() => ({}));
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ ok: false, error: 'CODE_REQUIRED' }, { status: 400 });
    }

    // 1) 코드 조회 (유효성: 미회수 + 만료 전)
    const { data: key, error: e1 } = await supabaseAdmin
      .from('revisit_keys')
      .select('user_pass_id, expires_at, revoked_at')
      .eq('code', code.trim())
      .maybeSingle();

    if (e1 || !key) {
      return NextResponse.json({ ok: false, error: 'INVALID_CODE' }, { status: 401 });
    }

    const now = new Date();
    if (key.revoked_at || !key.expires_at || new Date(key.expires_at) <= now) {
      return NextResponse.json({ ok: false, error: 'EXPIRED_OR_REVOKED' }, { status: 410 });
    }

    // 2) 코드가 묶여 있던 pass → user_id 획득
    const { data: passRow, error: e2 } = await supabaseAdmin
      .from('user_passes')
      .select('id, user_id')
      .eq('id', key.user_pass_id)
      .single();

    if (e2 || !passRow) {
      return NextResponse.json({ ok: false, error: 'PASS_NOT_FOUND' }, { status: 404 });
    }

    const userId = passRow.user_id;

    // 3) 해당 사용자(user_id)의 "가장 최신 이용권" 찾기
    //    (활성/만료 조건을 복잡하게 두지 않고 최신 created_at 기준으로 통일)
    const { data: latestPass, error: e3 } = await supabaseAdmin
      .from('user_passes')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 최신 이용권이 없으면(이론상 거의 없음) 기존 pass로라도 발급
    const targetPassId = latestPass?.id ?? passRow.id;

    // 4) 세션 발급(12시간)
    const token = await issueSession(targetPassId, 60 * 60 * 12);

    await supabaseAdmin.from('revisit_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('code', code.trim());

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    console.error('[revisit/login] error', e);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}