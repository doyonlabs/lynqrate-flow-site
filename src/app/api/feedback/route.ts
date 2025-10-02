// app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  UserPassWithName,
  EmotionFeedback,
  FeedbackApiResponse,
} from "@/types/feedback";
import { verifySession } from '@/lib/session';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const COOKIE = 'lf_sess';

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
    const sp = req.nextUrl.searchParams;

    // ✅ 기간 토글(7/30/90) 기본 7일
    const rangeDays = Number(sp.get("range_days") ?? 7);

    // ✨ 세션 쿠키 검증
    const token = req.cookies.get(COOKIE)?.value;
    const sess = await verifySession(token);

    if (!sess) {
      return NextResponse.json(
        { ok: false, error: 'unauthorized' },
        { status: 401 }
      );
    }

    const userPassId = sess.passId;

    // 재방문 코드 가져오기 (REST)
    type RevisitKey = { code: string | null; expires_at: string | null; revoked_at: string | null };

    const rk = await getOne<RevisitKey>(
      `/rest/v1/revisit_keys` +
        `?select=code,expires_at,revoked_at` +
        `&user_pass_id=eq.${encodeURIComponent(userPassId)}` +
        `&limit=1`
    );

    const revisit_code =
      rk && !rk.revoked_at ? rk.code : null;
    const revisit_expires_at =
      rk && !rk.revoked_at ? rk.expires_at : null;

    // ✨ 1) entryId 결정 (쿼리에 있으면 내 것인지 검증, 없으면 최신 1건)
    let entryId = sp.get('emotion_entry_id');

    // (a) 쿼리에 주어진 entry_id가 "내 pass" 소유인지 검증
    if (entryId) {
      const own = await getOne<{ id: string }>(
        `/rest/v1/emotion_entries` +
          `?select=id` +
          `&user_pass_id=eq.${encodeURIComponent(userPassId)}` +
          `&id=eq.${encodeURIComponent(entryId)}` +
          `&limit=1`
      );
      if (!own) {
        // 남의 entry거나 존재하지 않으면 무시하고 최신으로 대체
        entryId = null;
      }
    }

    // (b) 없으면 내 pass의 최신 entry로 대체
    if (!entryId) {
      const latest = await getOne<{ id: string }>(
        `/rest/v1/emotion_entries` +
          `?select=id` +
          `&user_pass_id=eq.${encodeURIComponent(userPassId)}` +
          `&order=created_at.desc` +
          `&limit=1`
      );
      entryId = latest?.id ?? null;

      if (!entryId) {
        return NextResponse.json(
          { ok: false, error: 'USER_HAS_NO_ENTRIES' },
          { status: 404 }
        );
      }
    }

    // 1) 오늘(현재) emotion_entry 조회
    type EntryWithSE = {
      id: string;
      user_pass_id: string | null;
      user_id: string;
      created_at: string;
      situation_summary_text: string | null;
      journal_summary_text: string | null;
      situation_raw_text?: string | null;
      journal_raw_text?: string | null;
      standard_emotion: {
        name: string;
        color_code: string | null;
        description: string | null;
      } | null;
    };

    const entry = await getOne<EntryWithSE>(
      `/rest/v1/emotion_entries` +
        `?select=` +
        [
          `id`,
          `user_pass_id`,
          `user_id`,
          `created_at`,
          `situation_summary_text`,
          `journal_summary_text`,
          `situation_raw_text`,
          `journal_raw_text`,
          // ✅ id 추가 (색/키/집계용으로 고정키 필요)
          `standard_emotion:standard_emotions(id,name,color_code,description)`,
        ].join(",") +
        `&id=eq.${encodeURIComponent(entryId)}` +
        `&limit=1`
    );

    if (!entry) {
      return NextResponse.json(
        { ok: false, error: "ENTRY_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2) 차트용 원시행 (색상 포함)
    let entries_for_stats: {
      entry_datetime: string;
      standard_emotion_id?: string | null;
      standard_emotion: string;
      color_code?: string | null;
    }[] = [];
    if (entry.user_pass_id) {
      const rows = await getMany<any>(
        `/rest/v1/emotion_entries` +
          `?select=created_at,standard_emotion:standard_emotions(id,name,color_code)` +
          `&user_id=eq.${encodeURIComponent(entry.user_id)}` +
          `&order=created_at.desc&limit=200`
      );
      entries_for_stats = rows.map((r: any) => ({
        entry_datetime: r.created_at,
        standard_emotion_id: r.standard_emotion?.id ?? null,
        standard_emotion: r.standard_emotion?.name ?? "미정",
        color_code: r.standard_emotion?.color_code ?? null,
      }));
    }

    // 2-1) 표준감정 마스터(8개) 조회
    type StdEmotion = { id: string; name: string; color_code: string | null; soft_order?: number | null };
    const stdEmotions = await getMany<StdEmotion>(
      `/rest/v1/standard_emotions?select=id,name,color_code,soft_order&order=soft_order.nullsfirst,name.asc`
    );

    // 2-2) 0건 포함 분포 집계 생성 (rangeDays 적용)
    const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    const baseMap = new Map<string, { emotion_id: string; label: string; color: string | null; count: number }>(
      stdEmotions.map(e => [e.id, { emotion_id: e.id, label: e.name, color: e.color_code, count: 0 }])
    );
    for (const r of entries_for_stats) {
      if (!r.standard_emotion_id) continue;
      const t = Date.parse(r.entry_datetime);
      if (Number.isNaN(t) || t < cutoff) continue;
      const b = baseMap.get(r.standard_emotion_id);
      if (b) b.count += 1;
    }
    const emotion_distribution = Array.from(baseMap.values()).sort((a, b) => b.count - a.count);

    // 30일 내에서 최빈 감정(하나라도 count>0 있으면 그 라벨 사용)
    const top30 = emotion_distribution.find(e => e.count > 0);

    // fallback: 30일 내 데이터가 없으면 전체(entries_for_stats) 기준으로 최빈 감정 재계산
    let mostFrequentLabel = top30?.label ?? "—";
    if (!top30) {
      const fallbackMap = new Map<string, number>(); // key: standard_emotion_id, value: count
      for (const r of entries_for_stats) {
        if (!r.standard_emotion_id) continue;
        fallbackMap.set(
          r.standard_emotion_id,
          (fallbackMap.get(r.standard_emotion_id) ?? 0) + 1
        );
      }
      if (fallbackMap.size > 0) {
        const [maxId] = [...fallbackMap.entries()].sort((a, b) => b[1] - a[1])[0];
        const emo = stdEmotions.find(e => e.id === maxId);
        mostFrequentLabel = emo?.name ?? "—";
      }
    }

    // 3) 표준감정 메타
    const standardEmotionName = entry.standard_emotion?.name ?? "—";
    const standardEmotionColor = entry.standard_emotion?.color_code ?? null;
    const standardEmotionDesc = entry.standard_emotion?.description ?? null;

    // 4) user_passes + passes(name,total_uses)
    let pass: UserPassWithName | null = null;
    if (entry.user_pass_id) {
      pass = await getOne<UserPassWithName>(
        `/rest/v1/user_passes` +
          `?select=uuid_code,remaining_uses,expires_at,prev_pass_id,is_active,pass:passes(name,total_uses)` +
          `&id=eq.${encodeURIComponent(entry.user_pass_id)}` +
          `&limit=1`
      );
    }

    // 5) 직전 패스의 최종 carryover_digest (권종 완료본) + 메타
    let final_digest: string | null = null;
    let carryover_meta: { pass_name: string | null; generated_at: string | null } | null = null;

    if (entry.user_pass_id) {
      const up = await getOne<{ prev_pass_id: string | null }>(
        `/rest/v1/user_passes?select=prev_pass_id&id=eq.${encodeURIComponent(entry.user_pass_id)}&limit=1`
      );

      const prevId = up?.prev_pass_id;
      if (prevId) {
        const ar = await getOne<{ stats_json?: { carryover_digest?: string }; created_at: string }>(
          `/rest/v1/analysis_requests` +
            `?select=stats_json,created_at` +
            `&user_pass_id=eq.${encodeURIComponent(prevId)}` +
            `&scope=eq.pass&status=eq.done` +
            `&order=created_at.desc&limit=1`
        );

        final_digest = ar?.stats_json?.carryover_digest ?? null;

        const prevPass = await getOne<{ pass: { name: string | null } }>(
          `/rest/v1/user_passes?select=pass:passes(name)&id=eq.${encodeURIComponent(prevId)}&limit=1`
        );

        carryover_meta = {
          pass_name: prevPass?.pass?.name ?? null,
          generated_at: ar?.created_at ?? null,
        };
      }
    }

    // 6) 최근 피드백(현재 entry 기준)
    const rFeedbacks = await supa(
      `/rest/v1/emotion_feedbacks` +
        `?select=id,feedback_text,created_at` +
        `&emotion_entry_id=eq.${encodeURIComponent(entryId)}` +
        `&order=created_at.desc&limit=3`
    );
    const feedbacks: EmotionFeedback[] = rFeedbacks.ok
      ? await rFeedbacks.json()
      : [];

    // 7) 최근 기록(사용자가 쓴 것) — 오늘 + 과거 4건
    type RecentRow = {
      id: string;
      created_at: string;
      situation_summary_text: string | null;
      journal_summary_text: string | null;
      situation_raw_text?: string | null;
      journal_raw_text?: string | null;
      standard_emotion: { name?: string | null; color_code?: string | null } | null;
    };

    let recent_entries: Array<{
      entry_id: string;
      entry_datetime: string;
      standard_emotion: string;
      standard_emotion_color: string | null;
      situation_text: string;
      journal_text: string;
      feedback_text?: string | null;
    }> = [];

    // 오늘(현재) 기록 먼저
    const todaySituation =
      (entry.situation_summary_text ?? entry.situation_raw_text ?? "")?.trim();
    const todayJournal =
      (entry.journal_summary_text ?? entry.journal_raw_text ?? "")?.trim();
    recent_entries.push({
      entry_id: entry.id,
      entry_datetime: entry.created_at,
      standard_emotion: standardEmotionName,
      standard_emotion_color: standardEmotionColor,
      situation_text: todaySituation || "(상황 없음)",
      journal_text: todayJournal || "",
      feedback_text: feedbacks?.[0]?.feedback_text ?? null,
    });

    // 같은 pass에서 오늘 제외한 최근 5건
    if (entry.user_pass_id) {
      const rows = await getMany<RecentRow>(
        `/rest/v1/emotion_entries` +
          `?select=` +
          [
            `id`,
            `created_at`,
            `situation_summary_text`,
            `journal_summary_text`,
            `situation_raw_text`,
            `journal_raw_text`,
            `standard_emotion:standard_emotions(name,color_code)`,
          ].join(",") +
          `&user_id=eq.${encodeURIComponent(entry.user_id)}` +
          `&id=neq.${encodeURIComponent(entry.id)}` +
          `&order=created_at.desc` +
          `&limit=5`
      );

      let latestByEntry = new Map<string, string>();
      if (rows.length) {
        const ids = rows.map(r => r.id);
        const rf = await supa(
          `/rest/v1/emotion_feedbacks` +
            `?select=emotion_entry_id,feedback_text,created_at` +
            `&emotion_entry_id=in.(${ids.map(encodeURIComponent).join(",")})` +
            `&order=created_at.desc`
        );
        if (rf.ok) {
          const list: Array<{emotion_entry_id:string;feedback_text:string;created_at:string}> = await rf.json();
          for (const f of list) {
            if (!latestByEntry.has(f.emotion_entry_id)) {
              latestByEntry.set(f.emotion_entry_id, f.feedback_text);
            }
          }
        }
      }

      rows.forEach((r) => {
        const emo = r.standard_emotion?.name?.trim() || "—";
        const emoColor = r.standard_emotion?.color_code ?? null;
        const sit =
          (r.situation_summary_text ?? r.situation_raw_text ?? "")?.trim();
        const jour =
          (r.journal_summary_text ?? r.journal_raw_text ?? "")?.trim();

        recent_entries.push({
          entry_id: r.id,
          entry_datetime: r.created_at,
          standard_emotion: emo,
          standard_emotion_color: emoColor,
          situation_text: sit || "(상황 없음)",
          journal_text: jour || "",
          feedback_text: latestByEntry.get(r.id) ?? null,
        });
      });
    }

    // 8) 응답
    const data: FeedbackApiResponse["data"] = {
      uuid_code: pass?.uuid_code ?? "—",
      remaining_uses: pass?.remaining_uses ?? 0,
      total_uses: pass?.pass?.total_uses ?? 0,
      expires_at: pass?.expires_at ?? null,
      status_label: pass?.is_active === false ? "비활성" : "진행 중",
      prev_linked: !!pass?.prev_pass_id,
      pass_name: pass?.pass?.name ?? null,
      revisit_code,
      revisit_expires_at,
      entries: [
        {
          entry_datetime: entry.created_at,
          standard_emotion: standardEmotionName,
          standard_emotion_color: standardEmotionColor,
          standard_emotion_desc: standardEmotionDesc,
          situation_summary: todaySituation || "(상황 없음)",
          journal_summary: todayJournal || "",
          feedback_text: feedbacks?.[0]?.feedback_text ?? "(피드백 없음)",
        },
      ],

      carryover_digest: final_digest ?? "",
      carryover_meta,
      recent_entries,
      entries_for_stats,
      // ✅ 파이/막대가 동일하게 사용할 집계 결과
      emotion_distribution,
      insights: [{ k: "최빈 감정", v: mostFrequentLabel }],
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