# Content Engine — LinkedIn + 뉴스레터 자동화 파이프라인

## 개요

릴스 스크립트 1개를 입력하면 LinkedIn 포스트(풀 자동) + 뉴스레터 초안(반자동)으로 변환하는 독립 콘텐츠 엔진.

**포지셔닝:** "마케팅 × AI 자동화" 전문가 → 넓은 유입 → 병원마케팅으로 전환

## 퍼널 구조

```
[발견]                          [너처링]            [전환]
릴스 (얼굴, 수동)        ──┐
LinkedIn (텍스트, 자동)   ──┼──→  뉴스레터 (반자동)  ──→  상담 신청
X (짧은글, 자동, 추후)   ──┘
```

- LinkedIn: 짧은 인사이트 (300-500자), 주 3-5회, 풀 자동
- 뉴스레터: 딥다이브 (1500-2000자), 주 1회, 반자동 (초안 자동 → 승인 후 발행)

## 아키텍처

```
[입력]
릴스 스크립트 (.md 파일 드롭 or iMessage/Telegram 전송)
    ↓
[content-engine/]
    transformer.py  ← Claude API로 채널별 변환
        ├── LinkedIn 포스트 (300-500자, 인사이트형)
        └── 뉴스레터 블록 (소재 축적용)
    ↓
    linkedin.py     ← LinkedIn API로 즉시 발행
    newsletter.py   ← 주 1회: 축적된 소재 → Beehiiv 초안 → 텔레그램 알림 → 확인 후 발행
    ↓
[오케스트레이터 연동]
    ops-agent APScheduler에 잡 추가 (새 데몬 불필요)

[데이터]
    content-engine/data/
        scripts/       ← 릴스 스크립트 원본
        linkedin/      ← 발행 이력 (JSONL)
        newsletter/    ← 소재 축적 + 발행 이력 (JSONL)
```

## 콘텐츠 변환 로직

### 변환 흐름

```
릴스 스크립트 입력
    ↓
메타데이터 추출 (주제, 키워드, 핵심 메시지)
    ↓
채널별 프롬프트로 변환
    ├── LinkedIn: 전문가 톤, 훅→인사이트→CTA, 300-500자
    └── Newsletter 블록: 사례 중심, 실전 디테일, 태그 부여
```

### LinkedIn 포스트 구조

```
[훅] — 스크롤 멈추게 하는 첫 줄
[인사이트] — 릴스 핵심 메시지를 텍스트로 풀어쓰기
[사례/수치] — 구체적 근거
[CTA] — "이런 경험 있으신가요?" 또는 뉴스레터 구독 유도
```

### 뉴스레터 소재 블록

```json
{
  "source_script": "2026-04-06-ai-ad-cost.md",
  "topic": "AI로 광고비 절감",
  "tags": ["ai", "ads", "cost"],
  "linkedin_summary": "...",
  "deep_dive_draft": "실제 세팅 과정, 수치, 실패담 포함 1500-2000자",
  "created_at": "2026-04-06",
  "used_in_newsletter": null
}
```

주 1회 뉴스레터 빌드 시, `used_in_newsletter`가 null인 블록 중 3-4개를 엮어서 초안 생성.

### 모델 라우팅

- 변환: Sonnet (일반 구현)
- 뉴스레터 최종 편집: Opus (톤/퀄리티 중요)

## API 연동

### LinkedIn API

- OAuth 2.0 (3-legged) 인증
- `POST /ugc/posts` — 포스트 발행
- 초기 토큰 발급 수동 1회, 이후 refresh token 자동 갱신 (유효기간 60일)
- refresh token 만료일을 `.env` 또는 `data/linkedin/token.json`에 저장
- 만료 7일 전 텔레그램 경고 → 재인증 URL 전송
- 재인증 실패 시 발행 큐 일시정지 + 텔레그램 알림
- 이미지 첨부: 선택적 (릴스 썸네일 활용 가능)

### Beehiiv API

