import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const SECRET = process.env.WEBHOOK_SECRET!;

// 아주 간단한 메모리 레이트리밋(IP당 분당 30회)
const bucket = new Map<string, { t: number; c: number }>();
function limit(ip: string, max = 30, win = 60_000) {
    const now = Date.now(); 
    const rec = bucket.get(ip) ?? { 
        t: now, c: 0 
    };
    if (now - rec.t > win) { 
        rec.t = now; rec.c = 0; 
    }
    rec.c++; 
    bucket.set(ip, rec); 
    return rec.c <= max;
}

const FormSchema = z.object({
    data: z.object({
        responseId: z.string(),
        answers: z.array(z.any()).optional()
    })
});

function pickUuidCode(answers: any[] = []) {
    const byKey = answers.find(a => String(a.key||"").toLowerCase()==="uuid_code")?.value;
    if (byKey) {
        return String(byKey).trim();
    }
    const byLabel = answers.find(a =>
        String(a.label||a.question||"").toLowerCase().includes("이용권")
    )?.value;
    return byLabel ? String(byLabel).trim() : "";
}

export async function POST(req: NextRequest) {
    // 1) 토큰 체크
    const token = new URL(req.url).searchParams.get("secret") || "";
    if (token !== SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // 2) 레이트리밋
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
    if (!limit(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    // 3) 파싱/검증
    const started = Date.now();
    const ua = req.headers.get("user-agent") || "";
    const body = await req.json();
    const parsed = FormSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad_payload" }, { status: 400 });

    const sid = parsed.data.data.responseId;
    const uuid_code = pickUuidCode(parsed.data.data.answers);

    // 4) 유효성 검사
    const { data: up } = await db
        .from("user_passes")
        .select("id,user_id,is_active,remaining_uses,expires_at")
        .eq("uuid_code", uuid_code)
        .maybeSingle();

    let status: "pass"|"fail" = "fail"; let reason: string | null = null;
    if (!uuid_code) reason = "not_found";
    else if (!up) reason = "not_found";
    else if (up.is_active === false) reason = "inactive";
    else if ((up.remaining_uses ?? 0) <= 0) reason = "no_uses";
    else if (up.expires_at && new Date(up.expires_at) < new Date()) reason = "expired";
    else status = "pass";

    // 5) 로그 + 상태
    await db.from("submission_history").insert({
        uuid_code, result_status: status, result_reason: reason,
        ip, user_agent: ua, latency_ms: Date.now() - started, user_pass_id: up?.id ?? null
    });

    await db.from("submission_state").upsert({
        sid, uuid_code,
        submit_status: status === "pass" ? "ready" : "fail",
        status_reason: reason,
        user_pass_id: up?.id ?? null
    }, { onConflict: "sid" });

    return NextResponse.json({ status, reason, sid });
}

// 다른 메서드는 차단
export async function GET() { return NextResponse.json({ error: "method_not_allowed" }, { status: 405 }); }