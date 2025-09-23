'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmotionPieChart, WeeklyTrendChart } from '@/components/feedback/EmotionCharts';
import { groupByEmotion, last7DaysTrend } from '@/lib/feedback/metrics';

/* ================== 타입 ================== */
type FeedbackEntry = {
  entry_datetime: string;
  standard_emotion: string | null;
  standard_emotion_color?: string | null;
  standard_emotion_desc?: string | null;
  situation_summary: string | null;
  journal_summary: string | null;
  feedback_text: string | null;
};

type InsightKV = { k: string; v: string };

type CarryoverDigest = {
  digest_text: string;
  entry_no: number | null;
  updated_at: string;
};

type StatsEntryLite = {
  entry_datetime: string;
  standard_emotion: string; // charts util에서 string 필수
};

type ViewData = {
  uuid_code: string;
  remaining_uses: number;
  total_uses: number;
  expires_at: string | null;
  status_label: string;
  prev_linked: boolean;
  pass_name?: string | null;

  entries: FeedbackEntry[];

  // ✅ 서버가 내려주는 확장 필드
  carryover_digest: string;                 // 최종본(analysis_requests.stats_json.carryover_digest)
  carryover_digests?: CarryoverDigest[];    // 최근 N건(pass_rollup_digests)
  entries_for_stats?: StatsEntryLite[];     // 누적 통계용 엔트리(없으면 entries 사용)

  insights?: InsightKV[];
};

