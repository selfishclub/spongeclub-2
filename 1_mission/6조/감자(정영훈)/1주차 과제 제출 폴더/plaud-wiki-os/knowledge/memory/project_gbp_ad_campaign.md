---
name: GBP 진단 메타광고 캠페인
description: 8종 AB 14일 결과 — C(리뷰 삭제 후불 보장) 압도적 우승 CPL 25K, 광고 모두 PAUSED 상태, "C 단독 재개" 결정 보류 중 (2026-05-05)
type: project
originSessionId: c5a86f76-507a-40a3-a44a-b6a6a7138a15
---

## 2026-05-05 진단 결과 (14일 4/19~5/3, 지출 n원, 리드 4건)

| slot | 앵글 | CTR | 리드 | CPL |
|------|-----------|------|------|------|
| **C** | 리뷰 삭제 후불 보장 | **2.91%** | 3 | **n원** ✅ |
| A | 무료진단 호기심 | 1.83% | 1 | n원 |
| B | 권한 탈취 | 1.53% | 0 | - |
| D | 미매핑 | 0.29% ❌ | 0 | - |
| F/H | 미매핑 | ~1.5% | 0 | - |
| N | 미매핑 | 3.37% | 0 (표본 89) | - |
| A2 | 무료진단 긴급감 | 0.98% | 0 | - |

평균 CPL n원 vs **C 단독 25K = 60% 절감 가능**. 리드 4건 중 3건이 C.

## 보류된 결정 (다음 세션 첫 액션)
- (가) C 단독 즉시 켜기 결정됨 → **일예산** (10K/17K/30K 중)? **작업방식** (메타 BM 직접 vs meta_ads.py)?
- D 즉시 폐기 / N 추가 검증 가치 있음 (89 노출에서 CTR 3.37%) / A·A2·B·F·H 폐기
- AD_SLOT_MAP에 D/F/H/N 매핑 추가 필요 (LMS 분기 정확화)
- 1주 운영 후 (나) "리뷰 삭제 후불 보장" 변주 카피 3종 신규 AB

## 같은 세션의 인접 발견
- 메타 webhook 4/27~5/3 SOLAPI 인입 0건 → META_ACCESS_TOKEN 갱신 + Vercel 재배포 + Page 객체 webhook 등록 완료
- 리드7(4/21 인입) 1건 SOLAPI에 RECOVERED 마크로 복구 등록
- Pluuug API 403 여전 (구독/권한 미해결) → 사용자가 Pluuug 콘솔에서 결제·API 활성화 직접 확인 필요

자세한 점검 보고서: `company-pipeline/reports/ad-audit-2026-04-29.md`
# GBP 진단 메타광고 (2026-04-19 배포)

## 상태
PAUSED. 최종 검토 후 사용자가 `python3 meta_ads.py resume <campaign_id>`로 라이브 전환.

## 핵심 ID
- **계정**: company (act_796091825714201)
- **Campaign**: `120246052297790249` [M] GBP_진단이벤트_AB8종_260419
- **AdSet**: `120246052298510249` 병원장타겟_인스턴트폼, 일 n원
- **Instant Form**: `1474113121058641` GBP 진단 무료신청
- **Ads Manager**: https://www.facebook.com/adsmanager/manage/campaigns?act=796091825714201&selected_campaign_ids=120246052297790249
- **배포 결과 JSON**: `company-pipeline/ads-assets/20260419-gbp-diagnosis/deploy_result.json`

## 8종 AB 라인업 (앵글 승자 찾기)
A(호기심 무료진단), A2(긴급감 78%), B(권한탈취), C(리뷰삭제 후불보장), D(키워드오판), F(사회적증거), H(실시간FOMO), N(돈계산기 n만원)

## 인스턴트폼 질문
병원명, 원장님 성함, 연락처, 지역(서울/경기/기타)
개인정보 URL: https://diagnostic.company.kr/privacy

## 파이프라인
리드 제출 → meta-leadgen.py 웹훅 → Google Places 자동 진단 → Solapi SMS 리포트 → Telegram 알림 → Supabase CRM

## 타겟팅
KR, 35-65세, 관심사: 구글 지도/마케팅/의과대학/디지털마케팅/온라인광고/마케팅서비스

## 이전 캠페인 (ARCHIVED)
서비스M_병원모집, 무료진단이벤트, 이미지소재_랜딩, 영상소재_랜딩 — 4개 ARCHIVED (resume 가능, 히스토리 보존)

## 렌더링 파이프라인 (Pencil MCP 우회)
Pencil MCP export_nodes 버그(노드 1개만 작동)로 인해 `ads-assets/pen_render.py` 자체 제작:
pen JSON → HTML → Chrome headless → PNG. `python3 pen_render.py <pen> <outdir> [ids...]`

## Why
서비스M 병원모집 완료. 구글 지도 상위노출 상품을 B2B(원장+실장) 타겟으로 전환. 이미 가동 중인 자동진단 파이프라인에 신규 캠페인 꽂음.

## How to apply
라이브 전환 전 사용자 최종 검토 필수. 라이브 후 3~5일 돌려서 CPL/CTR 상위 3~4종 압축 후 예산 집중.
