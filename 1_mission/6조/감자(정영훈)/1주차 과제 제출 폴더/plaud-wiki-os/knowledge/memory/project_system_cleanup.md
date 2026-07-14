---
name: 시스템 청소 (2026-04-19)
description: 7개 프로젝트 archived-projects로 이동, cold-check.py Supabase 직접 호출로 재작성, cron 이전
type: project
originSessionId: c5a86f76-507a-40a3-a44a-b6a6a7138a15
---
# 청소 이력 2026-04-19

## 아카이브된 프로젝트 (archived-projects/)
- meta-ads, company-proposal, public-corp-guide, engine-sdk (빈 스켈레톤)
- gbp-local, file-organizer, company-homepage (스테일 2주+)

## 유지 결정
- **멘토K봇** — 뉴오더 세션 저장소 역할로 유지 (sync 실패 중이나 재개 미정)
- ops-agent, 멘토K봇 sync launchd plist는 그대로 둠

## cold-check.py 이전
- 기존: Pluuug 시대 `/api/crm/stages`, `/api/crm/inquiries` 호출 — API 삭제돼 작동 불능
- 변경: Supabase REST API 직접 호출 (`/rest/v1/crm_stages`, `/rest/v1/crm_inquiries`)
- 각 stage의 `stale_days` 컬럼 기준으로 콜드 판정 (하드코딩 테이블 제거)
- launchd → cron 이전 (Desktop 접근 권한 문제 회피)
  - cron: `0 8 * * * cd ... && /Library/Frameworks/.../python3 cold-check.py`

## Supabase env 복사
- company-landing 의 Vercel production env → company-pipeline/.env로 이동
- SUPABASE_URL, SUPABASE_SERVICE_KEY

## Why
Meta 8종 라이브 직전 시스템 청소로 이후 리드 쌓일 때 CRM 지저분해지지 않도록.

## How to apply
청소 재확인 시점: 2026-04-22 (3일 후) 또는 스테일 프로젝트 2주+ 쌓이면.

---

# 청소 이력 2026-05-07 (좀비 자동화 솎아내기)

## 배경
사용자 피드백: "메모리에 '구현 완료'로 박힌 자동화 대부분 안 돌아감. 쓸 수 있는 건 GBP SOP뿐". 좀비 자동화가 누적된 상태에서 새 기능 추가 중단하고 솎아내기 단행.

## 정리 결과 (launchd 14개 → 3개)

### archive된 launchd plist (`~/Library/LaunchAgents/_archived_2026-05-07/`)
- C그룹 (정체불명, 사용자가 모름): com.company.{ping-check, daily-pings, ad-report, daily-journal, journal-reminder}
- 미로드 잔여: com.claude.{prompt-weekly-analysis, prompt-work-journal}
- 폐기 표시 명시: com.company.orchestrator.plist.deprecated, com.company.gbp-dashboard
- B그룹 (충돌 정리): com.company.pipeline (webhook-server.py — Vercel master로 이전됨), com.company.daily-expense (crontab과 9시 이중 발송 → launchd만 죽임, crontab 9:03 유지)

### 좀비 프로세스 kill
- bun imessage 플러그인 인스턴스 8개 (4/29~5/5 누적)
- webhook-server.py (PID 1607)

### 폴더 archive (`Desktop/claude code/archived-projects/`)
- g-ent-sms-0424/ — 일회성 캠페인 4/24 발송 완료 후 좀비
- company-orchestrator-deprecated-2026-05-03/ — 사용자가 5/3 DEPRECATED 선언, launchd 미등록·프로세스 0·로그 0인 박물관 상태였음

## 살아남은 자동화
- launchd: ops-agent (LocalFalcon 대체용 보존), yt-leads-poller, imessage-listener
- crontab: daily-automation 4종 (5분 핑/6:01/9:03/22:17), appt-reminder 15분, recall-index 03:00
- Vercel: company-landing webhook (메타·구글 광고·카카오), gbp-dashboard ads-daily-report (gbp-dashboard 폐기로 비활성 가능 — 추가 점검 대상)

## 메모리 거짓말 정정
- imessage 리스너: "launchd 불가" → 실제 launchd로 4/12부터 가동
- daily-automation: "비활성화, orchestrator 대체" → 실제 crontab으로 가동
- ops-agent: "폐기, orchestrator 대체" → orchestrator가 오히려 폐기. ops-agent는 활성

