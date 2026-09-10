# GTM Tracker

Julie OS 웨이트리스트 홍보용 UTM 링크 빌더 + 단축 링크 + 클릭/신청 대시보드.
로컬 전용 — 계정도, 배포도 필요 없습니다.

## 실행

```
npm install
npm run dev
```

- 링크 만들기: http://localhost:3000/admin
- 대시보드: http://localhost:3000/dashboard
- 신청 폼(단축 링크가 데려가는 곳): http://localhost:3000/waitlist

## 어떻게 동작하나요

1. `/admin`에서 채널을 고르고 "만들기"를 누르면 `/l/{code}` 단축 링크가 생겨요.
2. 그 링크를 클릭하면(미리보기 봇 제외) 클릭이 기록되고, UTM 파라미터가 붙은 채로 `/waitlist`로 넘어가요.
3. `/waitlist`에서 신청하면 그 UTM 값 그대로 신청 기록에 저장돼요.
4. `/dashboard`에서 기간별 클릭·신청·전환율을 채널·소재별로 봅니다.

설계 배경은 `DESIGN.md`, 구현 계획은 `PLAN.md`를 참고하세요.

## 테스트

```
npm test
```

`lib/` 아래 순수 로직(단축코드 생성, 봇 필터링, 대시보드 집계)에 대한 단위 테스트입니다.
