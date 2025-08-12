export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버 전용 env
);

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const raw = url.searchParams.get("uuid") ?? "";
    const uuid = raw.trim();
    const redirect = (path: string) => NextResponse.redirect(new URL(path, url), 302);
    if (!uuid) {
        return redirect("/fail");
    }

    try {
        // 유효성: 코드 일치 + 남은 회차 + 미만료(1회권은 만료일없음) + 이용권 활성
        const now = new Date().toISOString();

        const { data, error } = await sb
            .from("user_passes")
            .select("id, remaining_uses, expires_at, passes!inner(is_active)")
            .eq("uuid_code", uuid)
            .eq("passes.is_active", true)
            // (A) remaining_uses = 1  OR  (B) (remaining_uses > 0 AND (expires_at is null OR expires_at > now))
            .or(
                `and(remaining_uses.eq.1),and(remaining_uses.gt.0,or(expires_at.is.null,expires_at.gt.${now}))`
            )
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            return redirect("/fail");
        }

        const feedbackUrl = new URL("/feedback", url);
        feedbackUrl.searchParams.set("uuid", uuid);
        return redirect(feedbackUrl.toString());
    } catch (e) {
        console.error("[route-after-submit] error:", e);
        return redirect("/fail");
    }
}