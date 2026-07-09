> DEPRECATED 2026-05-03 — gbp-dashboard 폐기. 이 문서는 아카이브 이력용으로 보존.

# GBP 운영 대시보드 — 설계 스펙

**작성일**: 2026-03-31  
**프로젝트**: gbp-dashboard  
**목적**: 외부(다른 맥북)에서도 GBP 자동화 운영 상태를 확인하고 조치할 수 있는 운영 기능 4종 추가

---

## 1. 현재 상태

- **구현 완료**: Next.js 15 + Supabase 기반 대시보드 V2 (병원 관리, 리뷰 모니터링, 랭킹 히트맵, PPT 보고서, 경쟁사, 키워드 리서치, 포탈)
- **자동화 파이프라인 완료**: DataForSEO 스캔 → Notion 업데이트 → PPT 생성 → 텔레그램 전송
- **문제**: 운영 상태 확인을 위해 텔레그램 또는 서버 맥에 직접 접속해야 함

---

## 2. 추가 목표

| 기능 | 경로 | 설명 |
|------|------|------|
| 스캔 대시보드 | `/dashboard/scans` | 스캔 이력, 비용 트래커, 수동 스캔 |
| 알림 센터 | `/dashboard/alerts` | 순위 하락·악성 리뷰·실패 알림 + 조치 |
| 비용 트래커 | 스캔 대시보드 내 | DataForSEO 잔액 + 월별 누적 차트 |
| 빠른 조치 | 각 페이지 인라인 | 수동 스캔·PPT 재생성 → 서버 맥 원격 실행 |

텔레그램 알림을 알림 센터(DB 기록 + 대시보드 UI)로 대체한다.

---

## 3. DB 변경

### 3-1. 신규 테이블: `scan_runs`

```sql
create table scan_runs (
  id             serial primary key,
  hospital_name  text not null,
  keywords_count int,
  success_count  int,
  fail_count     int,
  cost_usd       numeric(8,4),
  avg_rank       numeric(4,2),
  top3_pct       numeric(5,2),
  triggered_by   text default 'schedule',  -- 'schedule' | 'manual'
  error_message  text,
  started_at     timestamptz not null,
  completed_at   timestamptz,
  created_at     timestamptz default now()
);
```

### 3-2. 신규 테이블: `ops_commands`

```sql
create table ops_commands (
  id          serial primary key,
  command     text not null,          -- 'scan' | 'report' | 'restart'
  params      jsonb default '{}',
  status      text default 'pending', -- 'pending' | 'running' | 'done' | 'failed'
  result      jsonb,
  created_at  timestamptz default now(),
  executed_at timestamptz
);
```

### 3-3. 기존 테이블 수정: `notification_log`

추가 컬럼:
- `read_at timestamptz` — 읽음 처리 시각
- `action_taken text` — 처리한 조치 내용

> **Drizzle 동기화 필수**: `notification_log`는 Drizzle ORM 스키마(`db/schema/notification-log.ts`)에 정의됨 (PK는 UUID). SQL 마이그레이션과 함께 Drizzle 스키마 파일도 수정 → `drizzle-kit generate` → `drizzle-kit push` 절차 필요.

### 3-4. 알림 타입 확장

기존 `notification_log`의 `type` 컬럼에 새 이벤트 추가:
- `rank_drop` — 순위 하락 감지
- `scan_failed` — 스캔 실행 실패
- `balance_low` — DataForSEO 잔액 부족

기존 알림 UI(`alerts-page-client.tsx`)에서 `bad_review`, `review_deleted`, `sync_summary`만 처리 중 → 위 3개 타입 핸들러 추가 필요.

`channel` 컬럼: 기존 기본값 `'telegram'` → 새 알림은 `'dashboard'`로 기록. 향후 텔레그램 완전 제거 시 필터로 활용.

---

## 4. 아키텍처

```
[Vercel 대시보드]                [Supabase]              [서버 맥]
  /dashboard/scans  ←→  GET /api/scans  ←→  scan_runs
  /dashboard/alerts ←→  GET /api/alerts ←→  notification_log
  수동 스캔 버튼     →  POST /api/ops/scan → ops_commands (pending)
  PPT 재생성 버튼   →  POST /api/ops/report → ops_commands (pending)
                                                ↑ 30초 폴링
                                          ops-agent.py (launchd)
                                          → 로컬 스크립트 실행
                                          → ops_commands.result 기록
                                          → scan_runs / notification_log 갱신
```

### 핵심 흐름

1. **수동 스캔 요청**: 대시보드 버튼 → `POST /api/ops/scan` → `ops_commands`에 `pending` 레코드 생성
2. **서버 맥 에이전트**: 30초마다 `ops_commands` 폴링 → `pending` 발견 시 원자적으로 `status = 'running'` 업데이트 (`UPDATE ... WHERE status = 'pending' RETURNING *`) → 로컬 스크립트 실행 → `done/failed` 갱신, `result` 기록. 원자적 업데이트로 에이전트 재시작 시 중복 실행 방지.
3. **스캔 완료**: `scan_runs`에 결과 기록, 순위 하락 감지 시 `notification_log`에 알림 기록
4. **대시보드 확인**: 알림 센터에서 조치 버튼으로 읽음 처리 또는 상세 이동

