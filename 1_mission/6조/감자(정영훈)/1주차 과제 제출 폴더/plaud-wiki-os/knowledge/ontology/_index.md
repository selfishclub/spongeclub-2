---
tags:
  - 우리회사
  - 인덱스
---
# 우리 회사 & 나 온톨로지

> 우리 회사의 모든 사업 지식이 축적되는 곳.
> AI가 이 온톨로지를 읽으면 우리 회사처럼 생각하고, 신규 인원이 읽으면 바로 일할 수 있다.

## 지상과제

**연매출 n억 달성** (현재 ~n만원/월 → n억원/월)

## 도메인 맵

| 도메인 | 핵심 파일 | 핵심 질문 |
|--------|----------|----------|
| 운영 | [[processes]], [[tools]], [[daily-journal]] | "우리는 매일 어떻게 일하는가?" |
| 영업 | [[pricing]], [[scripts]], [[pipeline]] | "어떻게 계약을 따는가?" |
| 마케팅 | [[self-marketing]], [[content-style]], [[client-playbook]] | "고객과 우리 자신을 어떻게 알리는가?" |
| 재무 | [[monthly-report]], [[cashflow-rules]] | "돈이 어디서 오고 어디로 가는가?" |
| 고객 | [[retention]], [[case-studies]], [[meeting-notes]], [[performance]] | "고객을 어떻게 유지하고 키우는가?" |
| 사람 | [[team]], [[onboarding]] | "누가 무엇을 하고, 새 사람은 어떻게 합류하는가?" |
| 성장 | [[milestones]], [[experiments]] | "1억까지 무엇이 남았고, 무엇을 배웠는가?" |
| 멘토 | [[mentor-k-sales]], [[mentor-k-marketing]], [[mentor-k-money]], [[mentor-k-mindset]], [[mentor-k-systems]], [[mentor-k-people]], [[mentor-k-growth]] | "멘토K가 가르친 원칙은 무엇인가?" |
| 브랜드 | [[brand/README]], [[brand/palette]] | "우리 로고/컬러 정체성은 무엇인가?" |

## 자동 업데이트 소스

| 소스 | 대상 | 주기 |
|------|------|------|
| daily-automation.py 업무일지 | operations/daily-journal.md | 매일 22:17 |
| 그랜터 API 지출 | finance/monthly-report.md | 매일 09:03 |
| pluuug API | sales/pipeline.md | 매일 09:10 (orchestrator, HMAC 서명 추가됨) |
| gbp-local 스캔 | clients/performance.md | 매주 월 07:00 (orchestrator) |
| 멘토K봇 sync | mentor/*.md | 중단 (IP차단) |
| 세션 대화 | 각 도메인 | 대화 중 수시 |

## 사용 규칙

1. 사업 질문을 받으면 **해당 도메인 파일을 먼저 읽어라**
2. 여러 도메인에 걸치면 관련 파일 모두 참고
3. 온톨로지 원칙과 현재 재무 데이터가 충돌하면 **재무 데이터(현실) 우선**
4. 새로운 원칙/인사이트 발견 시 해당 도메인에 즉시 추가
5. 출처(날짜, 대화, 데이터)를 반드시 기록
