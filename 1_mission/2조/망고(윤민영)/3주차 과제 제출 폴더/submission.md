---
member: 윤민영
조: 2
week: 3
type: weekly
title: Come Away — 2주차 OS 업그레이드 + Vercel 배포 도전
summary: 묵상 OS에 편집·검색·스트릭·공유카드 기능을 추가하고, 누구나 접속 가능한 웹 배포를 시도했다
date: 2026-07-19
---

![3주차 미션 안내](https://github.com/selfishclub/spongeclub-2/raw/main/_meta/week3/overview.png)

# 3주차 — 내 OS 최종 완성 🏁

> 미션을 진행하며 과정과 결과를 기록해주세요. (다 못 채워도 OK, 한 것 위주로!)

## 🎯 미션 1. 내 삶을 돕는 OS 최종 완성

**완성한 것 (무엇을):**

2주차 Come Away 아침 묵상 OS에 4가지 기능 추가 + Vercel 웹 배포 도전

**① 묵상 편집 기능**
저장한 묵상을 수정할 수 없었던 문제 해결. 각 카드에 "편집" 버튼 추가 → 모달 창에서 묵상 내용·액션플랜·단어 수정 가능.

**② 연속 묵상 스트릭**
대시보드 상단에 "N일 연속 묵상 중 🔥" 배너 추가. 오늘 또는 어제까지 연속으로 기록된 날짜를 자동 계산해 표시.

**③ 키워드 검색**
대시보드에 검색창 추가. 구절명·묵상 내용·액션플랜·단어 전체에서 실시간 필터링.

**④ 묵상 공유 카드**
각 카드에 "카드" 버튼 → Come Away 디자인이 담긴 공유 카드 → "이미지로 저장" 클릭 시 PNG 다운로드.

**피드백 반영한 점:**
- 대시보드에 중복 저장된 항목 삭제 버튼 추가 (2주차 피드백)
- 공유 문제 해결을 위해 Vercel 배포 시도

**결과물:**
- 로컬 버전: `http://psalm1331:1331` (완전 작동)
- 웹 배포 버전: https://come-away-xi.vercel.app (홈·대시보드 작동, 분석 기능은 API 결제 이슈로 미완성)
- GitHub: https://github.com/applemango-yoon/come-away

**알게 된 인사이트:**
만드는 것보다 배포하는 게 더 어렵다. 특히 돈 안 쓰고 하려 할 때. 로컬에서 완벽히 돌아가는 앱을 전 세계에 공개하는 일은 기술 스택 전환(파일 저장→DB, CLI→API), 인프라 선택, 비용 문제가 모두 얽혀있다.

---

### 삽질 과정

**삽질 1 — 편집 기능: 인덱스 vs ID 문제**
로컬 버전은 JSON 배열 인덱스로 항목을 식별했는데, Vercel+Supabase로 넘어오면서 DB의 고유 ID로 바꿔야 했다. JS에서 `allEntries[idx]` 방식을 `allEntries.find(e => e.id === id)` 방식으로 전면 수정.

**삽질 2 — Vercel Python 빌드 오류**
`BaseHTTPRequestHandler` 방식으로 작성한 Python 파일을 올렸더니 "No python entrypoint found" 에러 발생. `vercel.json`에 `@vercel/python` 빌더를 명시해서 해결.

**삽질 3 — AI API 세 번의 벽**
Vercel 배포 후 분석 기능을 연결하는 과정에서 세 개의 API를 시도했고 모두 막혔다.
- **Anthropic API:** 한국 카드 결제 버튼이 눌리지 않음 (Safari 버그 + 해외결제 이슈)
- **Google Gemini API:** 한국 계정에서 free tier quota가 0으로 설정되어 있어 첫 요청부터 429 에러
- **Groq API:** 로컬에서는 작동 확인 후 배포했으나 Vercel 서버 IP가 Groq에서 차단됨 (403 에러)

결론: 무료 AI API를 Vercel 서버리스에서 쓰는 건 IP 차단·지역 제한·결제 장벽이 모두 겹쳐 생각보다 훨씬 어렵다.

**삽질 4 — 터널 방식 먼저 시도**
Vercel 전에 localhost.run, Cloudflare 터널로 로컬 서버를 외부에 노출하려 했으나 연결 불안정 + 설치 환경 문제로 실패. 결국 Vercel로 완전히 재설계했다.

---

## 📣 미션 2. 스폰지 토크데이 SNS 후기

- **후기 내용:** (추후 작성)
- **SNS 인증 링크:** (추후 작성)
