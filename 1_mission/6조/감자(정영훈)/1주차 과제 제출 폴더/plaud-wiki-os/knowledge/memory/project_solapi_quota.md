---
name: SOLAPI Starter 플랜 한도 (30 properties/entity)
description: SOLAPI CRM 모델의 Starter 플랜 properties 한도와 quota 모델. 페이스메이커 추가 기능 검토 시 필요.
type: project
originSessionId: 879313d3-3b50-4b8b-986c-44e908f03169
---
SOLAPI Starter 플랜은 **개체(entity)당 최대 30 properties** 한도다. 그리고 **삭제된 property도 quota를 유지**한다.

**Why:** 2026-05-05에 페이스메이커에 MRR/만료 임박 카드 살리려고 ACCOUNT entity에 `월매출`(NUMBER), `계약시작일`(DATE), `계약만료일`(DATE) property 3개 추가 시도. `월매출` 1개는 5/4에 추가 성공 → 5/5에 나머지 2개 시도 시 `403 PlanQuotaExceeded "개체당 최대 속성 수: 30/30"`. 실제 visible properties는 ACCOUNT 7 + LEAD 12 = 합 19개인데 quota는 30 도달 — 마이그레이션·테스트 과정에서 만들었다 지운 properties가 quota에 잔존.

**How to apply:**

1. **SOLAPI에 새 property 추가가 필요한 작업 받으면**: 먼저 Starter quota 여유 확인. `GET /crm-core/v1/properties?entityId=...&limit=100` 호출해도 *visible* 카운트만 보이고 quota 사용량은 안 보임. 추가 시도 → 403 받으면 거의 확정.

2. **막혔을 때 갈래:**
   - (i) 기능 단순화 — 새 property 없이 existing properties + entity 재구성으로 우회. **default 추천 (비용 0, 즉시).**
   - (ii) PROFESSIONAL 업그레이드 — 한도 100/entity. 비용 발생, ROI 본인 판단. (정책 비용은 콘솔 확인.)
   - (iii) 콘솔 직접 들어가서 사용 안 하는 properties 정리 시도 — soft-delete만 되고 quota 안 비면 무용. 시도해보기 전엔 모름.

3. **이미 만든 미사용 property:** `월매출` (propertyId `CRMPP1260504154914472ghztHusnC0o`, ACCOUNT entity). 페이스메이커 단순화로 더 이상 안 씀. 5/5 현재 그대로 둠. PROFESSIONAL 업그레이드 시 활용 가능.

4. **현재 entity 구조:**
   - LEAD entityId `CRMET1260427022529992zJfAuP6ndkE` (12 properties — 전화번호/이메일/담당자명/병원명/단계/유입경로/견적/문의일/메모/레거시ID/카카오유저키/회사명)
   - ACCOUNT entityId `CRMET1260427022530122d1gOkf6zHQL` (7 properties — 주소/업종/전화번호/계약상태/메모/레거시ID/월매출)

5. **인증 헬퍼:** `company-landing/api/_shared.py:_solapi_auth_header()` (Authorization 헤더 *값* string 반환, 인자 0개). TS 포팅 위치는 `marketing-dashboard/src/lib/solapi.ts`.
