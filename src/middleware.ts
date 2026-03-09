import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// 로그인이 필요한 페이지들
const protectedRoutes = ['/form', '/result', '/dashboard', '/settings'];

export async function middleware(req: NextRequest) {
  //console.log('미들웨어 실행됨:', req.nextUrl.pathname);
  const host = req.headers.get('host')?.toLowerCase() || '';

  // 1. 루트/WWW에서만 app.으로 리다이렉트
  if (host === 'lynqrateflow.com' || host === 'www.lynqrateflow.com') {
    const url = req.nextUrl.clone();
    url.protocol = 'https:'; // http 요청도 https로
    url.host = 'app.lynqrateflow.com';
    return NextResponse.redirect(url, 308);
  }

  // 로그인 상태에서 / 접근 시 /form으로 리다이렉트
  if (req.nextUrl.pathname === '/') {
    const res = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const formUrl = req.nextUrl.clone()
      formUrl.pathname = '/form'
      return NextResponse.redirect(formUrl)
    }
    return res
  }

  // 2. 로그인 상태에서 /login 접근 시 /form으로 리다이렉트
  if (req.nextUrl.pathname === '/login') {
    const res = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const formUrl = req.nextUrl.clone()
      formUrl.pathname = '/form'
      return NextResponse.redirect(formUrl)
    }
    return res
  }

  // 2-1. 로그인 보호 페이지 체크
  const isProtected = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (isProtected) {
    const res = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

console.log('pathname:', req.nextUrl.pathname)
console.log('cookies:', req.cookies.getAll().map(c => c.name))
console.log('user:', user?.id ?? null)
console.log('error:', error?.message ?? null)

    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }

    return res;
  }

  // 3. 나머지는 그대로 통과
  return NextResponse.next();
}

// 정적파일, 헬스체크는 미들웨어 통과 제외
export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt|sitemap.xml|api/health|auth/).*)'],
}