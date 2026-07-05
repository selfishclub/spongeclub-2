# Plaud 녹음 → 지식위키 자동 적층

- 작성일: 2026-07-05
- 대상 프로젝트: `knowledge-wiki/`
- 관련: `2026-07-05-knowledge-wiki-design.md`, 메모리 `project_knowledge_wiki`

## 1. 목적

Plaud 레코더로 녹음한 내용(회의·메모·아이디어)을 매일 자동으로 `knowledge-wiki/`의
마크다운 노드로 떨궈, 기존 지식 그래프(322노드)에 **계속 적층**되게 한다.

- 녹음마다 Plaud 앱 LLM이 이미 만들어주는 **AI 요약노트를 그대로 가져와** 노드화한다
  (우리 쪽에서 재요약 LLM을 돌리지 않는다 → 비용 0·결정적).
- 새 노드는 기존 지식(거래처·프로젝트 slug)에 **자동으로 `[[링크]]`가 걸려** 고립되지 않는다.

## 2. 범위

### 포함
- Plaud API로 새 녹음(요약노트 포함) 증분 수집
- 마크다운 노드 생성 + 기존 slug 자동 링크
- `build_wiki.py` 재실행으로 그래프 갱신
- launchd 매일 예약 실행

### 제외 (YAGNI)
- 실시간 웹훅 / 푸시 수신 — 매일 폴링으로 충분
- 별도 DB — 파일 + 원장 JSON으로 충분
- 새 의미검색 인덱스 설계 — 기존 `embed.py`/`retrieve.py`가 새 마크다운도 그대로 인덱싱
- Plaud 요약노트 재가공 — 원문 그대로 사용

## 3. 아키텍처

```
[launchd 매일 아침]
  → 헤드리스 claude -p (공식 Plaud MCP 연결)
      "원장에 없는 새 녹음의 요약을 뽑아 JSON 배열로만 출력"
      → stdout: [{id,title,date,summary}, ...]
  → plaud_ingest.py (JSON 입력)
      1. 원장(processed.json)에 없는 id만 선별
      2. 노드 생성 → knowledge-wiki/recordings/YYYY-MM-DD-<slug>.md
      3. 자동 링커: 본문에서 기존 slug·거래처명 매칭 → ## 관련 [[slug]]
      4. 원장에 id 기록
  → build_wiki.py 재실행 → wiki.html 그래프 갱신
```

