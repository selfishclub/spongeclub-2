# Pacemaker Dashboard Design Spec

## Overview

우리 회사 월 n원 목표 달성을 위한 페이스메이커 대시보드. 매일 업무를 기록하면 AI가 진척도를 평가하고 다음 액션을 제안한다.

## Decisions

- **위치**: `marketing-dashboard/src/app/pacemaker/` (기존 인프라 재활용)
- **입력**: 웹 폼 직접 입력
- **AI**: 일일 코멘트 (잘한 점 + 추천 액션)
- **레이아웃**: 올인원, 액션 중심형 (입력 폼이 최상단)

## Page Structure

### `/pacemaker` — 메인 페이지 (올인원)

**상단 — 업무일지 입력 폼**
- 텍스트 입력 (오늘 한 일, textarea)
- 카테고리 태그 선택: 영업 | 마케팅 | 운영 | 기획 | 기타
- 매출/계약 변동 입력 (선택, number)
- 저장 버튼 → AI 코멘트 자동 생성

**중단 — AI 일일 코멘트**
- 일지 저장 시 Google Generative AI로 분석 생성
- 포맷: "잘한 점 / 내일 추천 액션" 2-3줄
- 온톨로지 컨텍스트 (목표, 파이프라인 현황) 참조

**하단 — 진척도 대시보드**
- KPI 카드 3개: 목표 달성률(%), 현재 월 매출(₩), 활성 계약 수
- 최근 7일 업무 히스토리 리스트 (날짜, 카테고리, 요약)
- 월별 매출 추이 라인 차트 (Recharts)

## Database Schema

테이블 접두어: `pac_`, 기존 Supabase PostgreSQL 사용.

### pac_journals
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| date | date | 업무일 |
| content | text | 업무 내용 |
| category | text | 영업/마케팅/운영/기획/기타 |
| revenue_delta | integer | 매출 변동 (원, nullable) |
| contracts_delta | integer | 계약 수 변동 (nullable) |
| created_at | timestamp | 생성 시각 |

### pac_ai_comments
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| journal_id | uuid | FK → pac_journals |
| comment | text | AI 생성 코멘트 |
| created_at | timestamp | 생성 시각 |

### pac_goals
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| target_revenue | integer | 목표 매출 (원) |
| target_date | date | 목표 달성일 |
| current_revenue | integer | 현재 매출 |
| current_contracts | integer | 현재 계약 수 |
| updated_at | timestamp | 마지막 업데이트 |

### pac_monthly_stats
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| year_month | text | YYYY-MM |
| revenue | integer | 월 매출 |
| contracts | integer | 계약 수 |
| entries_count | integer | 일지 기록 수 |

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/pacemaker/journal | 일지 저장 |
| GET | /api/pacemaker/journal | 일지 목록 조회 (최근 30일) |
| POST | /api/pacemaker/ai-comment | AI 코멘트 생성 |
| GET | /api/pacemaker/stats | KPI/진척도 조회 |
| PUT | /api/pacemaker/goals | 목표 수정 |

## Tech Stack

기존 marketing-dashboard 인프라 그대로 사용:
- Next.js 16 (App Router)
- Drizzle ORM + Supabase PostgreSQL
- shadcn/ui + Tailwind CSS
- Recharts (차트)
- Google Generative AI (AI 코멘트)
- Zod (입력 검증)

## AI Prompt Strategy

업무일지 + 현재 목표 데이터를 컨텍스트로 전달:

```
당신은 우리 회사의 페이스메이커입니다.
목표: 월 매출 n원 (현재: {current_revenue}원, 달성률: {percentage}%)
활성 계약: {contracts}개, 필요 추가 계약: {needed}개

오늘의 업무일지:
{journal_content}
카테고리: {category}

2-3문장으로 평가해주세요:
1. 오늘 잘한 점 (목표 달성에 기여한 부분)
2. 내일 추천 액션 (구체적이고 실행 가능한 것)
```

## Out of Scope (v1)

- 메신저(텔레그램/iMessage) 연동 입력
- 주간/월간 리포트
- 팀원 관리
- 외부 데이터 자동 동기화 (pluuug, Granter)
