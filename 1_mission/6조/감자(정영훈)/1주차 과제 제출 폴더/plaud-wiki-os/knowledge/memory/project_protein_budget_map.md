---
name: 프로틴맵 (Protein Map)
description: 토스 미니앱 — 단백질 g당 가격 효율 랭킹. 앱인토스 정합성 수정 완료, V2 BM 재설계 필요 (2026-05-05)
type: project
originSessionId: 0b89c4a2-53aa-4658-94e6-8c73be28dcb7
---
토스 미니앱 (앱 이름 "프로틴맵", 디렉토리는 `protein-budget-map/` 유지, appName=`protein-map`). **단백질 g당 가격 효율(₩/g)**로 메뉴 줄세우는 근손실 방어 식단 추천기.

**Why:** 사용자 자체 마케팅 자산 발굴 + 헬창·다이어터 자연 유입. V2 단백질 보충제·도시락 광고 또는 본업 리드 보조.

**How to apply:** 후속 작업 시 `protein-budget-map/` 폴더 + `docs/superpowers/specs/2026-05-05-protein-budget-map-design.md` + `docs/superpowers/plans/2026-05-05-protein-budget-map.md` 우선 참조.

## 상태 (2026-05-05, 일시 중단 — fresh 컨텍스트로 재개 예정)

- 자율 모드로 Phase 0~3 코드 작성 완료, 14 커밋, 40 테스트 통과 (backend 32 + crawler 8)
- 코드 리뷰(HIGH 7개) + 앱인토스 공식 검증(C1~C6) 일괄 수정 완료
- 시드 1순위 결정: **거지맵.com** (`https://xn--v69ak0xskm.com/`) — `crawler/seeds/seeds.json`에 `geojimap-main`으로 등록됨
- 마지막 커밋: `372ae32` (fix(seeds+setup): 거지맵.com 시드 등록 + SETUP.md 토스 정합 갱신)
- 사용자가 "머리 식히고 fresh 컨텍스트로 재개" 명시 (2026-05-05)

## 재개 시 가장 먼저 할 것

1. `git log --oneline -15`로 마지막 커밋 확인 (예상: `372ae32` 또는 그 이후)
2. `protein-budget-map/SETUP.md` 정독 — 사용자 수동 1~5단계가 끝났는지 확인 (Supabase 프로젝트, .env, 마이그레이션)
3. 5단계 끝났으면 **6단계 `/scrape https://xn--v69ak0xskm.com/`** 실행 → 결과 검증 → `/skillify`로 `crawler/scrape_jobs/geojimap-main/script.ts` 박제
4. 5단계 안 끝났으면 사용자에게 어디까지 됐는지 물어보고 거기서 이어가기
5. 거지맵.com이 JS 렌더링이라 1차 시도 실패 가능 — 그때 다이닝코드(`https://www.diningcode.com/list.dc?query=강남역+가성비좋은`) V1.5 보조 시드로 추가 검토

## V2 BM 재설계 필요 (중요)

토스 미니앱 정책상 **외부 광고 네트워크(애드몹/구글 애드센스 등) 직접 게재 금지**.
당초 V2로 계획한 "단백질 보충제·도시락 광고"는 외부 광고 네트워크 의존 시 입점 거부 사유.
V2는 다음 중 택1로 재설계 필요:
- 토스 자체 광고 상품(있다면) 활용
- 제휴 파트너십(보충제 브랜드와 직접 계약) — 미니앱 내 자연스러운 큐레이션·어필리에이트 링크
- 본업(병원마케팅) 리드 보조 자산으로 위치 지정 → BM은 본업으로 환원

## 스택

- 백엔드: FastAPI + Supabase(Postgres+PostGIS+pgcrypto) + Claude Haiku 4.5
- 프론트: React + Vite + 토스 Bedrock SDK (V1 비로그인 진입)
- 크롤러: GStack `/scrape` + `/skillify` 박제 + Python launchd 주1회
- 배포 예정: Vercel(frontend) + Fly.io(`protein-budget-map-api`)
- 알림: iMessage self-chat (`any;-;[연락처]`)

## 핵심 결정

- **랭킹 단일 지표**: cost_per_g (₩/g). 가격·단백질 절대량은 보조 라벨.
- **단백질 추정**: Claude Haiku, 메뉴명만 입력, `confidence='mid' 이상`만 노출. `low`는 DB 저장 후 API 응답 제외.
- **시드 우선순위**: 큐레이션 블로그 → RSS/공개 API → 인스타 (인스타 ToS 가드, 주1회 미만)
- **MVP 지역**: 강남·역삼·선릉, 메뉴 시드 200~500개 목표
- **인증**: V1 비로그인 (정보 큐레이션만). 토스 Login은 V2 즐겨찾기 도입 시.

## 사용자 수동 잔여 작업 (Phase 4 진입 전 필수)

1. Supabase 프로젝트 생성 → URL, service_role key
2. ANTHROPIC_API_KEY 발급
3. SEED_TOKEN 생성 (`openssl rand -hex 32`)
4. `backend/.env` + `frontend/.env.local` 채우기
5. Supabase SQL Editor에서 `0001_init.sql` + `0002_ranking_rpc.sql` 실행 + 검증
6. GStack `/scrape <블로그 URL>` 인터랙티브 호출 → `/skillify`로 첫 시드 박제
7. `crawler/seeds/seeds.json`에 실제 URL 채우기
8. launchd plist에 EnvironmentVariables 추가 후 `launchctl load`
9. Fly.io + Vercel 배포 + 토스 입점 신청

## 잠재 이슈 (코드 리뷰 결과 별도 확인)

- launchd plist에 환경변수 미주입 (현재 runner.py가 즉시 종료될 수 있음)
- Anthropic 모델 ID `claude-haiku-4-5-20251001` 거부 시 fallback 결정 필요
- 빈 백엔드 상태에서 frontend "데이터 없음" 표시 — 시드 적재 후 dogfood 가능
