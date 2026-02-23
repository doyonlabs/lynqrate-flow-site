export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 빌드 시 정적 최적화 방지

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const db = getDb(); // 여기서만 환경변수 읽기

  const { searchParams } = new URL(req.url);
  const sid = searchParams.get("sid") || "";

  const headers = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

  if (!sid) {
    return NextResponse.json(
      { status: "fail", error: "missing_sid" },
      { status: 400, headers }
    );
  }

  try {
    const { data, error } = await db
      .from("submission_state")
      .select("submit_status,status_reason,emotion_entry_id,updated_at")
      .eq("sid", sid)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ status: "error" }, { status: 500, headers });
    }

    // 아직 기록 전이면 pending
    if (!data) {
      return NextResponse.json({ status: "pending" }, { headers });
    }

    // ready면 entry_id 포함, fail이면 reason 포함
    if (data.submit_status === "ready" || data.submit_status === "done") {
      return NextResponse.json(
        {
          status: "ready",
          emotion_entry_id: data.emotion_entry_id ?? null,
          updated_at: data.updated_at ?? null,
        },
        { headers }
      );
    }

    if (data.submit_status === "fail") {
      return NextResponse.json(
        {
          status: "fail",
          reason: data.status_reason ?? null,
          updated_at: data.updated_at ?? null,
        },
        { headers }
      );
    }

    // 그 외 값(예: pending 등)은 기본 pending으로 처리
    return NextResponse.json({ status: "pending" }, { headers });
  } catch (e) {
    console.error("[/api/status] error:", e);
    return NextResponse.json({ status: "error" }, { status: 500, headers });
  }
}