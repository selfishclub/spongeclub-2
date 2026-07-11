# 정부지원사업 스카우트 (Gov Subsidy Scout)

## 목적

우리 회사 법인 + 예비창업자(개인사업자) 조건에 맞는 정부지원사업을 매주 자동으로 탐색하여 Notion DB에 적재하고, iMessage로 주간 요약을 발송한다.

## 프로필

| 구분 | 조건 |
|------|------|
| **우리 회사 법인** | 창업 3년 이내(2023.08.14), 1인 기업, 마케팅/광고/IT서비스, 매출 ~n억/년, 서울 |
| **예비창업자** | 업종 미정, 개인사업자 신규 창업 예정 |

## 데이터 소스

### 기업마당 API (1차)
- **엔드포인트**: `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do`
- **인증**: `crtfcKey` (.env에서 로드)
- **파라미터**: `dataType=json`, `searchCnt=500`
- **총 공고 수**: ~1,200건 (2026-04-13 기준)
- **필터 파라미터 없음** → 전체 수집 후 AI 필터링

### 응답 필드

| 필드 | 설명 |
|------|------|
| `pblancNm` | 사업명 |
| `bsnsSumryCn` | 사업 요약 (HTML) |
| `trgetNm` | 대상 (중소기업 등) |
| `pldirSportRealmLclasCodeNm` | 분야 대분류 (인력/경영/창업 등) |
| `pldirSportRealmMlsfcCodeNm` | 분야 중분류 |
| `reqstBeginEndDe` | 신청기간 |
| `hashtags` | 해시태그 (지역, 키워드) |
| `pblancUrl` | 상세 페이지 URL |
| `jrsdInsttNm` | 소관기관 |
| `excInsttNm` | 수행기관 |
| `refrncNm` | 문의처 |
| `reqstMthPapersCn` | 신청방법/서류 |
| `rceptEngnHmpgUrl` | 접수 홈페이지 URL |
| `pblancId` | 공고 고유 ID (중복 체크용) |

## 시스템 구조

```
[매주 월요일 09:00 — launchd]
     │
     ▼
기업마당 API 호출 (전체 공고 수집)
     │
     ▼
AI 매칭 판단 (Claude Haiku)
 - 각 공고의 bsnsSumryCn + trgetNm + hashtags 분석
 - 우리 회사 법인 프로필 매칭
 - 예비창업자 프로필 매칭
 - 매칭도: 높음 / 중간 / 낮음
     │
     ├──▶ Notion DB 적재 (매칭도 "중간" 이상, 신규만)
     │    중복 체크: pblancId 기준
     │
     └──▶ iMessage 주간 요약 발송
          매칭도 "높음" 위주 + 마감 임박 건
```

## 스크립트 구조

```
gov-subsidy-scout/
├── scout.py            # 메인: API 호출 + AI 필터링 + 오케스트레이션
├── profile.py          # 프로필 정의 (법인/예비창업 조건)
├── matcher.py          # Claude Haiku 호출, 매칭 판단
├── notion_sync.py      # Notion DB CRUD
├── notify.py           # iMessage 주간 요약 발송
├── .env                # BIZINFO_API_KEY, NOTION_TOKEN, ANTHROPIC_API_KEY
└── com.company.gov-scout.plist  # launchd 스케줄
```

## AI 매칭 로직

각 공고에 대해 Claude Haiku에 프롬프트:

```
이 정부지원사업이 아래 프로필에 해당하는지 판단하세요.

[프로필 A — 우리 회사 법인]
- 법인, 창업 2023.08.14 (3년 이내)
- 1인 기업 (상시근로자 0명, 대표 1인)
- 업종: 마케팅/광고대행/IT서비스
- 연매출: ~2.7억
- 지역: 서울

[프로필 B — 예비창업자]
- 개인사업자 신규 창업 예정
- 업종 미정
- 지역: 서울

[공고 정보]
사업명: {pblancNm}
대상: {trgetNm}
분야: {pldirSportRealmLclasCodeNm}
요약: {bsnsSumryCn (HTML 태그 제거)}
해시태그: {hashtags}
신청기간: {reqstBeginEndDe}

응답 형식 (JSON):
{
  "profile_a_match": "높음|중간|낮음|해당없음",
  "profile_b_match": "높음|중간|낮음|해당없음",
  "reason": "1줄 사유",
  "action": "준비물/신청방법 1줄 요약"
}
```

### 배치 처리
- 1,200건을 50건씩 묶어서 1회 Haiku 호출 (24회 호출)
- 직렬 1,200회 → 병렬 배치 24회로 단축
- HTML 태그 제거: matcher.py에서 BeautifulSoup으로 전처리

### 비용 추정
- 배치 24회 × 입력 ~15,000토큰/회, 출력 ~3,000토큰/회
- 주 1회: ~$0.05 (월 ~$0.20)

### 에러 처리
- API 호출 실패: 3회 재시도 (30초 간격), 실패 시 iMessage로 에러 알림
- Notion 적재 실패: 로컬 JSON 백업 후 다음 주기에 재시도
- iMessage 발송 실패: 로그 기록, 다음 주기에 미발송 건 포함

### 마감일 파싱
- `reqstBeginEndDe` 형식: "YYYY-MM-DD ~ YYYY-MM-DD" 또는 "예산 소진시까지"
- 종료일 파싱 → Notion Date 필드, 파싱 불가 시 null + AI 요약에 원문 포함

## Notion DB 스키마

대표OS [Nova]에 "정부지원사업" DB 생성:

| 필드 | 타입 | 설명 |
|------|------|------|
| 사업명 | Title | 정부지원사업 이름 |
| 대상 | Multi-select | 법인 / 예비창업 |
| 매칭도 | Select | 높음 / 중간 |
| 지원금액 | Rich text | 최대 금액 (요약에서 추출) |
| 마감일 | Date | 신청 마감 |
| 상태 | Select | 신규 / 검토중 / 지원예정 / 지원완료 / 패스 |
| 신청링크 | URL | 접수 홈페이지 또는 상세 URL |
| AI 요약 | Rich text | 매칭 사유 + 준비물 |
| 분야 | Select | 창업/경영/금융/기술/인력/수출/내수 |
| 소관기관 | Rich text | 소관기관명 |
| 문의처 | Rich text | 연락처 |
| 출처 | URL | 기업마당 원문 URL |
| pblancId | Rich text | 중복 체크용 ID |

## iMessage 주간 요약 포맷

```
[M] 주간 정부지원사업 (4/14~4/20)

높음 (2건)
1. 초기창업패키지 — 최대 1억, 마감 5/15
   법인: 창업 3년 이내, AI 활용 마케팅으로 지원 가능
2. 서울시 소상공인 디지털전환 — 최대 500만, 마감 4/30
   법인: 1인 마케팅 대행사 해당

중간 (1건)
3. 청년창업사관학교 — 최대 1억, 마감 5/20
   예비창업: 나이 제한 확인 필요

Notion에서 상세 확인
```

## 스케줄

- **실행**: 매주 월요일 09:00 (launchd)
- **방식**: 기존 company-pipeline 패턴과 동일 (launchd plist)

## 확장 계획 (나중에)

- K-Startup, 소상공인진흥공단 등 추가 소스
- 마감 3일 전 리마인더
- 지원서 작성 도우미
