# GBP 키워드 준수 시스템 — 설계 스펙

> 최종 업데이트: 2026-04-04

## 문제

작업자가 GBP 업데이트 작성 시 타겟 키워드를 반영하지 않음.
키워드 기획(대표) → 작업자 전달 → 작업자 무시 → 키워드 빠진 포스트 게시.
수동 체크 불가능 (20개 병원 × 다수 키워드).

## 해결

시스템이 키워드를 강제하는 3단계 파이프라인:

1. **키워드 등록** — 병원별 타겟 키워드를 대시보드에서 관리
2. **초안 생성** — Gemini API가 키워드 + 병원 정보로 GBP 포스트 초안 자동 작성
3. **검증 차단** — 제출 시 키워드 구성 단어 포함 여부 체크, 미포함 시 차단

## 데이터 모델

### 신규 테이블: `target_keywords`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| client_id | uuid FK → clients | 병원 |
| keyword | text | 타겟 키워드 (예: "남산 벚꽃 맛집") |
| category | text | 분류 (seasonal, location, treatment 등) |
| is_active | boolean | 활성 여부 |
| start_date | date | 적용 시작일 (null = 무기한) |
| end_date | date | 적용 종료일 (null = 무기한) |
| created_at | timestamptz | |

### 신규 테이블: `update_keyword_assignments`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| update_id | uuid FK → gbp_updates | 업데이트 |
| keyword_id | uuid FK → target_keywords | 할당된 키워드 |
| is_compliant | boolean | 검증 통과 여부 |
| missing_tokens | jsonb | 누락된 단어 목록 |

### `gbp_updates` 확장

| 추가 컬럼 | 타입 | 설명 |
|-----------|------|------|
| keyword_compliance | text | 'pass' / 'fail' / null |
| generated_by_ai | boolean | AI 초안 여부 |

## 검증 로직

```
키워드: "남산 벚꽃 맛집"
→ 토큰화: ["남산", "벚꽃", "맛집"]
→ 본문에서 각 토큰 존재 여부 체크
→ 하나라도 없으면 fail + 누락 토큰 반환
```

- 공백 기준 split (한국어 형태소 분석 불필요 — 타겟 키워드가 이미 어절 단위)
- 대소문자 무시 (영어 키워드 대비)
- 제목 + 본문 합쳐서 체크

## AI 초안 생성

### 입력
- 타겟 키워드 목록
- 병원 정보 (name, address, category, keyTreatments, multilingualNames)

### 프롬프트 전략
```
당신은 병원 GBP 포스트 작성 전문가입니다.
다음 키워드를 자연스럽게 포함하는 GBP 업데이트를 작성하세요.

병원: {name}
주소: {address}
주요 시술: {keyTreatments}
타겟 키워드: {keywords}

요구사항:
- 각 키워드의 모든 구성 단어가 본문에 포함되어야 합니다
- 자연스러운 한국어 문장으로 작성
- 200-500자
- GBP 로컬 포스트 형식
```

### API
- Gemini API (사용자 보유 API 키)
- 엔드포인트: `/api/ai/generate-post`

## UI 설계

### 1. 키워드 관리 페이지 (`/dashboard/clients/[id]/keywords`)

- 키워드 목록 테이블 (키워드, 카테고리, 기간, 활성 상태)
- 추가/삭제/활성화 토글
- 카테고리 필터 (seasonal, location, treatment)

### 2. 업데이트 작성 다이얼로그 (기존 확장)

기존 "새 포스트 작성" 다이얼로그에 추가:
1. 키워드 선택 체크박스 (활성 키워드 목록에서 선택)
2. "AI 초안 생성" 버튼 → Gemini가 초안 작성 → textarea에 채움
3. 실시간 검증 표시 — 키워드별 pass/fail 뱃지
4. 전체 pass일 때만 "저장" 버튼 활성화

### 3. 준수율 표시 (기존 업데이트 목록에 추가)

- 각 업데이트 행에 키워드 준수 뱃지 (pass/fail)
- 헤더에 전체 준수율 %

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/keywords/targets?clientId=` | 병원별 타겟 키워드 목록 |
| POST | `/api/keywords/targets` | 키워드 추가 |
| PATCH | `/api/keywords/targets/[id]` | 키워드 수정 (활성화/비활성화) |
| DELETE | `/api/keywords/targets/[id]` | 키워드 삭제 |
| POST | `/api/ai/generate-post` | AI 초안 생성 |
| POST | `/api/keywords/validate` | 키워드 준수 검증 |

## 파일 구조

```
src/
├── db/schema/
│   ├── target-keywords.ts          # 신규
│   └── update-keyword-assignments.ts  # 신규
├── lib/
│   ├── keywords/
│   │   ├── compliance.ts           # 검증 로직
│   │   └── targets.ts              # 타겟 키워드 CRUD
│   └── ai/
│       └── generate-post.ts        # Gemini 초안 생성
├── app/
│   ├── api/
│   │   ├── keywords/targets/
│   │   │   ├── route.ts            # GET, POST
│   │   │   └── [id]/route.ts       # PATCH, DELETE
│   │   ├── ai/generate-post/
│   │   │   └── route.ts
│   │   └── keywords/validate/
│   │       └── route.ts
│   └── dashboard/clients/[id]/
│       └── keywords/
│           ├── page.tsx
│           └── keywords-client.tsx
```