/* ================== 페이지 ================== */
export default function FeedbackPage() {
  const sp = useSearchParams();

  // 지원: ?emotion_entry_id=, ?code=, ?sid=
  const entryId = sp.get('emotion_entry_id') || '';
  const code    = sp.get('code') || '';
  const sid     = sp.get('sid') || '';

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ViewData | null>(null);

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    const pct = Math.round((data.remaining_uses / Math.max(1, data.total_uses)) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [data]);

  useEffect(() => {
    let alive = true;

    if (!entryId && !code && !sid) {
      setErr('잘못된 접근 (emotion_entry_id | code | sid 중 하나 필요)');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const qs = entryId
          ? `emotion_entry_id=${encodeURIComponent(entryId)}`
          : new URLSearchParams({ ...(code && { code }), ...(sid && { sid }) }).toString();

        const r = await fetch(`/api/feedback?${qs}`, { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || 'API Failed');
        if (alive) { setData(j.data as ViewData); setErr(null); }
      } catch (e: any) {
        if (alive) setErr(e?.message || '네트워크 오류');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [entryId, code, sid]);

  if (loading) return <div style={{ color:'#a7aec2', padding:24 }}>로딩 중…</div>;
  if (err || !data) return <div style={{ color:'#a7aec2', padding:24 }}>오류: {err || '데이터 없음'}</div>;

  /* ===== 차트 입력 매핑 =====
     entries_for_stats가 있으면 그걸 우선 사용, 없으면 entries로 대체 */
  const entriesLite: StatsEntryLite[] = (
    data.entries_for_stats && data.entries_for_stats.length > 0
      ? data.entries_for_stats
      : (data.entries ?? []).map(e => ({
          entry_datetime: e.entry_datetime,
          standard_emotion: e.standard_emotion ?? '미정',
        }))
  ).map(e => ({
    entry_datetime: e.entry_datetime,
    standard_emotion: e.standard_emotion || '미정',
  }));

  const pie = groupByEmotion(entriesLite);
  const { data: trend, emotions } = last7DaysTrend(entriesLite);

  const fmtKST = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const onSavePDF = () => window.print();

  return (
    <>
      {/* 헤더 */}
      <header className="header">
        <div className="wrap kpis">
          <div className="badges">
            <span className="badge">이용권 <strong>{data.uuid_code}</strong></span>
            {data.pass_name && <span className="badge">권종 <strong>{data.pass_name}</strong></span>}
            <span className="badge">잔여 <strong>{data.remaining_uses}/{data.total_uses}</strong></span>
            <span className="badge">만료 <strong>{data.expires_at ?? '—'}</strong></span>
            <span className="badge">상태 <strong>{data.status_label}</strong></span>
            {data.prev_linked && <span className="tag">이전 코드 연결됨</span>}
          </div>
          <div className="cta">
            <button className="btn" onClick={onSavePDF}>PDF 저장</button>
            <button className="btn primary" disabled>누적 리포트 생성</button>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="main">
        <div className="grid">
          {/* 좌측: 피드백 + 차트 */}
          <section className="panel">
            <div className="section">
              <h2>개별 피드백</h2>
              <div className="cards">
                {(data.entries ?? []).map((e, i) => (
                  <article className="card" key={`entry-${i}`} data-emotion={e.standard_emotion ?? ''}>
                    <div className="meta">
                      <span>{fmtKST(e.entry_datetime)}</span>
                      <span className="emotion-chip">표준감정: {e.standard_emotion ?? '—'}</span>
                    </div>
                    {e.situation_summary && <div className="title">“{e.situation_summary}”</div>}
                    <div className="ai">{e.feedback_text ?? '(피드백 없음)'}</div>
                  </article>
                ))}

                {/* ✅ carryover_digests 렌더링 */}
                {(data.carryover_digests ?? []).map((d, i) => (
                  <article className="card" key={`digest-${i}`}>
                    <div className="meta">
                      <span>회차: {d.entry_no ?? '—'}</span>
                      <span>{fmtKST(d.updated_at)}</span>
                    </div>
                    <div className="ai">{d.digest_text}</div>
                  </article>
                ))}
              </div>
            </div>

            <div className="section">
              <h2>누적 통계</h2>
              <div className="kicker">최근 7일·분포</div>
              <div className="divider" />
              <EmotionPieChart data={pie} />
              <div style={{ height: 12 }} />
              <WeeklyTrendChart data={trend} emotions={emotions} />
            </div>
          </section>

          {/* 우측: 인사이트 + 누적 리포트 */}
          <aside className="panel">
            <div className="section">
              <h2>요약 인사이트</h2>
              <div className="list">
                {(data.insights?.length ? data.insights : [{ k: '최빈 감정', v: '—' }]).map((it, idx) => (
                  <div className="item" key={idx}>
                    <b>{it.k}</b><span>{it.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h2>누적 리포트</h2>
              <p className="small">권종 종료 시 자동 생성 또는 버튼으로 요청.</p>

              {/* ✅ 최종본이 있으면 이것만 표시 */}
              {data.carryover_digest && data.carryover_digest.trim() ? (
                <div className="card" style={{ whiteSpace: 'pre-line', maxHeight: 280, overflow: 'auto' }}>
                  {data.carryover_digest}
                </div>
              ) : (
                /* ✅ 최종본이 없으면 최근 N건 미리보기 리스트 */
                <>
                  {data.carryover_digests?.length ? (
                    <div className="cards">
                      {data.carryover_digests.map((r, i) => (
                        <div key={i} className="card" style={{ whiteSpace: 'pre-line' }}>
                          <div className="meta">
                            <span>회차: {r.entry_no ?? '—'}</span>
                            <span>{fmtKST(r.updated_at)}</span>
                          </div>
                          {r.digest_text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card">아직 누적 리포트가 없습니다.</div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="footerBar">
        <div className="wrap">
          <div style={{ minWidth: '220px' }}>
            <div className="small">이번 권종 진행률</div>
            <div className="progress"><i style={{ width: progressPercent + '%' }} /></div>
          </div>
          <div className="kicker">
            {data.prev_linked ? '이전 코드 연결됨 · ' : ''}
            누적 {(data.entries_for_stats?.length ?? data.entries?.length ?? 0)}회
          </div>
          <div className="cta">
            <button className="btn" disabled>이전 코드 변경 요청</button>
            <button className="btn primary" disabled>다음 이용권 구매</button>
          </div>
        </div>
      </footer>

      <StyleTag />
    </>
  );
}

/* ================== 스타일 ================== */
function StyleTag() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
:root{
  --bg:#0b0c10; --panel:#111217; --muted:#1a1c22; --card:#151823;
  --text:#e7e9ee; --sub:#a7aec2; --acc:#7aa2ff; --good:#34d399; --warn:#f59e0b;
  --radius:16px; --gap:14px; --shadow:0 10px 30px rgba(0,0,0,.35);
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0; color:var(--text); background:
    radial-gradient(1200px 600px at 80% -20%, #1a2140 0%, transparent 60%),
    radial-gradient(900px 500px at -20% 20%, #152132 0%, transparent 60%),
    var(--bg);
  font:14px/1.6 system-ui, -apple-system, Segoe UI, Roboto, Apple SD Gothic Neo, "Noto Sans KR", sans-serif;
}
.header{
  position:sticky; top:0; z-index:10;
  backdrop-filter:saturate(1.2) blur(8px);
  background:linear-gradient(to bottom, rgba(9,10,14,.8), rgba(9,10,14,.3));
  border-bottom:1px solid rgba(255,255,255,.06);
}
.wrap{max-width:1200px; margin:0 auto; padding:14px 18px;}
.kpis{display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between;}
.badges{display:flex; gap:8px; flex-wrap:wrap}
.badge{
  background:linear-gradient(180deg, #1c2030, #121521);
  border:1px solid rgba(255,255,255,.1);
  padding:6px 10px; border-radius:999px; color:var(--sub)
}
.badge strong{color:var(--text)}
.cta{display:flex; gap:8px}
.btn{
  padding:9px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.12);
  background:linear-gradient(180deg, #1a1f2d, #111522); color:var(--text); cursor:pointer
}
.btn.primary{border-color:transparent; background:linear-gradient(180deg, #5b82ff, #3e5be6); box-shadow:0 8px 24px rgba(90,120,255,.35)}
.btn[disabled]{ opacity:.5; cursor:not-allowed; filter:grayscale(.2) }

.main{ min-height:100dvh; }
.grid{ display:grid; gap:var(--gap); grid-template-columns: 1fr; padding:18px; }
@media (min-width: 980px){ .grid{grid-template-columns: 1.6fr .9fr} }
.panel{ background:linear-gradient(180deg, #141827, #0f1320); border:1px solid rgba(255,255,255,.08); border-radius:var(--radius); box-shadow:var(--shadow); }
.section{padding:16px}
.section h2{margin:0 0 10px; font-size:16px; letter-spacing:.2px}
.divider{height:1px; background:rgba(255,255,255,.06); margin:12px 0}

.cards{display:grid; gap:var(--gap)}
.card{
  background:linear-gradient(180deg, #151a2a, #121623);
  border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:14px;
}
.card .meta{display:flex; gap:8px; color:var(--sub); font-size:12px}
.card .title{font-weight:600; margin:6px 0 4px}
.card .ai{margin-top:8px; padding:10px; border-radius:10px; background:#0f1422; border:1px solid rgba(255,255,255,.06)}

.chart{
  height:220px; border-radius:12px; border:1px dashed rgba(255,255,255,.12);
  background:repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 1px, transparent 1px 24px),
             linear-gradient(180deg, #111629, #0d1220);
  display:grid; place-items:center; color:var(--sub)
}
.list{display:grid; gap:10px}
.item{display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-radius:10px; background:#101423; border:1px solid rgba(255,255,255,.06)}
.item b{font-weight:600}
.kicker{color:var(--sub); font-size:12px}

.footerBar{
  position:sticky; bottom:0; z-index:10; margin-top:20px;
  background:linear-gradient(to top, rgba(10,12,16,.85), rgba(10,12,16,.4));
  border-top:1px solid rgba(255,255,255,.08);
}
.footerBar .wrap{display:flex; align-items:center; justify-content:space-between; gap:10px}
.progress{ height:8px; width:100%; background:#0e1220; border-radius:999px; overflow:hidden; border:1px solid rgba(255,255,255,.06) }
.progress > i{ display:block; height:100%; width:42%; background:linear-gradient(90deg, #6ee7b7, #3b82f6) }
.small{font-size:12px; color:var(--sub)}
.tag{display:inline-block; padding:3px 8px; border-radius:999px; background:#0e1424; border:1px solid rgba(255,255,255,.08); color:var(--sub)}
`}}/>
  );
}