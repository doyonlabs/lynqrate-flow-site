// 예시: 감정별 개수 + 색상 맵
export function groupByEmotion(rows: {standard_emotion:string; color_code?:string|null}[]) {
  const map = new Map<string, { value: number, color?: string|null }>();
  for (const r of rows) {
    const key = r.standard_emotion || '미정';
    const prev = map.get(key) || { value: 0, color: r.color_code ?? null };
    // 최초 등장 색을 고정(뒤에서 달라도 첫 색 유지)
    if (!prev.color && r.color_code) prev.color = r.color_code;
    map.set(key, { value: prev.value + 1, color: prev.color });
  }
  // 차트용 배열 + 색상 딕셔너리 동시 반환
  const data = Array.from(map.entries()).map(([name, v]) => ({ name, value: v.value }));
  const colorsByEmotion = Object.fromEntries(
    Array.from(map.entries()).map(([name, v]) => [name, v.color || null])
  );
  return { data, colorsByEmotion };
}

// 주간 추세도 감정 목록과 색상을 함께
export function last7DaysTrend(
  rows: { entry_datetime: string; standard_emotion: string; color_code?: string | null }[]
) {
  const emotions: string[] = [];
  const colorsByEmotion: Record<string, string | null> = {};

  // 1) 날짜별 집계 준비
  const mapByDate: Record<string, Record<string, number>> = {};

  for (const r of rows) {
    const date = new Date(r.entry_datetime).toISOString().slice(0, 10); // YYYY-MM-DD
    const emo = r.standard_emotion || '미정';

    if (!emotions.includes(emo)) emotions.push(emo);
    if (!(emo in colorsByEmotion) && r.color_code) colorsByEmotion[emo] = r.color_code;

    if (!mapByDate[date]) mapByDate[date] = {};
    mapByDate[date][emo] = (mapByDate[date][emo] || 0) + 1;
  }

  // 2) 객체 → 배열 변환
  const data = Object.entries(mapByDate).map(([date, emoCounts]) => ({
    date,
    ...emoCounts,
  }));

  // 3) 결과 리턴
  return { data, emotions, colorsByEmotion };
}

// src/lib/feedback/metrics.ts
export type Bucket = 'day'|'week'|'month';
export type Period = 7|30|90;

export function aggregateTrend(
  rows: { entry_datetime:string; standard_emotion:string; color_code?:string|null }[],
  period: Period = 7,              // 7일/30일/90일
  bucket: Bucket | 'auto' = 'auto' // Auto: 데이터 밀도에 따라 day/week 선택
) {
  const tz = 'Asia/Seoul';

  // 오늘(KST)과 시작일
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const start = new Date(today); start.setDate(start.getDate() - (period - 1));

  // KST YYYY-MM-DD
  const toKstYmd = (iso: string) => {
    const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: tz }));
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  // 활성 일수(데이터 있는 날)
  const active = new Set<string>();
  for (const r of rows) {
    const ymd = toKstYmd(r.entry_datetime);
    const d = new Date(ymd);
    if (d >= start && d <= today) active.add(ymd);
  }

  // Auto 규칙(간단): 데이터가 많으면 week, 아니면 day
  let useBucket: Bucket =
    bucket === 'auto' ? (active.size > 20 ? 'week' : 'day') : bucket;

  // 버킷 키 만들기
  const weekKey = (d: Date) => {
    const w = new Date(d); const day = (w.getDay()+6)%7; w.setDate(w.getDate()-day); // 월요일 시작
    return `${w.getFullYear()}-${String(w.getMonth()+1).padStart(2,'0')}-${String(w.getDate()).padStart(2,'0')}`;
  };
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  const bucketKey = (iso: string) => {
    const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: tz }));
    if (useBucket==='week')  return weekKey(d);
    if (useBucket==='month') return monthKey(d);
    return toKstYmd(iso);
  };

  // 집계
  const emotions: string[] = [];
  const colorsByEmotion: Record<string,string|null> = {};
  const counts: Record<string, Record<string, number>> = {};

  for (const r of rows) {
    const k = bucketKey(r.entry_datetime);
    const kd = new Date(k);
    if (kd < start || kd > today) continue;

    const emo = (r.standard_emotion || '미정').trim();
    if (!emotions.includes(emo)) emotions.push(emo);
    if (!(emo in colorsByEmotion) && r.color_code) {
      const hex = r.color_code.startsWith('#') ? r.color_code : `#${r.color_code}`;
      colorsByEmotion[emo] = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : null;
    }
    counts[k] = counts[k] || {};
    counts[k][emo] = (counts[k][emo] || 0) + 1;
  }

  // 타임라인(0 보정)
  const ticks: string[] = [];
  const cur = new Date(start);
  while (cur <= today) {
    const key = useBucket==='month' ? monthKey(cur) : (useBucket==='week' ? weekKey(cur) : toKstYmd(cur.toISOString()));
    if (!ticks.includes(key)) ticks.push(key);
    useBucket==='month' ? cur.setMonth(cur.getMonth()+1)
      : useBucket==='week' ? cur.setDate(cur.getDate()+7)
      : cur.setDate(cur.getDate()+1);
  }

  const data = ticks.map(dt => {
    const row:any = { date: dt };
    for (const emo of emotions) row[emo] = counts[dt]?.[emo] || 0;
    return row;
  });

  return { data, emotions, colorsByEmotion, bucket: useBucket, period, activeDays: active.size };
}