# Mind-Echo (Site)
AI 기반 감정 기록/분석 서비스 — 프론트엔드
> 본 저장소는 Mind-Echo 서비스의 프론트엔드 코드를 담은 저장소입니다.
> DB 설계는 별도 저장소[https://github.com/lynqrate/lynqrate-flow-template] 에서 관리됩니다.

## 주요 기능
- 이용권 단위 감정 기록
- GPT-4o 자동 감정 분석
- 이용권 소진 시 전체 요약 생성
  
## 기술 스택
Next.js / TypeScript / Vercel

## 주요 구조
src/
├── app/
│   ├── api/
│   │   ├── feedback/      # 감정 피드백 API
│   │   ├── resolve-user/  # 사용자 인증 API
│   │   ├── revisit/       # 재방문 처리 API
│   │   ├── session/       # 세션 관리 API
│   │   └── status/        # 분석 상태 조회 API
│   ├── feedback/          # 감정 분석 결과 페이지
│   ├── revisit/           # 재방문 사용자 페이지
│   └── fail/              # 오류 처리 페이지

## 배포
Vercel CI/CD — GitHub 연동 자동 배포
