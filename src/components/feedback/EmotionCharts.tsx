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
      <ResponsiveContainer width="100%" height="100%">
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
  colorsByEmotion = {},
}: {
  data: any[];
  emotions: string[];
  colorsByEmotion?: Record<string, string | null>;
}) {
  const normHex = (c?: string | null) => {
    if (!c) return null;
    const t = c.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;
    return null;
  };
  const colorFor = (emo: string, i: number) => normHex(colorsByEmotion[emo]) || '#9CA3AF';

  // ✅ 최대값 계산 → 보기 좋은 상한으로 올림
  const rawMax = (() => {
    let m = 0;
    for (const row of data) {
      for (const em of emotions) m = Math.max(m, Number(row?.[em] ?? 0));
    }
    return m;
  })();
  const niceMax = (() => {
    if (rawMax <= 4) return 4;               // 최소 4
    if (rawMax <= 6) return 6;
    if (rawMax <= 10) return 10;
    // 5단위 올림: 11→15, 17→20 …
    return Math.ceil(rawMax / 5) * 5;
  })();

  return (
    <div className="chart" style={{ padding: 8, borderStyle: 'solid', borderColor: 'rgba(255,255,255,.12)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left:8, right:8, top:12, bottom:8 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/>
          <XAxis
            dataKey="date"
            type="category"
            scale="point"
            allowDuplicatedCategory={false}
            tick={{ fill:'#a7aec2', fontSize:12 }}
          />
          {/* ✅ 적응형 Y축 */}
          <YAxis
            allowDecimals={false}
            domain={[0, niceMax]}
            tick={{ fill:'#a7aec2', fontSize:12 }}
          />
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

          {emotions.map((em, i) => (
            <Line
              key={em}
              type="monotone"
              dataKey={em}
              stroke={colorFor(em, i)}
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedBarByDay({
  data,                // [{ date, 기쁨:1, 슬픔:3, ... }, ...]
  emotions,
  colorsByEmotion = {},
}: {
  data: any[];
  emotions: string[];
  colorsByEmotion?: Record<string, string | null>;
}) {
  const normHex = (c?: string | null) => {
    if (!c) return null;
    const t = c.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;
    return null;
  };
  const colorFor = (emo: string) => normHex(colorsByEmotion[emo]) || '#9CA3AF';

  return (
    <div className="chart" style={{ padding: 8, borderStyle: 'solid', borderColor: 'rgba(255,255,255,.12)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left:8, right:8, top:12, bottom:8 }} barGap={4}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/>
          <XAxis dataKey="date" tick={{ fill:'#a7aec2', fontSize:12 }}/>
          <YAxis allowDecimals={false} tick={{ fill:'#a7aec2', fontSize:12 }}/>
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
          {emotions.map((em) => (
            <Bar key={em} dataKey={em} stackId="all" fill={colorFor(em)}>
              <LabelList dataKey={em} position="top" fill="#a7aec2" formatter={(v: any)=> (v>0 ? v : '')}/>
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SingleDayEmotionBars({
  row,               // { date, 기쁨:1, 슬픔:3, ... }
  emotions,
  colorsByEmotion = {},
}: {
  row: any;
  emotions: string[];
  colorsByEmotion?: Record<string, string | null>;
}) {
  const normHex = (c?: string | null) => {
    if (!c) return null;
    const t = c.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;
    return null;
  };
  const colorFor = (emo: string) => normHex(colorsByEmotion[emo]) || '#9CA3AF';

  // 단일 행 → 감정별 가로 막대 데이터로 변환
  const data = emotions.map(em => ({
    emotion: em,
    value: Number(row?.[em] ?? 0),
    fill: colorFor(em),
  }));

  const values = data.map(d => d.value);
  const rawMax = Math.max(0, ...values);
  const niceMax = rawMax <= 4 ? 4 : rawMax <= 6 ? 6 : rawMax <= 10 ? 10 : Math.ceil(rawMax/5)*5;

  return (
    <div className="chart" style={{ padding: 8, borderStyle: 'solid', borderColor: 'rgba(255,255,255,.12)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ left: 14, right: 24, top: 12, bottom: 8 }}  // 라벨 잘리지 않도록 우측 여유
          barCategoryGap={10}
          barSize={14}
        >
          <CartesianGrid stroke="rgba(255,255,255,.06)" />

          {/* ✅ 축 */}
          <XAxis
            type="number"
            allowDecimals={false}
            domain={[0, niceMax]}                 // 너가 이미 넣은 적응형 max
            tick={{ fill:'#a7aec2', fontSize:12 }}
          />
          <YAxis
            type="category"
            dataKey="emotion"
            width={56}                            // y라벨 잘리지 않게
            tick={{ fill:'#a7aec2', fontSize:12 }}
          />

          {/* ✅ Tooltip의 'cursor'를 투명/짙은 회색으로 설정해서 밝은 밴드 제거 */}
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

          {/* ✅ 막대/라벨 */}
          <Bar dataKey="value" isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            <LabelList
              dataKey="value"
              position="right"
              offset={6}
              fill="#e7e9ee"                     // 더 선명한 색
              formatter={(v: any) => (v > 0 ? v : '')}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}