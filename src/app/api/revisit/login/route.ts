// app/api/revisit/login/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { issueSession } from '@/lib/session';

// ✅ 레이트리밋 유틸/정책
import { clientKey, limited, sleep } from '@/lib/rate-limit';
import { RLP } from '@/lib/rl-policy';

export const dynamic = 'force-dynamic'; // SSG 수집 방지(안전망)

const COOKIE = 'lf_sess';

export async function POST(req: Request) {
  // A) 짧은 창: 클라이언트(IP+UA) 기준 1분 5회 (운영 기본)
  const ck = clientKey(req);
  if (limited(`revlog:client:${ck}`, RLP.short.win, RLP.short.client).limited) {
    await sleep(300);
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(RLP.short.win / 1000) } }
    );
  }

  try {
    const { code } = await req.json().catch(() => ({}));
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ ok: false, error: 'CODE_REQUIRED' }, { status: 400 });
    }

    const trimmed = code.trim();

    // B) 코드 자체 보호: 같은 코드 1분 10회
    if (limited(`revlog:code:${trimmed}`, RLP.code.win, RLP.code.per).limited) {
      await sleep(300);
      return NextResponse.json(
        { ok: false, error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(RLP.code.win / 1000) } }
      );
    }

    // 1) 코드 조회 (유효성: 미회수 + 만료 전)
    const { data: key, error: e1 } = await supabaseAdmin
      .from('revisit_keys')
      .select('user_pass_id, expires_at, revoked_at')
      .eq('code', trimmed)
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

    // C) 사용자 단위 레이트리밋 — 1시간 10회, 24시간 20회
    if (limited(`revlog:user:h:${userId}`, RLP.medium.win, RLP.medium.user).limited) {
      await sleep(500);
      return NextResponse.json(
        { ok: false, error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(RLP.medium.win / 1000) } }
      );
    }
    if (limited(`revlog:user:d:${userId}`, RLP.daily.win, RLP.daily.user).limited) {
      // 일일 캡: 캡차/락으로 바꿀 수도 있음
      return NextResponse.json(
        { ok: false, error: 'daily_block' },
        { status: 429, headers: { 'Retry-After': String(RLP.daily.win / 1000) } }
      );
    }

    // 3) 해당 사용자의 최신 이용권
    const { data: latestPass } = await supabaseAdmin
      .from('user_passes')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetPassId = latestPass?.id ?? passRow.id;

    // 4) 세션 발급(12시간)
    const token = await issueSession(targetPassId, 60 * 60 * 12);

    await supabaseAdmin
      .from('revisit_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('code', trimmed);

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