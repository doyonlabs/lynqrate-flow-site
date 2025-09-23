// app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  EmotionEntryLite,
  UserPassWithName,
  PassRollupDigest,
  EmotionFeedback,
  FeedbackApiResponse,
} from "@/types/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function supa(path: string, init?: RequestInit) {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("Supabase env missing");
  }
  const url = `${SUPABASE_URL}${path}`;
  return fetch(url, {
    ...init,
    // @ts-ignore
    next: { revalidate: 0 },
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      Prefer: "return=representation",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

async function getOne<T = any>(path: string): Promise<T | null> {
  const r = await supa(path);
  const raw = await r.text();

  if (!r.ok) {
    console.error("[Supabase error]", r.status, raw);
    return null;
  }

  const arr = JSON.parse(raw);
  return Array.isArray(arr) ? (arr[0] ?? null) : arr ?? null;
}

async function getMany<T = any>(path: string): Promise<T[]> {
  const r = await supa(path);
  const raw = await r.text();

  if (!r.ok) {
    console.error("[Supabase error]", r.status, raw);
    return [];
  }

  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("JSON parse error", e, raw);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const entryId = req.nextUrl.searchParams.get("emotion_entry_id");
    if (!entryId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_ENTRY_ID" },
        { status: 400 }
      );
    }

    // 1) emotion_entries
    // emotion_entries
    type EntryWithSE = {
      id: string;
      user_pass_id: string | null;
      created_at: string;
      situation_summary_text: string | null;
      journal_summary_text: string | null;
      standard_emotion: {
        name: string;
        color_code: string | null;
        description: string | null;
      } | null;
    };

    const entry = await getOne<EntryWithSE>(
      `/rest/v1/emotion_entries` +
      `?select=` +
        `id,user_pass_id,created_at,` +
        `situation_summary_text,journal_summary_text,` +
        `standard_emotion:standard_emotions(name,color_code,description)` +
      `&id=eq.${encodeURIComponent(entryId)}` +
      `&limit=1`
    );

    if (!entry) {
      return NextResponse.json({ ok: false, error: "ENTRY_NOT_FOUND" }, { status: 404 });
    }

    //차트용 누적 N건에도 색상 넣기
    let entries_for_stats: { entry_datetime: string; standard_emotion: string; color_code?: string | null }[] = [];
    if (entry?.user_pass_id) {
      const rows = await getMany<any>(
        `/rest/v1/emotion_entries` +
        `?select=created_at,standard_emotion:standard_emotions(name,color_code)` +
        `&user_pass_id=eq.${encodeURIComponent(entry.user_pass_id)}` +
        `&order=created_at.desc&limit=200`
      );
      entries_for_stats = rows.map((r: any) => ({
        entry_datetime: r.created_at,
        standard_emotion: r.standard_emotion?.name ?? "미정",
        color_code: r.standard_emotion?.color_code ?? null,
      }));
    }

    // 2) 표준감정명
    // 표준감정: 조인된 필드에서 바로 꺼냄 (EntryWithSE 사용 시)
    const standardEmotionName  = entry?.standard_emotion?.name ?? "—";
    const standardEmotionColor = entry?.standard_emotion?.color_code ?? null;
    const standardEmotionDesc  = entry?.standard_emotion?.description ?? null;

    // 3) user_passes + passes(name)
    let pass: UserPassWithName | null = null;
    if (entry.user_pass_id) {
      pass = await getOne<UserPassWithName>(
        `/rest/v1/user_passes?select=uuid_code,remaining_uses,expires_at,prev_pass_id,is_active,pass:passes(name)&id=eq.${encodeURIComponent(entry.user_pass_id)}&limit=1`
      );
    }

    // 4) pass_rollup_digests
    // A) 최근 N개 롤업 (진행 중 회차 요약들)
    let carryover_digests: Array<{ digest_text: string; entry_no: number | null; updated_at: string }> = [];
    if (entry.user_pass_id) {
      carryover_digests = await getMany(
        `/rest/v1/pass_rollup_digests` +
        `?select=digest_text,entry_no,updated_at` +
        `&user_pass_id=eq.${encodeURIComponent(entry.user_pass_id)}` +
        `&order=entry_no.desc.nullslast,updated_at.desc` +
        `&limit=5`
      );
    }

    // B) 최종 carryover_digest (권종 단위 분석 완료본)
    let final_digest: string | null = null;
    if (entry.user_pass_id) {
      const ar = await getOne<{ stats_json?: { carryover_digest?: string } }>(
        `/rest/v1/analysis_requests` +
        `?select=stats_json` +
        `&user_pass_id=eq.${encodeURIComponent(entry.user_pass_id)}` +
        `&scope=eq.pass&status=eq.done` +
        `&order=created_at.desc&limit=1`
      );
      final_digest = ar?.stats_json?.carryover_digest ?? null;
    }

    // 5) 최근 피드백
    const rFeedbacks = await supa(
      `/rest/v1/emotion_feedbacks?select=id,feedback_text,created_at&emotion_entry_id=eq.${encodeURIComponent(entryId ?? "")}&order=created_at.desc&limit=3`
    );
    const feedbacks: EmotionFeedback[] = rFeedbacks.ok ? await rFeedbacks.json() : [];

    // 6) 응답
    const data: FeedbackApiResponse["data"] = {
      uuid_code: pass?.uuid_code ?? "—",
      remaining_uses: pass?.remaining_uses ?? 0,
      expires_at: pass?.expires_at ?? null,
      status_label: pass?.is_active === false ? "비활성" : "진행 중",
      prev_linked: !!pass?.prev_pass_id,
      pass_name: pass?.pass?.name ?? null,

      entries: [{
        entry_datetime: entry.created_at,
        standard_emotion: entry.standard_emotion?.name ?? "—",
        standard_emotion_color: entry.standard_emotion?.color_code ?? null,
        standard_emotion_desc: entry.standard_emotion?.description ?? null,
        situation_summary: entry.situation_summary_text ?? "(상황 없음)",
        journal_summary: entry.journal_summary_text ?? null,
        feedback_text: feedbacks?.[0]?.feedback_text ?? "(피드백 없음)",
      }],

      carryover_digest: final_digest ?? "",
      carryover_digests,          // 배열이면 필드 존재, 없으면 생략 가능
      entries_for_stats,          // 배열이면 필드 존재, 없으면 생략 가능

      insights: [{ k: "최빈 감정", v: entry.standard_emotion?.name ?? "—" }],
    };

    return NextResponse.json<FeedbackApiResponse>(
      { ok: true, data },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[/api/feedback] error:", e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", detail: String(e) },
      { status: 500 }
    );
  }
}