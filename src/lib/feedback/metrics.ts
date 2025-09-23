export const EMOTION_COLORS: Record<string, string> = {
  '기쁨':'#FCD34D','불안':'#7DD3FC','분노':'#FCA5A5','피로':'#CBD5E1',
  '평온':'#86EFAC','외로움':'#C7D2FE','당황':'#E9D5FF','지침':'#E5E7EB','—':'#9CA3AF'
};

export type EntryLite = { entry_datetime: string; standard_emotion: string };

export function groupByEmotion(entries: EntryLite[]) {
  const map = new Map<string, number>();
  entries.forEach(e => map.set(e.standard_emotion || '—', (map.get(e.standard_emotion || '—') || 0) + 1));
  return Array.from(map, ([name, value]) => ({ name, value, fill: EMOTION_COLORS[name] || '#9CA3AF' }));
}

export function last7DaysTrend(entries: EntryLite[]) {
  const today = new Date();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0,10));
  }
  const emotions = Array.from(new Set(entries.map(e => e.standard_emotion || '—')));
  const acc: Record<string, Record<string, number>> = {};
  days.forEach(day => { acc[day] = {}; emotions.forEach(em => acc[day][em] = 0); });
  entries.forEach(e => {
    const day = new Date(e.entry_datetime).toISOString().slice(0,10);
    if (acc[day]) acc[day][e.standard_emotion || '—'] += 1;
  });
  return { data: days.map(day => ({ day, ...acc[day] })), emotions };
}