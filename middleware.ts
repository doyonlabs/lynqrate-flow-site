import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.toLowerCase() || '';

  // ✅ 1. dev 서브도메인은 무조건 통과 (리다이렉트 금지)
  if (host.startsWith('dev.')) {
    return NextResponse.next();
  }

  // ✅ 2. 루트/WWW에서만 app.으로 리다이렉트
  if (host === 'lynqrateflow.com' || host === 'www.lynqrateflow.com') {
    const url = req.nextUrl.clone();
    url.protocol = 'https:'; // http 요청도 https로
    url.host = 'app.lynqrateflow.com';
    return NextResponse.redirect(url, 308);
  }

  // ✅ 3. 나머지는 그대로 통과
  return NextResponse.next();
}

// 정적파일, 헬스체크는 미들웨어 통과 제외
export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt|sitemap.xml|api/health).*)'],
};