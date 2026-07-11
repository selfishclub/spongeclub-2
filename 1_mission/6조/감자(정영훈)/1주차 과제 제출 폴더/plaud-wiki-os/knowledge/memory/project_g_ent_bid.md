---
name: phase-1
description: "협업사 G엔터(대표, G엔터 담당자 컨택) 명의로 나라장터 입찰공고 자동 매칭 + 응찰 가능 판정 + LLM 점수화 + Notion 적재 시스템 Phase 1 완료"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0fff891-8a5d-408b-91a6-30e26b932c67
---

협업사 **주식회사 G엔터 (대표, 컨택 G엔터 담당자)** 의 공공 입찰 자동화 시스템. SNS 홍보대행·인플루언서·글로벌 마케팅 분야 응찰 가능 공고를 매일 09:00 자동 매칭하여 공유 Notion DB에 적재.

**프로젝트 폴더**: `/Users/user/Desktop/claude code/g-ent-bid/` (G엔터가 제공한 `g_ent_bid_cowork` 협업 SOP 폴더 + 자동화 scripts 통합)

**Phase 1·2 완료 (2026-05-17)**:
- Notion DB: `3637def7859f817f89dfcbb285d6f20f` (29 필드, Phase 2에서 4개 추가)
- Python 3.11 venv, **9개 lib 모듈** + 2개 entry point (poll_nara·analyze_rfp)
- **48 tests PASS** (TDD)
- LLM: Haiku=매칭+업종체크 / Sonnet=6-STEP 분석
- launchd `com.company.g-ent-bid-poll` 매일 09:00 (Phase 1)
- 업종 자동 매칭: 9902(광고대행)+9999(기타자유) G엔터 보유 코드와 RFP 요구 코드 LLM 추출 비교 → 자동 응찰가능/불가

**Phase 1·2 라이브 검증 통과**:
- Phase 1: Nara API URL 정정(BidPublicInfoService) + Notion 적재 1건 성공
- Phase 2: R26BK01527139(공주박물관 디지털콘텐츠 1.82억) → 응찰 불가 정확 판정 (업종 1469 미등록 + 도메인 불일치)
- 핫픽스 3건: max_tokens 4000→8000, macOS HFS+ NFD 경로 resolve, nara_api 직접 조회(전수 스캔 17분 → 수초)

**5천만 우선 정책 제거 (2026-05-17)**: R6 가점 폐기. LLM 프로필도 정정. 업종 자동 체크가 그 역할 대체.

**입찰 전략 방침 (G엔터 cowork `00_CLAUDE.md` 명시)**:
- 단독 정공법 (공동수급 거절)
- 5천만원 이하 사업 우선 (현 단계 capacity)
- 자동 제외: 단일건 5천만 실적 / 재무 3개년 / 3억 초과 / 공동수급 의무 / 직접생산확인증명서
- 특별 우선: 의료관광·외국인 관광·뷰티·여성·가족·육아·AI·디지털 전환

**Why:**
G엔터 SMS 캠페인 협업 이후 정부 입찰 시장 진입 자동화 협업. G엔터가 협업 SOP 폴더 전체(회사자산·제안서템플릿·playbook)를 제공했고, 우리 회사가 자동화 시스템 구축.

**How to apply:**
- G엔터 관련 작업 시 회사명 정확히 사용: **주식회사 G엔터 (G엔터)**, 대표
- G엔터 담당자은 컨택 포인트 (대표 X)
- 시스템 spec: `docs/superpowers/specs/2026-05-17-g-ent-bid-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-05-17-g-ent-bid-phase1.md`
- 평일 09:00 첫 자동 실행 후 `g-ent-bid/logs/poll/launchd.out` 확인
- Phase 2 (RFP 분석)·Phase 3 (HWP 변환)·Phase 4 (제안서 생성)·Phase 5 (dispatcher)는 후속 plan
