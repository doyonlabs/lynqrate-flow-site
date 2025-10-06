// src/lib/rate-limit.ts
const hits = new Map<string, number[]>();

export function clientKey(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '0.0.0.0';
  const ua = req.headers.get('user-agent') || '';
  return `${ip}|${ua}`;
}

export function touch(key: string, windowMs: number): number {
  const now = Date.now();
  const arr = hits.get(key) || [];
  const recent = arr.filter(t => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length; // 현재 윈도우 내 카운트
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function limited(key: string, windowMs: number, limit: number) {
  const c = touch(key, windowMs);
  return { limited: c > limit, count: c };
}