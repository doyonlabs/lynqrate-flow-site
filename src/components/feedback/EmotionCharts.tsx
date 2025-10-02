'use client';

import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, LabelList
} from 'recharts';


export function EmotionPieChart({
  data,
}:{ data: Array<{name:string; value:number; fill:string}> }) {
  return (
    <div className="chart" style={{ padding: 8, borderStyle: 'solid', borderColor: 'rgba(255,255,255,.12)' }}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} stroke="none">
            {data.map((d,i)=><Cell key={i} fill={d.fill}/>)}
          </Pie>
          <RTooltip
            cursor={{ fill: 'rgba(255,255,255,.04)' }}    // hover 밴드 약하게(싫으면 false)
            contentStyle={{
              background:'#0f1422',
              border:'1px solid rgba(255,255,255,.1)',
            }}
            itemStyle={{ color:'#e7e9ee' }}               // ✅ 항목 글자 색
            labelStyle={{ color:'#a7aec2' }}              // (라벨 쓰면) 라벨 색
            labelFormatter={() => ''}                     // 단일일자라 상단 라벨 숨김
            separator=" : "                               // 구분자
            formatter={(value: any, _name: any, info: any) => {
              const emotion = info?.payload?.emotion ?? info?.name ?? '—'; // ✅ 감정명으로 교체
              return [String(value), emotion];            // [표시값, 표시이름]
            }}
          />
          <Legend wrapperStyle={{ color:'#a7aec2' }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ⬇ 여기부터 교체
export function WeeklyTrendChart({
  data,
  emotions,
  colorsByEmotion,
}: {
  data: Array<Record<string, any>>;
  emotions: string[];
  colorsByEmotion?: Record<string, string>;
}) {
  const normHex = (c?: string | null) => {
    if (!c) return '#999999';
    const t = c.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;
    return '#999999';
  };

  const rows = (data ?? []).map((r, i) => {
    const o: Record<string, any> = {};
    o.date = (r?.date ?? r?.day ?? r?.label ?? String(i + 1)) as string;
    (emotions || []).forEach(em => { o[em] = Number(r?.[em] ?? 0) || 0; });
    return o;
  });

  const hasAny =
    rows.length > 0 &&
    rows.some(row => (emotions || []).some(em => (row[em] ?? 0) > 0));

  if (!hasAny) {
    return <div className="chart" style={{height:260}}>최근 30일 데이터가 없어요</div>;
  }

  const maxV = Math.max(
    0,
    ...rows.flatMap(row => (emotions || []).map(em => Number(row[em] ?? 0)))
  );
  const domainMax = Math.max(1, maxV);

  // ⬇️ 시리즈별 점을 좌우로 살짝 벌리는 함수 (겹침 방지)
  const jitterPx = (seriesIndex: number, total: number) =>
    (seriesIndex - (total - 1) / 2) * 4; // 총 개수에 따라 -4, 0, +4 … 픽셀

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill:'#a7aec2', fontSize:12 }} tickMargin={6} />
        <YAxis domain={[0, domainMax]} tick={{ fill:'#a7aec2', fontSize:12 }} allowDecimals={false} width={36} />
        <RTooltip
          contentStyle={{ background:'#0f1422', border:'1px solid rgba(255,255,255,.08)' }}
          labelStyle={{ color:'#e7e9ee' }}
          cursor={{ stroke:'rgba(255,255,255,.12)' }}
        />

        {emotions.map((em, idx) => {
          const color = normHex(colorsByEmotion?.[em]);

          // 점 겹침 방지용 살짝 평행이동 px
          const jitterPx = (i: number, total: number) =>
            total <= 1 ? 0 : (i - (total - 1) / 2) * 1.8; // 원래 쓰던 값 유지/조정

          return (
            <Line
              key={`line-${em}`}
              type="monotone"
              dataKey={em}
              name={em}
              stroke={color}
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, index } = props;
                const jx = (cx ?? 0) + jitterPx(idx, emotions.length);
                return (
                  <circle
                    key={`dot-${em}-${index}`}     // 🔴 반드시 고유 key
                    cx={jx}
                    cy={cy ?? 0}
                    r={3}
                    fill={color}
                  />
                );
              }}
              activeDot={(props: any) => {
                const { cx, cy, index } = props;
                const jx = (cx ?? 0) + jitterPx(idx, emotions.length);
                return (
                  <circle
                    key={`actdot-${em}-${index}`}   // 🔴 activeDot도 key 부여
                    cx={jx}
                    cy={cy ?? 0}
                    r={4}
                    stroke="#fff"
                    strokeWidth={1}
                    fill={color}
                  />
                );
              }}
              connectNulls
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

type SingleDayProps = {
  row: Record<string, number>;
  emotions: string[];
  colorsByEmotion: Record<string, string | null>;
};

export function SingleDayEmotionBars({ row, emotions, colorsByEmotion }: SingleDayProps) {
  if (!emotions || emotions.length === 0) {
    return <div className="chart" style={{height:320}}>최근 30일 데이터가 없어요</div>;
  }
  // 1) 데이터 정규화 (숫자 보장)
  let data = emotions.map((em) => ({
    emotion: em,
    value: Number(row?.[em] ?? 0),
    color: colorsByEmotion?.[em] ?? '#999999',
  }));

  // 2) 감정이 1개만 있으면 유령 카테고리 추가 (시각적 여유)
  if (data.length === 1) {
    data = [
      data[0],
      { emotion: '\u00A0', value: 0, color: 'transparent' }, // non-breaking space
    ];
  }

  const max = Math.max(0, ...data.map((d) => d.value));

  return (
    <div className="chart" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 18, bottom: 20, left: 12 }} // 여백
          barSize={18}                   // ✅ 막대 두께 고정
          barCategoryGap={24}            // 카테고리 간 간격
        >
          <CartesianGrid horizontal vertical={false} strokeDasharray="3 3" opacity={0.18} />

          {/* 값 축(가로) : 여유 도메인 */}
          <XAxis
            type="number"
            domain={[0, max === 0 ? 1 : max + 1]} // 0만 있어도 살짝 여유
            tick={{ fill: '#a7aec2', fontSize: 12 }}
          />

          {/* 카테고리 축(세로) */}
          <YAxis
            type="category"
            dataKey="emotion"
            width={84}
            tick={{ fill: '#a7aec2', fontSize: 12 }}
            tickFormatter={(v) => (typeof v === 'string' && v.trim() === '' ? '' : v)}
            padding={{ top: 10, bottom: 10 }}     // ✅ 위아래 패딩
          />

          <RTooltip
            cursor={{ fill: 'rgba(255,255,255,.04)' }}
            contentStyle={{ background: '#0f1422', border: '1px solid rgba(255,255,255,.08)' }}
            labelStyle={{ color: '#e7e9ee' }}
            formatter={(val: any) => [val, '횟수']}
          />

          <Bar dataKey="value" radius={[0, 0, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
            {/* 값 라벨 (0은 숨김) */}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(label) => {
                const n = Number(label as any);
                return n > 0 ? String(n) : '';   // ✅ 1개 인자만 사용
              }}
              fill="#e7e9ee"
              fontSize={12}
              offset={8}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedDailyBars({
  data,
  emotions,
  colorsByEmotion,
}: {
  data: Array<Record<string, any>>;
  emotions: string[];
  colorsByEmotion?: Record<string, string>;
}) {
  const normHex = (c?: string | null) => {
    if (!c) return '#999999';
    const t = c.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;
    return '#999999';
  };

  const rows = (data ?? []).map((r, i) => {
    const o: Record<string, any> = {};
    o.date = (r?.date ?? r?.day ?? r?.label ?? String(i + 1)) as string;
    (emotions || []).forEach(em => { o[em] = Number(r?.[em] ?? 0) || 0; });
    return o;
  });

  const hasAny =
    rows.length > 0 &&
    rows.some(row => (emotions || []).some(em => (row[em] ?? 0) > 0));

  if (!hasAny) {
    return <div className="chart" style={{height:260}}>최근 구간에 표시할 데이터가 없어요</div>;
  }

  // 최대값 계산해서 Y축 여유
  const maxV = Math.max(
    0,
    ...rows.map(row => (emotions || []).reduce((sum, em) => sum + (Number(row[em] ?? 0) || 0), 0))
  );
  const domainMax = Math.max(1, maxV);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill:'#a7aec2', fontSize:12 }} tickMargin={6} />
        <YAxis domain={[0, domainMax]} tick={{ fill:'#a7aec2', fontSize:12 }} allowDecimals={false} width={36} />
        <RTooltip
          contentStyle={{ background:'#0f1422', border:'1px solid rgba(255,255,255,.08)' }}
          labelStyle={{ color:'#e7e9ee' }}
          cursor={{ fill:'rgba(255,255,255,.04)' }}
        />
        {(emotions || []).map(em => (
          <Bar
            key={em}
            dataKey={em}
            name={em}
            stackId="stack"
            fill={normHex(colorsByEmotion?.[em])}
            radius={[0,0,0,0]}   // 각진 막대
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}