- API key 인증
- `POST /publications/{publication_id}/posts` — 초안 생성 (status: draft)
- `PUT /publications/{publication_id}/posts/{post_id}` — 승인 후 발행 (status: published)
- `POST /publications/{publication_id}/subscriptions` — LinkedIn CTA 유입 구독자 등록
- 참고: 구현 시 Beehiiv 공식 API 문서(https://developers.beehiiv.com)에서 최신 엔드포인트 재확인 필수

## 스케줄

기존 `ops-agent` APScheduler에 잡 추가:

| 시간 | 잡 | 동작 |
|------|-----|------|
| 5분 간격 | `watch_scripts` | `data/scripts/` 폴링 → 새 .md 파일 발견 시 변환 트리거 (처리 완료된 파일은 `data/scripts/processed/`로 이동) |
| 평일 10:00 | `publish_linkedin` | 대기 중인 LinkedIn 포스트 1개 발행. 큐 비어있으면 skip (무알림). |
| 금요일 14:00 | `build_newsletter` | 주간 소재 엮어 Beehiiv 초안 → 텔레그램 알림 |
| 텔레그램 승인 시 | `send_newsletter` | Beehiiv 발행 |
| 매일 09:00 | `check_linkedin_token` | refresh token 만료일 확인 → 7일 이내면 텔레그램 경고 |

**발행 빈도:** 평일만 발행 = 주 최대 5회. 릴스 스크립트 투입량에 따라 자연스럽게 주 3-5회 조절. 큐가 비면 발행하지 않음.

**파일 감지 방식:** APScheduler interval(5분) 폴링. watchdog 대비 단순하고, 스크립트 투입 빈도(일 1-2회)에 충분.

### 텔레그램 승인 플로우

기존 ops-agent 텔레그램 봇에 명령어 추가 (별도 봇 인스턴스 불필요):
- `/뉴스레터발행` — 최신 초안 Beehiiv 발행
- `/뉴스레터수정 [피드백]` — 피드백 반영 후 초안 재생성

```
[금요일 14:00] 봇 → "이번 주 뉴스레터 초안입니다: [미리보기 링크]"
                     "/뉴스레터발행 으로 발행, /뉴스레터수정 [피드백]으로 수정"
사용자 → /뉴스레터발행 or /뉴스레터수정 CTA 더 강하게
봇 → 발행 or 수정 후 재전송
```

## 파일 구조

```
content-engine/
├── src/
│   ├── transformer.py      # 스크립트 → 채널별 변환
│   ├── linkedin.py         # LinkedIn API 발행/토큰 관리
│   ├── newsletter.py       # Beehiiv API 초안/발행
│   ├── watcher.py          # 새 스크립트 파일 감지
│   └── config.py           # 환경변수, 프롬프트 템플릿
├── data/
│   ├── scripts/            # 릴스 스크립트 원본 (.md)
│   ├── linkedin/           # 발행 이력 (JSONL)
│   └── newsletter/         # 소재 블록 + 발행 이력 (JSONL)
├── prompts/
│   ├── linkedin.md         # LinkedIn 변환 프롬프트
│   └── newsletter.md       # 뉴스레터 변환 프롬프트
├── .env                    # LinkedIn OAuth, Beehiiv API key
├── requirements.txt
└── README.md
```

## 대시보드 확장 대비

모든 발행 이력을 JSONL로 저장. 공통 스키마:

```json
{
  "id": "uuid",
  "channel": "linkedin|newsletter|threads|instagram",
  "source_script": "파일명",
  "published_at": "ISO",
  "metrics": {},
  "status": "published|draft|failed"
}
```

Threads 봇, Instagram 엔진도 같은 스키마로 맞추면 대시보드에서 전 채널 통합 가능.

## 에러 처리

- API 실패 → 3회 재시도 → 실패 시 텔레그램 알림 + status: failed 기록
- LinkedIn 토큰 만료 → 자동 refresh, 실패 시 텔레그램으로 재인증 요청

## 결정 요약

| 항목 | 결정 |
|------|------|
| 구조 | 독립 `content-engine/` 모듈 |
| 입력 | 릴스 스크립트 파일 드롭 or 메시지 |
| LinkedIn | 풀 자동 (평일 10시, 큐 있으면 발행 = 주 3-5회) |
| 뉴스레터 | 반자동 (금 14시 초안 → 승인 후 발행) |
| 서비스 | Beehiiv (무료 2500명) |
| 스케줄 | 기존 오케스트레이터 APScheduler 확장 |
| 대시보드 | JSONL 공통 스키마로 2단계 대비 |
