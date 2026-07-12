---
name: 메타 광고 자동화
description: Meta Marketing API 연동 — 오케스트레이터 통합, 코드 안정화 완료 (2026-04-03)
type: project
originSessionId: fd3ffdbc-0543-44cb-84c9-d12a1c94182a
---
Meta Marketing API 연동 완료. 오케스트레이터로 통합 운영 중.

**구성:**
- `company-pipeline/meta_ads.py` — 성과 조회 (urllib + 재시도 로직, 2026-04-03 안정화)
- `company-pipeline/ad_creative.py` — 11종 이미지 생성 + 배포 (폰트 환경변수화 완료)
- `company-pipeline/.meta_token` — Meta API 토큰
- 광고 계정: `act_796091825714201`
- **현재 webhook master**: company-landing(Vercel)이 처리. 로컬 `webhook-server.py`는 2026-05-07 archive (launchd 폐기, 의존성 점검에서 import 0건 확인)
- ~~오케스트레이터(`ops-agent`)가 09:05 아침 브리핑~~ → orchestrator는 5/3 DEPRECATED, 5/7 archive 처리

**레거시 정정 (2026-05-07):** daily-automation.py는 실제론 crontab으로 가동 중 (5분 핑/9:03 지출/22:17 일지). 이전 메모리 "비활성화" 거짓.

**paid-ads 스킬:** `.claude/skills/paid-ads/` 설치됨 (2026-04-03). 광고 전략 논의 시 참조.

**Why:** 메타 광고 성과 실시간 확인 + 리드 자동 CRM 등록.
**How to apply:** "광고 성과 어때?" → `meta_ads.py report` 실행.