### 가져오기 = 공식 MCP (헤드리스 claude), 나머지 = 파이썬 (확정)
- **녹음 가져오기 = 공식 Plaud MCP를 헤드리스 `claude -p`로 호출.** 사용자가 이미 iMessage
  리스너를 `claude -p`(Sonnet)로 launchd에서 돌리는 검증된 패턴 재사용. 비공식 리버스엔지니어링
  API의 취약성(플라우드 웹 변경 시 파손)을 피하고 공식 지원 경로 사용. → "공식 API 우선" 원칙 부합.
  참고: [Plaud MCP](https://docs.plaud.ai/plaud-mcp-cli/mcp).
- **노드 생성·자동 링크·증분 원장·그래프 갱신은 전부 파이썬**(결정적·무LLM비용). MCP는 fetch만.
- MCP 출력(JSON)과 파이썬 처리 사이 경계는 `list[Recording]` 한 지점. fetch 방식이 바뀌어도
  다운스트림 파이썬은 불변.
- **비용:** 실행당 claude -p 토큰 소량. 녹음은 하루 몇 건이라 무시할 수준.

## 4. 구성요소 (전부 `knowledge-wiki/` 내부)

| # | 파일 | 책임 | 의존 |
|---|------|------|------|
| 1 | `fetch_plaud.sh` | 헤드리스 `claude -p`(공식 Plaud MCP)로 새 녹음 요약을 JSON으로 출력 | Plaud MCP |
| 2 | `plaud_ingest.py` | JSON 파싱→`Recording`, 오케스트레이션: 증분 선별→노드 생성→링크→원장→build | 1·3·4 |
| 3 | `plaud_node.py` | 요약노트 → 기존 파서가 읽는 마크다운(frontmatter+본문) 변환 | 없음 |
| 4 | `plaud_linker.py` | build_wiki가 아는 slug 인덱스 + 거래처명 사전으로 `## 관련` 링크 생성 | `wiki/sources.py`, 거래처 사전 |
| 5 | `recordings/processed.json` | 원장: `{recording_id: 처리일}`. 증분 처리의 단일 진실 | 없음 |
| 6 | `com.company.plaud-ingest.plist` | launchd 매일 예약 (fetch→ingest→build) | 1–4 |

### 4.1 노드 포맷 (`plaud_node.py` 산출)
`recordings/2026-07-05-<slug>.md`:
```markdown
---
name: recording_2026-07-05-<slug>
date: 2026-07-05
source: plaud
recording_id: <id>
---

# <녹음 제목>

<Plaud AI 요약노트 본문 그대로>

## 액션 아이템
<Plaud가 뽑은 액션 (있으면)>
```
- `name`(slug) = 파일명 기반. 기존 위키 링크 해석이 **파일명 매칭**이므로 파일명이 안정 id.
- 새 layer `recording` 추가 → 그래프에서 색상/필터로 구분.

### 4.2 소스 등록
`wiki/sources.py`의 `sources()`에 한 줄 추가:
```python
("recording", Path(__file__).resolve().parent.parent / "recordings"),
```
이후 `build_wiki.py`가 자동 수집한다(코드 변경 최소).

### 4.3 자동 링커 (`plaud_linker.py`)
1. 기존 노드 slug 인덱스 확보(= `wiki/resolver.py`가 쓰는 파일명 집합 재사용).
2. 거래처명 사전 구성: `company-ontology/clients/` 파일명 + 메모리 `project_*_clinic`/거래처
   메모리에서 별칭 매핑(예: "A의원" → `project_clinic_a_gbp`, 예시).
3. 본문 텍스트에서 별칭/키워드를 스캔 → **본문은 건드리지 않고**(Plaud 요약 원문 보존)
   노드 하단에 `## 관련` 섹션을 만들어 매칭된 `[[slug]]` 목록만 추가.
4. 매칭 실패는 무시(dangling 생성 안 함). 중복 slug는 1회만.

## 5. 데이터 흐름 / 증분

- 매일 돌아도 `processed.json`에 있는 recording_id는 스킵 → 새 녹음만 노드화.
- 노드 생성 성공 후에만 원장에 기록(중간 실패 시 다음 회차 재시도).
- 노드 파일이 이미 있으면 덮어쓰지 않음(멱등).

## 6. 보안·규제 (§4 — 필수)

녹음엔 **거래처 미팅(환자·매출·계약) 민감정보**가 섞일 수 있다. 기존 위키 규칙을 연장:

- `recordings/*.md`, `recordings/processed.json`, `wiki.html`, `.env` **전부 gitignore**.
  절대 커밋·공유·업로드 금지. (`.gitignore`에 `recordings/` 추가)
- 처리 전량 로컬. Plaud API는 형 본인 데이터 조회라 **신규 외부 노출 0**.
- Plaud 토큰은 `.env`(gitignore). 코드/로그에 토큰·요약 원문 남기지 않음.
- launchd 로그도 민감정보 흘리지 않도록 요약 본문은 stdout에 안 찍음(건수만).

## 7. 에러 처리

- Plaud API 인증 실패/네트워크 오류: 로그 남기고 **비파괴 종료**(원장 미변경, 다음 회차 재시도).
- 요약노트 없는 녹음(트랜스크립트만 존재): 트랜스크립트로 노드 생성(요약은 비움).
  → 이 폴백은 구현 시 Plaud API 응답 필드를 실제 확인 후 확정.
- `build_wiki.py` 실패: 노드 파일은 이미 생성됨 → 다음 회차/수동 실행으로 그래프만 재생성.

## 8. 테스트 (기존 pytest 패턴 따름)

- `test_plaud_node.py`: 요약노트(샘플 dict) → 마크다운 포맷·frontmatter·slug 검증.
- `test_plaud_linker.py`: 거래처명 포함 본문 → 올바른 `[[slug]]` 삽입, 미매칭은 무시.
- `test_plaud_ingest.py`: 원장 증분(이미 본 id 스킵), 멱등(기존 파일 미덮어씀). Plaud API는 목킹.
- Plaud API 실제 호출은 테스트 대상 아님(목킹). 최소 커버리지 80%.

## 9. 미확정 (구현 착수 시 확인)

1. 공식 Plaud MCP의 툴 이름·인자(목록/요약 조회) → 설치 후 실제 확인해 fetch 프롬프트에 반영.
   (요약 제공은 `plaud_get_summary`류로 확인됨 — 필드 존재 리스크 해소.)
2. 헤드리스 `claude -p`에 Plaud MCP를 물리는 설정 경로(프로젝트 `.mcp.json` vs 유저) → 설치 시 확정.
3. launchd 실행 시각(기본안: 매일 08:00) → 사용자 확정.

## 10. AUTOMATION-RUNBOOK

launchd 자동화이므로 구현 완료 커밋에 `AUTOMATION-RUNBOOK.md` 등록을 포함한다
(인벤토리·스케줄·가동상태 단일 진실).