## 핵심 교훈
사용자가 자동화 가시성 0인 상태(검증 불가). 메모리에 "구현 완료" 적혀도 1주 뒤엔 죽었는지 모름. 다음 단계: PostToolUse/Stop hook으로 학습·검증 트리거 강제 + CLAUDE.md에 "검증 불가 산출물 금지" 명시.

---

# 청소 이력 2026-05-10 (hermes 도입 검증 사전 정리)

## 배경
사용자 인용: "지금 내가 클로드코드로 만든 자동화, sop 등 중에 제대로 돌아가는게 하나도 없어. 그나마 있는게 구글 키워드 뽑는 sop 정도야." hermes agent 자가발전 시스템 검증 전 깨진 인프라부터 정리.

## 분석 결과 (3-agent 병렬)
- prompt 로그 4주 1,292건 분석 → SOP 후보 5개 도출
- 자동화 폴더 9개 healthcheck → 진짜 가동 4개, 죽음 5개
- 작동 SOP 1개 구조 분석 → DNA 3개 (실행 가능 형식 / 외부 의존 최소화 / 케이스 기반 진화)

## 폐기 처리 3건
1. **daily-automation.py cron 4개 라인 제거** — 매 5분 `ModuleNotFoundError: dotenv` 3주 누적. crontab 백업 `/tmp/crontab-backup-2026-05-10.txt`
2. **company-yt-leads-poller** — solapi_client 모듈 풀려 launchd exit 78. archived-projects/company-yt-leads-deprecated-2026-05-10/
3. **ops-agent** — Supabase ops_commands 폴링 데몬, 명령 클라이언트 사라져 3일 좀비. archived-projects/ops-agent-deprecated-2026-05-10/

## 보안 미해결
ops-agent plist에 Supabase service key 평문 노출 ([노출된 키]). 키 회수 + 다른 곳 사용 여부 grep 필요. archive에 plist째 보존되어 디스크에 평문 잔존.

## 산출물
`hermes/` 폴더 신규 생성:
- README.md — 도입 검증 가이드
- 00_폐기조치_2026-05-10.md — 이번 청소 기록 + 롤백 가이드
- 01_진단보고서.md — 자동화 inventory + 6대 실패 패턴
- 02_SOP템플릿.md — 작동 SOP DNA → 표준 템플릿
- candidates/01~05 — SOP 후보 5개 (외부톤게이트 ★★★★★, Pencil인계 ★★★★★, 거래처응대, 주간리포트, 광고라이프사이클)

## 살아남은 자동화 (재확인)
- launchd: imessage-listener (yt-leads와 ops-agent 죽고 나니 1개만 남음)
- crontab: appt-reminder 15분, recall-index 03:00, 그리고 daily-automation 빠진 자리에 다른 것 (work-journal, expense-report 등은 다 daily-automation.py 호출이라 같이 사라짐)
- Vercel: company-landing webhook
- MCP: pluuug-mcp (호출 시 spin-up)

---

# 청소 이력 2026-07-05 (스킬 정리 — "덜어내기" 방향 전환)

## 배경
사용자 인용: "지금 클로드코드 시스템이 너무 복잡하고 쓸데없는게 많아. 지금 내게 중요한건 덜어내는거야. 뭔가를 더 넣는게 아니라." — [[project_knowledge_wiki]] 만들다 고립 노드 75·끊긴 링크 56 보고 지식/시스템 부채 자각.

## 정리 결과 (스킬 130 → 15)
- 백업 위치: `~/.claude/skills-archive-20260705/` (115개, 삭제 아님 — mv로 복원 가능)
- 남긴 15개: korean-marketing-copy, selling-copywriting, reels-script, ceo-review, docx, pdf, pptx, xlsx, frontend-design, system-cleanup, design-audit, perf-benchmark, webapp-testing, security-review, skill-creator
- 아카이브에 포함: superpowers 플러그인과 중복이던 로컬 사본 14개(brainstorming, writing-plans 등 — 플러그인 버전은 그대로 동작), 언어별 개발스킬(cpp/go/rust/kotlin류), 인프라 패턴류, 미사용 잡스킬
- tasks/skill-usage-log.md는 기록 0인 껍데기였음 (사용 데이터 없어서 업무 기준으로 분류)

## 보류된 청소 (사용자가 스킬만 승인)
- rules/ 언어폴더 11종(cpp·perl 등) 정리 — 미승인, 다음 청소 후보
- 루트 38폴더 아카이브 후보 목록 — 미승인, 다음 청소 후보

## 관련 방향 전환
같은 날 knowledge-wiki v2에서 액션추출+텔레그램(더하기 기능)은 보류, 노드 숨기기/녹음 삭제(덜어내기 도구)만 완료하기로.
