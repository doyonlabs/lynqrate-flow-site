// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.toLowerCase() || '';
  // 루트/WWW에서만 app.으로 보냄
  if (host === 'lynqrateflow.com' || host === 'www.lynqrateflow.com') {
    const url = req.nextUrl.clone();
    url.host = 'app.lynqrateflow.com';
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

// 정적/헬스체크 등은 미들웨어 패스(원하면 더 추가)
export const config = {
  matcher: [
    '/((?!_next/|favicon.ico|robots.txt|sitemap.xml|api/health).*)',
  ],
};