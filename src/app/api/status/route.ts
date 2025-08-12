// app/api/status/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get("sid") || "";

  const headers = { "Cache-Control": "no-store" };

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
    if (data.submit_status === "ready") {
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