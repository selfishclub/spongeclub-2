---
name: localfalcon-mcp
description: "LocalFalcon MCP HTTP 서버는 URL param `local_falcon_api_key`로는 401, Authorization Bearer 헤더만 인증 통과. v1.4.3 서버 도구 목록 정리"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8c37cd66-2a5a-41de-869d-f13ff9822553
---

# LocalFalcon MCP

**서버**: `https://mcp.localfalcon.com/mcp` (HTTP transport, Streamable)
**버전**: 1.4.3 (2026-05-13 확인)

## 등록 방법

⚠️ URL 쿼리 `?local_falcon_api_key=...` 방식은 **401 — Missing Authorization header**.
반드시 Bearer 토큰 헤더로 전달.

```bash
claude mcp add --transport http localfalcon \
  "https://mcp.localfalcon.com/mcp?is_pro=true" \
  -H "Authorization: Bearer <API_KEY>"
```

`is_pro=true`는 유료 플랜 기능 활성화용 query param. API key는 본인 LocalFalcon 계정에서 발급. 토큰은 `~/.claude.json`(local scope)에 평문 저장됨 — 공유 머신 주의.

신규 등록 후 도구가 deferred에 노출되려면 **클로드 코드 세션 재시작 필요**. 같은 세션 내에서는 ToolSearch가 못 찾음.

## 핵심 개념 (서버 instructions에서)

- **Scan**: 비즈니스+키워드+플랫폼 1세트의 그리드 기반 순위 측정. 크레딧 소모
- **Place ID**: `ChIJ...` 형식 Google 식별자. 스캔 전 saved location 필수
- **SoLV** (Share of Local Voice): 그리드 상위 3위(맵 팩) 노출 비율. Maps 전용
- **SAIV** (Share of AI Visibility): AI 플랫폼 인용 비율. AI 전용. SoLV와 절대 혼용 금지
- **ARP/ATRP**: 평균 순위(나타난 곳만) / 전체 그리드 평균(미노출 = 21로 가산)

## 주요 도구 (사용 워크플로우 순)

| 단계 | 도구 |
|---|---|
| 비즈니스 찾기 | `listAllLocalFalconLocations` → `searchForLocalFalconBusinessLocation` → `saveLocalFalconBusinessLocationToAccount` |
| 기존 데이터 확인 | `listLocalFalconScanReports` (스캔 돌리기 전 반드시) |
| 스캔 실행 | `runLocalFalconScan` (크레딧 소모, 사용자 컨펌 필수) |
| 결과 조회 | `getLocalFalconReport` (fieldmask 필수) |
| 경쟁사 | `getLocalFalconCompetitorReport` |
| 트렌드 | `getLocalFalconTrendReport` (동일 설정 2회+ 스캔 시 자동 생성) |
| 리뷰 분석 | `getLocalFalconReviewsAnalysisReport` (Premium, $19/loc) |
| GBP 모니터링 | `getLocalFalconGuardReport` ($1/mo/10loc) |
| 계정·크레딧 | `viewLocalFalconAccountInformation` |

## 운영 규칙

1. **항상 fieldmask 사용** — 풀 응답이 context 폭주
2. **스캔 전 listLocalFalconScanReports로 기존 데이터 확인** (크레딧 절약)
3. **AI 플랫폼(`chatgpt`/`gemini`/`gaio`/`grok`/`aimode`)은 SAIV만, Maps(`google`/`apple`)는 SoLV만**
4. **그리드 권장**: 도심 밀집 5x5~7x7 / 교외 11x11+ / 매장형 반경 1~3mi / SAB 5~15mi+
5. **불필요 옵션은 그냥 빼라** (null/빈문자 X)

## 우리 SOP와 매핑

- [[project_gbp_rank_methodology]] 의 "0.1mi에서 시작 → Pack 진입 시 0.1mi 확장" 측정 규칙 그대로 `radius` 파라미터에 적용
- [[project_gbp_keyword_sop]] Step 4(잠정 채택 3개 + 베이스라인) → `runLocalFalconScan`을 키워드별로 호출
- 부분 진입(SoLV 1~99%)은 채택 후보, 100% SoLV는 측정에서 빼라는 v3.2 원칙 그대로 적용
- 거래처 발송 추적 키워드에 브랜드명·상호 음역 절대 금지 ([[feedback_no_brand_in_tracking]])
