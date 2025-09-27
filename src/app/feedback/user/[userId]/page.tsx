'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { EmotionPieChart, WeeklyTrendChart, SingleDayEmotionBars } from '@/components/feedback/EmotionCharts';
import { groupByEmotion, aggregateTrend } from '@/lib/feedback/metrics';

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
  color_code?: string | null;
};

type RecentEntry = {
  entry_datetime: string;
  standard_emotion: string;
  standard_emotion_color: string | null;
  situation_text: string;
  journal_text: string;
  feedback_text?: string | null;
};

type CarryoverMeta = {
  pass_name: string | null;
  generated_at: string | null;
};

type EmotionDistributionItem = {
    emotion_id: string;
    label: string;
    color: string | null;
    count: number;};

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
  carryover_meta?: CarryoverMeta | null;
  entries_for_stats?: StatsEntryLite[];     // 누적 통계용 엔트리(없으면 entries 사용)

  recent_entries?: RecentEntry[];

  insights?: InsightKV[];
  emotion_distribution?: EmotionDistributionItem[];
};

/* ================== 페이지 ================== */
export default function FeedbackPage() {
  // ✅ 1) userId를 path param에서 받기
  const { userId } = useParams<{ userId: string }>();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ViewData | null>(null);

  const PERIOD_LS_KEY = 'fb_period_days';
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90>(() => {
    if (typeof window === 'undefined') return 7;                // SSR 안전
    const s = window.localStorage.getItem(PERIOD_LS_KEY);
    return s === '30' ? 30 : s === '90' ? 90 : 7;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PERIOD_LS_KEY, String(periodDays));
    }
  }, [periodDays]);

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    const pct = Math.round((data.remaining_uses / Math.max(1, data.total_uses)) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [data]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        // ✅ 2) user_id로 API 호출
        const r = await fetch(`/api/feedback?user_id=${encodeURIComponent(String(userId))}&range_days=${periodDays}`, { cache: 'no-store' });
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
  }, [userId, periodDays]);

  /* ===== 차트 입력 매핑 ===== */

  // 0) 공용 유틸은 먼저 선언(호이스팅되는 함수형으로 해도 OK)
  function normHex(c?: string | null) {
    if (!c) return null;
    const t = c.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;
    return null;
  }

  // 1) entriesLite (문자열 트림 포함)
  const entriesLite: StatsEntryLite[] = (
    data?.entries_for_stats && data.entries_for_stats.length > 0
      ? data.entries_for_stats
      : (data?.entries ?? []).map((e: any) => ({
          entry_datetime: e.entry_datetime,
          standard_emotion: (e.standard_emotion ?? '미정').trim(),
          color_code: (e as any).standard_emotion_color ?? null,
        }))
  ).map(e => ({
    entry_datetime: e.entry_datetime,
    standard_emotion: (e.standard_emotion || '미정').trim(),
    color_code: e.color_code ?? null,
  }));

  // 2) 7/30/90일 자동 집계
  const trendPack = useMemo(
    () => aggregateTrend(entriesLite, periodDays, 'auto'),
    [entriesLite, periodDays]
  );

  // 3) API가 내려준 8개 표준 분포(dist)
  const dist = data?.emotion_distribution as
    | Array<{ emotion_id:string; label:string; color:string|null; count:number }>
    | undefined;

  // 4) 8개 라벨 고정(최우선 dist 순서, 없으면 trendPack.emotions)
  const allEmotions: string[] = dist?.map(d => d.label) ?? (trendPack.emotions || []);

  // 5) 파이 데이터 = dist 그대로(없으면 기존 fallback)
  const pieData = dist
    ? dist.map(d => ({
        name: d.label,
        value: d.count,
        fill: normHex(d.color) ?? '#999999',
      }))
    : (() => {
        const p = groupByEmotion(entriesLite);
        return p.data.map(d => ({
          name: d.name,
          value: d.value,
          fill: normHex(p.colorsByEmotion?.[d.name]) ?? '#999999',
        }));
      })();

  // 6) 활성 일자 수/혼잡 여부 계산(라벨은 allEmotions 기준)
  const activeRows = useMemo(
    () =>
      trendPack.data.filter(row =>
        (allEmotions || []).some(em => (row?.[em] ?? 0) > 0)
      ),
    [trendPack.data, allEmotions]
  );

  const CROWD_DAYS = 2;
  const isCrowdedOnUnitY =
    activeRows.length <= CROWD_DAYS ||
    activeRows.some(r => (allEmotions || []).every(em => (r?.[em] ?? 0) <= 1));

  const isSparse = trendPack.activeDays <= 1;

  // 7) 기간 합계 row (파이와 동일 집계) – 혼잡 시 사용
  const totalsRowFromDist = useMemo(() => {
    if (!dist) return null;
    const map = new Map(dist.map(d => [d.label, d.count]));
    const row: any = {};
    (allEmotions || []).forEach(label => { row[label] = map.get(label) ?? 0; });
    row.date = '기간합계';
    return row;
  }, [dist, allEmotions]);

  // 8) 가장 최근 active day (fallback)
  const lastActiveRow =
    [...trendPack.data].reverse().find(r =>
      (allEmotions || []).some(em => (r?.[em] ?? 0) > 0)
    ) ?? trendPack.data.at(-1);

  // 9) 실제로 막대에 보낼 단일 row 선택:
  //    혼잡이면 기간합계, 아니면 최근 active day
  const baseRowForBars: any =
    (isCrowdedOnUnitY && totalsRowFromDist) ? totalsRowFromDist : lastActiveRow;

  // 10) 8개 감정 키를 모두 채워 넣은 singleRow 생성(항상 8개 보장)
  const singleRow: any = Object.fromEntries(
    (allEmotions || []).map(em => [em, baseRowForBars?.[em] ?? 0])
  );
  if (baseRowForBars?.date) singleRow.date = baseRowForBars.date;

  if (loading) return <div style={{ color:'#a7aec2', padding:24 }}>로딩 중…</div>;
  if (err || !data) return <div style={{ color:'#a7aec2', padding:24 }}>오류: {err || '데이터 없음'}</div>;

  // 디버그(원하면 잠깐 켜서 확인)
  console.log('[entriesLite]', entriesLite.slice(0,5));
  console.log('[pieData]', pieData.slice(0,5));
  console.log('[trendPack]', { data: trendPack.data.slice(0,3), emotions: trendPack.emotions, colors: trendPack.colorsByEmotion });

  const fmtKST = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const onSavePDF = () => window.print();

  const recentList = (data.recent_entries ?? []).slice(1);

  return (
    <>
      {/* 헤더 */}
      <header className="header">
        <div className="wrap kpis">
          <div className="badges">
            <span className="badge">이용권 <strong>{data.uuid_code}</strong></span>
            {data.pass_name && <span className="badge">권종 <strong>{data.pass_name}</strong></span>}
            <span className="badge">잔여/전체 <strong>{data.remaining_uses}/{data.total_uses}</strong></span>
            <span className="badge">만료 <strong>{data.expires_at ? fmtKST(data.expires_at) : '—'}</strong></span>
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
            {/* ✅ 오늘 기록 (라벨링 & 피드백 펼침) */}
            <div className="section">
              <h2>오늘 기록</h2>
              {data.entries[0] && (
                <article className="card" data-emotion={data.entries[0].standard_emotion ?? ''}>
                  <div className="meta">
                    <span>{fmtKST(data.entries[0].entry_datetime)}</span>
                    <span className="emotion-chip">표준감정: {data.entries[0].standard_emotion ?? '—'}</span>
                  </div>

                  <div className="title" style={{ marginTop: 8 }}>
                    <b style={{ color:'#a7aec2' }}>상황</b>
                    <div>“{data.entries[0].situation_summary || '상황 없음'}”</div>
                  </div>

                  {data.entries[0].journal_summary && (
                    <div className="ai" style={{ marginTop: 8 }}>
                      <b style={{ color:'#a7aec2' }}>감정일기</b>
                      <div style={{ marginTop: 4 }}>{data.entries[0].journal_summary}</div>
                    </div>
                  )}

                  {/* 👇 토글 없이 항상 노출 */}
                  <div className="ai" style={{ marginTop: 8 }}>
                    <b style={{ color:'#a7aec2' }}>피드백</b>
                    <div style={{ marginTop: 4 }}>
                      {data.entries[0].feedback_text?.trim() || '(피드백 없음)'}
                    </div>
                  </div>
                </article>
              )}
            </div>

            {/* ✅ 최근 기록 (오늘 제외, 최근 4건) */}
            <div className="section">
              <h2>최근 기록</h2>
              <div className="cards">
                {recentList.map((r, i) => (
                  <article className="card" key={`recent-${i}`} data-emotion={r.standard_emotion ?? ''}>
                    <div className="meta">
                      <span>{fmtKST(r.entry_datetime)}</span>
                      <span className="emotion-chip">표준감정: {r.standard_emotion || '—'}</span>
                    </div>

                    <div className="title">
                      <b style={{ color:'#a7aec2' }}>상황</b> {r.situation_text ? `“${r.situation_text}”` : '상황 없음'}
                    </div>

                    {r.journal_text && (
                      <div className="ai"
                          style={{ display:'-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient:'vertical', overflow:'hidden', marginTop: 6 }}>
                        <b style={{ color:'#a7aec2' }}>감정일기</b>
                        <div style={{ marginTop: 4 }}>{r.journal_text}</div>
                      </div>
                    )}

                    {r.feedback_text && r.feedback_text.trim() && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor:'pointer', color:'#7aa2ff' }}>피드백 보기</summary>
                        <div className="ai" style={{ marginTop: 6 }}>{r.feedback_text}</div>
                      </details>
                    )}
                  </article>
                ))}

                {(!recentList || recentList.length === 0) && (
                  <div className="card">최근 기록이 없습니다.</div>
                )}
              </div>
            </div>

            <div className="section">
              <h2>누적 통계</h2>
              <div className="kicker" style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span>최근 {periodDays}일·분포</span>
                <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                  {[7,30,90].map(p => (
                    <button
                      key={p}
                      className="btn"
                      onClick={() => setPeriodDays(p as 7|30|90)}
                      style={{ opacity: periodDays===p ? 1 : .55, borderColor: periodDays===p ? 'rgba(255,255,255,.24)' : undefined }}
                    >
                      {p}일
                    </button>
                  ))}
                </div>
              </div>

              <div className="divider" />

                {/* 파이 차트 */}
                <EmotionPieChart data={pieData} />

                <div style={{ height: 12 }} />

                {/* 꺾은선 ↔ 단일일자 가로 막대 자동 전환 */}
                {isCrowdedOnUnitY ? (
                  <SingleDayEmotionBars
                    row={singleRow}
                    emotions={allEmotions}   // dist.map(d=>d.label)
                    colorsByEmotion={trendPack.colorsByEmotion}
                  />
                ) : (
                  <WeeklyTrendChart
                    data={trendPack.data}
                    emotions={allEmotions}   // dist 기준으로 고정
                    colorsByEmotion={trendPack.colorsByEmotion}
                  />
                )}

                {isSparse && (
                  <div className="small" style={{ marginTop: 6 }}>
                    최근 {periodDays}일 중 기록일 {trendPack.activeDays}일 · 데이터가 적어 선이 짧게 보일 수 있어요
                  </div>
                )}
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
              {data.carryover_digest && data.carryover_digest.trim() ? (
                <div className="card" style={{ whiteSpace: 'pre-line', maxHeight: 280, overflow: 'auto' }}>
                  {/* ✅ 메타 (권종/일자) */}
                  {data.carryover_meta && (
                    <div className="meta" style={{ marginBottom: 8 }}>
                      <span>권종: {data.carryover_meta.pass_name ?? '—'}</span>
                      <span>
                        생성: {data.carryover_meta.generated_at ? fmtKST(data.carryover_meta.generated_at) : '—'}
                      </span>
                    </div>
                  )}
                  {data.carryover_digest}
                </div>
              ) : (
                <div className="card">과거 요약기록이 없습니다.</div>
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
  /* height는 개별 컴포넌트에서 정함 */
  border-radius:12px; border:1px dashed rgba(255,255,255,.12);
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

/* ==== Recharts 포커스/외곽선 제거 공통 ==== */
.chart :focus { outline: none; }
.chart :focus-visible { outline: none; }
.chart .recharts-wrapper:focus,
.chart .recharts-surface:focus,
.chart svg:focus { outline: none; }
.chart .recharts-active-shape { stroke: transparent !important; }
.chart .recharts-sector,
.chart .recharts-rectangle { stroke: none; }
`}}/>
  );
}