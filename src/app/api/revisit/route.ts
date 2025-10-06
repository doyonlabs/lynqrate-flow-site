// src/app/api/revisit/route.ts
import { NextResponse } from 'next/server';
import { clientKey, limited, sleep } from '@/lib/rate-limit';
import { RLP } from '@/lib/rl-policy';

export const dynamic = 'force-dynamic'; // 캐시 방지 (안전)

export async function POST(req: Request) {
  const ck = clientKey(req);

  // 🛡️ 1분 5회 제한 (IP+UA 기준)
  if (limited(`revroot:${ck}`, RLP.short.win, RLP.short.client).limited) {
    await sleep(300);
    return NextResponse.json(
      { ok: false, error: 'rate_limited_root' },
      { status: 429, headers: { 'Retry-After': String(RLP.short.win / 1000) } }
    );
  }

  // 단순 안내 — login 엔드포인트 사용 유도
  return NextResponse.json({
    ok: false,
    message: 'Use /api/revisit/login for login requests.',
  });
}

// 헬스체크용 GET
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'revisit endpoint active',
  });
}