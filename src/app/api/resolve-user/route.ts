// src/app/api/resolve-user/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function supa(path: string, init?: RequestInit) {
  const url = `${SUPABASE_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

async function getOne<T = any>(path: string): Promise<T | null> {
  const r = await supa(path);
  if (!r.ok) return null;
  const raw = await r.text();
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr[0] ?? null) : arr ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const entryId = sp.get("emotion_entry_id");
    const code    = sp.get("code");
    const sid     = sp.get("sid"); // 필요 시 추가 매핑

    if (!entryId && !code && !sid) {
      return NextResponse.json({ ok: false, error: "MISSING_PARAMS" }, { status: 400 });
    }

    let user_id: string | null = null;

    // 1) emotion_entry_id가 있으면 바로 emotion_entries.user_id 사용 (가장 정확, 빠름)
    if (entryId) {
      const row = await getOne<{ user_id: string }>(
        `/rest/v1/emotion_entries?select=user_id&id=eq.${encodeURIComponent(entryId)}&limit=1`
      );
      user_id = row?.user_id ?? null;
    }

    // 2) code가 있으면 user_passes에서 user_id 조회
    if (!user_id && code) {
      const row = await getOne<{ user_id: string }>(
        `/rest/v1/user_passes?select=user_id&uuid_code=eq.${encodeURIComponent(code)}&limit=1`
      );
      user_id = row?.user_id ?? null;
    }

    // 3) sid 매핑이 필요하면 여기에 구현 (없으면 생략)
    if (!user_id && sid) {
      // TODO: sid → user_id 매핑 테이블 사용 시 여기 작성
      user_id = null;
    }

    if (!user_id) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    // 🔁 /feedback/page.tsx에서 기대하는 키는 user_id
    return NextResponse.json({ ok: true, user_id }, { status: 200 });
  } catch (e) {
    console.error("[resolve-user] error:", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}