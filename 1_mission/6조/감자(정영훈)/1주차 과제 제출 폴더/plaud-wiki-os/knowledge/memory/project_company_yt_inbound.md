---
name: 우리 회사 유튜브 광고 인입 자동 응대 (폐기 2026-05-10)
description: yt-leads-poller launchd 폐기. solapi_client 모듈 풀려 죽은 상태 3주 방치되다 2026-05-10 archive. hermes SOP 03(거래처응대)이 후속 대체.
type: project
originSessionId: 3268c2a1-fba1-4a25-9bc9-11ad9ac6fbcc
---
**현재 상태: 폐기됨 (2026-05-10).**

`archived-projects/company-yt-leads-deprecated-2026-05-10/`에 폴더+plist 보존. 롤백 가이드는 `hermes/00_폐기조치_2026-05-10.md` 참조.

**폐기 사유:** `solapi_client` 모듈 의존성 풀림 → launchd LastExitStatus 19968(=78). 사용자 인지 못한 채 3주 방치. hermes 도입 검증 과정에서 발견.

**대체:** hermes/candidates/03_거래처응대.md (httpx 직접 호출로 의존성 가볍게 재구현 예정).

---

# 이하는 폐기 전 historical 기록 (참고용)

우리 회사 자체 유튜브 광고 인입 lead를 Google Sheets에서 매시간 폴링하여 자동으로 LMS 응답 + 카카오채널 유도하는 시스템.

**Why:**
유튜브 광고로 들어온 리드는 G엔터 협업 캠페인과 분리해서 우리 회사 직접 관리. 통화 어려운 시점에도 메시지로 첫 응대를 자동화하고 카카오채널 1:1 상담으로 자연스럽게 이전.

**구성 요소:**
- 작업 폴더: `~/Desktop/claude code/company-yt-leads/`
- Google Sheets: [시트ID] (광고 lead 마스터)
- 발신: 우리 회사 대표 명의 ([연락처]), SOLAPI LMS
- 카카오채널: `http://pf.kakao.com/_Dxidin/chat`
- launchd: `com.company.yt-leads-poller`, 매일 10:00~20:00 매시간 (KST)
- 카피 템플릿: `scripts/templates.py` (회사명 → 카테고리 자동 분류, 호칭 "원장님" 통일)
- 상태 저장: `data/state.json` (seen_lead_ids, blacklist_lead_ids)
- 알림 채널: macOS notification + iMessage self-chat + alerts.log

**알림톡 검수 시도 결과 (2026-04-28):**
- 템플릿 등록 → 카카오 검수 즉시 반려
- 사유: "채널 추가" 안내 자체가 광고성 문구로 분류 (2018년 정책 변경)
- 알림톡으로 카카오채널 유도 원천 불가 → 알림톡 포기, LMS 단독 운영
- 거부된 템플릿 `KA01TP260428064816059dOEr29mMUQ3` 삭제 완료

**첫 발송 (2026-04-28 14:46):**
- 4명 (리드1/피부과, 리드2/리드업체1, 리드3/리드업체2, 리드4/리드업체3)
- Group `G4V20260428144616HL21HVYUD9SBW4G`, 4/4 등록 성공, 183원

**How to apply:**
- 신규 인입은 자동 처리됨 — 사용자 개입 불필요
- 어뷰징 자동 감지 (이름/회사 너무 짧거나 폰번호 1111111 시작 등)
- 회사명 키워드로 카테고리 자동 분류 (피부과/성형/치과/한의원 등 14종, 미매칭 시 회사명 그대로)
- 야간(20시 이후~익일 10시 전) 인입은 다음날 10시에 발송 (정통망법 21~익일 8시 발송 금지 회피)
- launchd 상태 점검: `launchctl list | grep company.yt`
- 수동 실행: `python3 scripts/poll_new_leads.py [--dry-run]`
- 처리 결과 알림: macOS notification + iMessage self-chat (`[연락처]`)
- alerts.log: `logs/alerts.log` (모든 알림 기록)

**카카오채널 1:1 상담 전환 후 처리:**
첫 LMS 발송 후 카카오채널 친구로 추가하면 거기서부터는 사용자 직접 1:1 응대 (자동화 X).
