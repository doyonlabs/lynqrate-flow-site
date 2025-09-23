'use client';

import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { EMOTION_COLORS } from '@/lib/feedback/metrics';

export function EmotionPieChart({ data }:{ data: Array<{name:string;value:number;fill:string}> }) {
  return (
    <div className="chart" style={{ padding: 8, borderStyle: 'solid', borderColor: 'rgba(255,255,255,.12)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} stroke="none">
            {data.map((d,i)=><Cell key={i} fill={d.fill}/>)}
          </Pie>
          <RTooltip contentStyle={{ background:'#0f1422', border:'1px solid rgba(255,255,255,.1)', color:'#e7e9ee' }}/>
          <Legend wrapperStyle={{ color:'#a7aec2' }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyTrendChart({ data, emotions }:{ data:any[]; emotions:string[] }) {
  return (
    <div className="chart" style={{ padding: 8, borderStyle: 'solid', borderColor: 'rgba(255,255,255,.12)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left:8, right:8, top:12, bottom:8 }}>
          <defs>
            {emotions.map(em=>(
              <linearGradient id={`grad-${em}`} x1="0" y1="0" x2="0" y2="1" key={em}>
                <stop offset="5%" stopColor={EMOTION_COLORS[em]||'#9CA3AF'} stopOpacity={0.9}/>
                <stop offset="95%" stopColor={EMOTION_COLORS[em]||'#9CA3AF'} stopOpacity={0.05}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/>
          <XAxis dataKey="day" tick={{ fill:'#a7aec2', fontSize:12 }}/>
          <YAxis allowDecimals={false} tick={{ fill:'#a7aec2', fontSize:12 }}/>
          <RTooltip contentStyle={{ background:'#0f1422', border:'1px solid rgba(255,255,255,.1)', color:'#e7e9ee' }}/>
          {emotions.map(em=>(
            <Area key={em} type="monotone" dataKey={em}
                  stroke={EMOTION_COLORS[em]||'#9CA3AF'} fill={`url(#grad-${em})`}
                  strokeWidth={2} dot={false} activeDot={{ r:3 }}/>
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}