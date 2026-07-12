---
name: gbp-1
description: "모발이식 강남, 8키워드 0.1mi 측정 + 거래처 발송 제안서 HTML 작성. 신규 4개 채택. 카테고리 변경 권고가 핵심. 2026-05-13"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8c37cd66-2a5a-41de-869d-f13ff9822553
---

# A의원 GBP 추적 키워드 시딩

**Place ID**: [PLACE_ID]
**좌표**: [좌표] (서초구)
**원장**: [원장명] · 사이트: [도메인] · 영문 페이지 존재

## 진행 단계 (2026-05-13)

1. ✅ LocalFalcon saved location 등록
2. ✅ 0.1mi · 5×5 그리드 · google · 8 키워드 측정 (한 5 + 영 3, 약 200 크레딧)
3. ✅ 거래처 발송 제안서 HTML 작성: `company-ontology/clients/A의원/[M]_260513_A의원_구글맵_추적키워드_제안서.html`
4. ⏳ 사용자 검토 대기 → 톤·구조 조정 후 거래처 발송
5. ⏳ A의원 GBP 카테고리·이름 변경 실행
6. ⏳ 4주 뒤 재측정 (트렌드 리포트 자동 생성)

## 측정 결과 (0.1mi · 5×5)

| # | 키워드 | SoLV | ARP | 처리 |
|---|---|---|---|---|
| 1 | 강남 모발이식 | 0% | 12.12 | 베이스라인 (광역 헤드) |
| 2 | 강남 무삭발 비절개 모발이식 | 0% | 10.00 | **채택 A** (시그니처) |
| 3 | 강남 모발이식 재수술 | 0% | 17.38 | **채택 B** (재수술) |
| 4 | 강남 여성 헤어라인 모발이식 | 0% | 12.84 | **채택 C** (여성) |
| 5 | 강남 두피문신 | 0% / 0/25 | 21.00 | 분리 (다른 카테고리 시장) |
| 6 | hair transplant gangnam | 0% | 10.00 | 베이스라인 (영어 헤드) |
| 7 | no shave hair transplant korea | **28%** | 3.92 | **채택 D** (영어 시그니처 · 부분 진입) |
| 8 | fue hair transplant korea | 0% | 6.56 | 예비 |

## 핵심 진단 — 카테고리 결함

A의원 GBP 카테고리: **`medical_group` (의료 그룹) 단 1개**

| 비교군 | 카테고리 |
|---|---|
| 경쟁의원1 (모발이식 1위 100%) | dermatologist + hair_replacement_service |
| 경쟁의원2 (1위 100%) | hair_replacement_service |
| 경쟁의원4 (직접 경쟁사) | hair_transplantation_clinic |
| 경쟁의원5 (두피문신 1위) | permanent_make_up_clinic |
| A의원 | medical_group ← **모발이식 카테고리 없음** |

→ 알고리즘이 모발이식 검색층에 A의원을 매칭 안 시킴. **이름·카테고리 정렬 = 50%+50%** ([[project_gbp_rank_methodology]]) 중 카테고리 0점.

권고: 메인 카테고리 → `hair_transplantation_clinic` + 보조 `dermatologist` 또는 `hair_replacement_service` 추가. 비즈니스명 키워드 스터핑은 [[feedback_keyword_stuffing_sop]] 적용.

## 직접 경쟁사

- **경쟁의원4** ([PLACE_ID]): 강남구 (강남역 더 가까움). 카테고리·이름·도메인([경쟁사 도메인]) 모두 모발이식 정렬. 리뷰 12개(A의원 8). 자동완성 `경쟁의원4 히든컷` 노출 → "히든컷 원조 A의원" 자칭 카피 분쟁 리스크
- **경쟁의원2**, **경쟁의원1**, **경쟁의원3** — 시장 도미넌트 3곳 (모발이식 1위 100% × 셋)

## 제안서 8 슬라이드 구조 (SOP v3.3 Section 10 표준)

1. 표지 (그라디언트 #1E2A6B → #5B7BFF)
2. SUMMARY — 현재 0 vs 신규 4개 swap 카드
3. DIAGNOSIS — 8키워드 측정 결과 + 한계 표
4. EVIDENCE 1 — 한·영 자동완성 패턴 데이터
5. EVIDENCE 2 — 외부 가이드 사용 증거 (Wikipedia · Healthline · 디시·더쿠 자동완성 노출)
6. RATIONALE — 4개 선정 근거 종합 표
7. COVERAGE MAP — 키워드 × 환자층 매트릭스
8. BASELINE — 오늘 기준값 + 다음 측정 안내

디자인 토큰: Pretendard · Toss Blue #3182F6 · 1280×720. 슬라이드 시스템(키보드 ← →)은 service-m-deck.html 차용.

## 제안서 적용 룰 ([[feedback_*]] 준수 확인)

- ✅ 측정 도구 이름 노출 없음 ([[feedback_no_tool_name_exposure]])
- ✅ 상호 음역 추적 제외 ([[feedback_no_brand_in_tracking]])
- ✅ 번역투 금지: 박힌/베이스라인/시딩 한글 표기 모두 수정 ([[feedback_no_translationese]])
- ✅ 1위 단정 X (상위권 / 측정 셀별 표기)
- ✅ 로드맵·결정요청·부록 없음 ([[feedback_report_no_roadmap]])
- ✅ 외부 출처 작성 시점 직접 fetch 확인 (Wikipedia · Healthline)
- ✅ 우리 회사 로고는 표지에만 ([[feedback_external_facing_report]])
- ✅ 채용 권장 없음 ([[feedback_no_hiring_recommendation]])

## 다음 추가 가능 작업

- 측정 트렌드 리포트: 동일 8키워드 4주 뒤 재측정 → LocalFalcon 자동 트렌드 리포트 생성
- Falcon Guard 등록 ($1/mo) — GBP 카테고리·이름 변경 모니터링
- 경쟁사(경쟁의원2·경쟁의원1·경쟁의원4) saved 등록 → 분기 비교 측정
- 일본어·중국어 시장 추가 측정 (외국인 응대 역량 확인 후)