---

## 5. API Routes (신규)

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/ops/scan` | 수동 스캔 명령 생성 (ops_commands) |
| `POST` | `/api/ops/report` | PPT 재생성 명령 생성 (ops_commands) |
| `GET` | `/api/alerts` | 알림 목록 조회 (notification_log) |
| `PATCH` | `/api/alerts/[id]` | 알림 읽음 처리 |
| `GET` | `/api/scans` | 스캔 이력 조회 (scan_runs) |
| `GET` | `/api/scans/balance` | DataForSEO 잔액 조회 (5분 캐시) |

---

## 6. 페이지 상세

### `/dashboard/scans`

- 마지막 스캔 시각, 전체 성공/실패 수
- 병원별 스캔 이력 테이블 (최근 30일)
- DataForSEO 잔액 카드 + 월별 누적 비용 차트
- 수동 스캔 버튼: 병원 선택 → 명령 생성 → 진행 상태 폴링

### `/dashboard/alerts`

- 알림 목록 (타입 필터: 순위 하락 / 악성 리뷰 / 스캔 실패 / 잔액 부족)
- 미읽음 알림 배지 (기존 네비게이션에 추가)
- 알림별 조치 버튼:
  - 순위 하락 → 해당 병원 랭킹 상세 페이지로 이동
  - 스캔 실패 → 수동 재실행
  - 악성 리뷰 → 리뷰 모니터링 페이지로 이동
  - 잔액 부족 → 잔액 충전 안내 링크

---

## 7. 서버 맥 에이전트 (`ops-agent.py`)

- **역할**: `ops_commands` 폴링 → 명령 실행 → 결과 기록
- **폴링 간격**: 30초
- **실행 방법**: launchd plist 등록, 상시 실행
- **처리 명령 종류**:
  - `scan` — `scan-all.ts` 실행 (병원명 파라미터)
  - `report` — PPT 생성 스크립트 실행
  - `restart` — 에이전트 재시작
- **에러 처리**: 실패 시 `ops_commands.status = 'failed'`, 에러 내용 `result`에 기록

### `scan-all.ts` 수정 사항

- 실행 시작 시 `scan_runs` 레코드 생성 (`started_at`)
- 완료 시 `completed_at`, `success_count`, `fail_count`, `cost_usd` 업데이트
- 이전 순위 대비 하락 감지 시 `notification_log`에 알림 기록

---

## 8. 제약 조건

| 항목 | 제약 | 대응 |
|------|------|------|
| Supabase Free | DB 500MB, 50K rows | scan_runs 90일 초과 레코드 자동 삭제 |
| Vercel Free | 서버리스 함수 10초 제한 | 스캔 자체는 서버 맥에서 실행, Vercel은 명령 생성만 |
| 인증 | 1인 사용 | 기존 admin password 방식 유지 |

---

## 9. Phase 로드맵

### Phase 1: 운영 기반 (이번 구현)
스캔 이력 + 알림 센터 + 비용 트래커 + 빠른 조치

1. DB 마이그레이션 (`scan_runs`, `ops_commands` 신규 + `notification_log` 컬럼 추가 + Drizzle 스키마 동기화)
2. `scan-all.ts` 수정 (scan_runs 기록, 순위 하락/잔액 부족 알림 기록, channel='dashboard')
3. API routes 구현 (6개, 잔액 조회는 5분 캐시)
4. `/dashboard/scans` 페이지
5. `/dashboard/alerts` 페이지 개선 (rank_drop/scan_failed/balance_low 타입 추가 + 네비게이션 배지)
6. `ops-agent.py` 구현 + launchd 등록 (원자적 명령 수령)
7. 통합 테스트 (수동 스캔 → 서버 맥 실행 → 대시보드 결과 확인)

### Phase 2: 악성 리뷰 AI 대응 (Phase 1 완료 후)
- 알림 센터에서 악성 리뷰 본문 직접 표시 (GBP API 리뷰 데이터 연동)
- AI 답글 초안 자동 생성 (Gemini Flash 활용, 병원 톤/스타일 반영)
- 답글 승인 → GBP API로 직접 게시 또는 클립보드 복사

### Phase 3: AEO 업데이트 제안 (Phase 2 완료 후)
- 병원별 SNS 채널 URL 등록 (인스타, 블로그 등)
- AI가 SNS 크롤링 → GBP 포스팅 초안 생성 (AEO 스키마 최적화)
- 수동 입력 모드: SNS 콘텐츠 붙여넣기 → GBP 포스팅 형태로 변환
- 포스팅 승인 → GBP API로 게시
