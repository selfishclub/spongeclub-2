# 지식 위키 (Knowledge Wiki) — 설계 문서

- **작성일:** 2026-07-05
- **상태:** 설계 승인 완료, 스펙 리뷰 대기
- **한 줄:** 워크스페이스에 흩어진 ~250개 마크다운 지식을 하나의 자체 완결 HTML(그래프 + 위키 페이지)로 뽑아, 내가 쌓은 지식이 어떻게 형성·연결됐는지 눈으로 보는 로컬 전용 도구.

---

## 1. 목적 · 성공 기준

**목적:** 내 지식 베이스의 *형성 구조*를 시각적으로 파악한다. "무슨 지식이 있나"가 아니라 "어떻게 엮여 있고, 어디가 촘촘하고, 어디가 고립·단절됐나"를 본다.

**성공 기준:**
- `python3 build_wiki.py` 한 방으로 `wiki.html` 1개 생성, 더블클릭하면 브라우저에서 열림.
- 왼쪽: 인터랙티브 그래프(노드=문서, 선=링크, 층별 색). 줌·드래그·노드 클릭.
- 오른쪽: 클릭한 문서의 렌더된 위키 페이지 + 백링크 목록 + 나가는 링크.
- 상단: 전체 텍스트 검색(제목+본문).
- 끊긴 링크(dangling)를 유령 노드로 시각화 → 지식의 구멍이 보임.
- 지식이 늘면 재실행으로 갱신.

## 2. 비목표 (YAGNI)

- 편집 기능 없음(읽기 전용). 편집은 원본 md에서.
- 서버·DB·빌드 파이프라인 없음. 단일 스크립트 + 단일 HTML.
- 외부 배포·호스팅 없음. 로컬 전용.
- 실시간 감시·자동 재생성 없음(수동 실행).
- 의미 기반(임베딩) 유사도 엣지 없음 — v1은 명시적 링크만. (향후 선택)
- `[[glob_*]]` 와일드카드 참조 확장 없음.

## 3. 범위 — 수집 대상 (화이트리스트)

코드 폴더 노이즈를 막기 위해 **넣을 곳만 명시**한다:

| 층(layer) | 경로 | 규모 | 노드 분류 기준 |
|-----------|------|------|----------------|
| 사업 지식 | `company-ontology/**/*.md` | ~41 | 하위 도메인(clients/sales/brand/finance…) |
| Claude 기억 | `~/.claude/projects/-Users-user-Desktop-claude-code/memory/*.md` | ~102 | frontmatter `metadata.type`, 없으면 파일명 접두어(`feedback_`/`project_`/`reference_`/`user_`)로 추론 |
| 작업 규칙 | `~/.claude/rules/**/*.md` | ~64 | common vs 언어별 |
| 프로젝트 헌법 | 워크스페이스 내 모든 `CLAUDE.md` | ~20 | 소속 프로젝트 폴더명 |
| 계획·스펙 | `docs/superpowers/**/*.md` | ~42 | plans vs specs |

경로는 스크립트 상단 `SOURCES` 리스트로 관리(추가·제외 쉽게). (합계 ~269개, 헤드라인 "~250"은 어림수 — 구현 시 하드코딩 금지, 실제 walk 결과를 쓴다.)

## 4. 아키텍처 — 6개 컴포넌트

각 컴포넌트는 단일 책임, 독립 테스트 가능.

1. **Collector** — `SOURCES` 화이트리스트를 walk, `(id, layer, abspath)` 문서 레코드 목록 산출. id = 층+상대경로 기반 안정 슬러그.
2. **Parser** — 문서별로 frontmatter(yaml), 제목, 본문, 나가는 링크 원문(raw) 추출. **본문 마크다운→HTML 변환도 Parser 소유**(라이브러리: 파이썬 `markdown`). 소스 md에 섞인 원시 HTML/script는 이스케이프(그대로 통과 금지) — 렌더된 결과를 Node.html에 저장. 검색용 평문(`search_text`)도 여기서 태그 제거로 생성.
3. **Link Resolver** *(지적 핵심)* — 원문 링크를 실제 노드 id로 해석. §5 규칙.
4. **Graph Builder** — 노드 리스트 + 엣지 리스트 + 노드별 백링크 계산. §6 데이터 모델.
5. **Renderer** — 자체 완결 `wiki.html` 방출. 그래프 데이터를 JSON으로 인라인, 그래프 레이아웃은 검증된 라이브러리(cytoscape.js) 재사용.
6. **Runner** — `main()`: 위 파이프라인 실행 후 `wiki.html` 저장, `open` 안내.

## 5. 링크 해석 규칙 (핵심)

형 지식 베이스는 링크 방식이 3종 섞여 있다. 실측으로 확인된 규칙:

1. **위키링크 `[[slug]]`** → `slug`는 **파일명**을 가리킨다(예: `[[feedback_external_facing_report]]` → `.../memory/feedback_external_facing_report.md`). frontmatter `name:`은 비었거나 엉뚱해서(`""`, `gbp-1`) **쓰지 않는다**. 해석 규칙: **memory 층에서만** `basename(확장자 제거)→id` 인덱스를 만들어 매칭. **대소문자 구분.** 같은 basename 중복 시 **먼저 수집된 것이 이김 + 경고 로그**.
2. **마크다운 링크 `[텍스트](경로.md)`** → 소스 파일 디렉토리 기준 상대경로로 해석. rules의 `../common/xxx.md`, MEMORY.md의 `[제목](file.md)` 포함. 앵커(`path.md#section`)는 `#` 앞까지만 잘라 해석, URL 인코딩된 공백(`%20`) 디코드. **해석된 실제 파일이 수집 집합(SOURCES) 밖이면 dangling 취급**(노드 만들되 out-of-scope 표시).
3. **해석 실패** → dangling. 해당 원문 슬러그로 **유령 노드** 1개 생성하고 빨간색 표시.
4. **`[[glob_*]]` 등 와일드카드, 확장자 없는 링크** → 노드로 안 만들고 스킵(로그만).
5. 외부 URL(`http(s)://`) → 엣지 대상 아님(무시).

엣지 종류(`kind`): `wikilink` | `mdlink`. 방향 있음(source→target). **중복 제거: `(source, target, kind)` 튜플 유니크**(같은 링크 2회 등장 시 1개로). 백링크·엣지 수 집계는 dedup 후 값 사용.

## 6. 데이터 모델

**Node:**
```
{ id, title, layer, category, type, path,
  html,          # 빌드 시 변환된 본문 HTML (우측 페이지 리더가 렌더)
  search_text,   # 소문자 평문 (검색 매칭용, 태그 제거)
  wordcount,     # 그래프 노드 크기 매핑에 사용
  dangling: bool, out_of_scope: bool }
```
- `title`: 우선순위 — 첫 `# H1` → frontmatter `description` → 파일명 humanize.
- `layer`: 위 §3의 5개 층.
- `category`: 층별 하위 분류(도메인/type/common여부/프로젝트명/plans·specs). memory에서 frontmatter `metadata.type` 없으면 파일명 접두어로 추론.
- `html`·`search_text`는 유령 노드(dangling)에선 빈 값.
- 색상 = `layer`, 부가 구분 = `category`, 노드 크기 = `wordcount`.

**Edge:** `{ source, target, kind }`

**Backlinks:** 각 노드에 대해 `target == node.id`인 엣지의 source 목록.

## 7. 렌더링 · UX

단일 `wiki.html`, 3영역 레이아웃:
- **상단 바:** 검색 입력(클라이언트 사이드, 노드 `title`+`search_text` 매칭 → 그래프 하이라이트 + 결과 리스트). 층 필터 토글(체크박스).
- **좌측(≈60%):** cytoscape.js force-directed 그래프. 노드 클릭 → 우측에 페이지 로드 + 그래프에서 이웃 하이라이트. 고립 노드/유령 노드 즉시 식별.
- **우측(≈40%):** 선택 문서의 렌더된 마크다운 + "← 백링크" 목록 + "→ 나가는 링크" 목록. 링크 클릭 시 해당 노드로 이동.
- 본문 마크다운은 빌드 시 HTML로 변환해 JSON에 담음(런타임 파서 불필요).

**cytoscape.js는 v1부터 HTML에 인라인**(CDN 아님). 이유: `wiki.html`이 거래처 민감정보를 그대로 품는데 서드파티 CDN에서 JS를 불러오면 공급망 유출 벡터 + 오프라인에서 안 열림. 라이브러리 파일을 `templates/`에 벤더링해 빌드 시 `<script>` 안에 삽입 → **완전 오프라인·단일 파일·외부 요청 0**.

## 8. 에러 처리

- 비-UTF8 / 읽기 실패 파일 → 스킵 + 경고 로그(수집 계속).
- frontmatter 파싱 실패 → frontmatter 없는 문서로 취급(본문만).
- 제목 없음 → 파일명 humanize.
- 해석 안 되는 링크 → dangling 노드(에러 아님, 인사이트).
- 빌드 요약을 stdout에 출력: 노드 수 / 엣지 수 / dangling 수 / 고립 노드 수 / 스킵 파일 수.

## 9. 프라이버시 (중요)

- 전 과정 로컬. 외부 API·네트워크 전송 **0**. cytoscape.js도 인라인(§7)이라 런타임 외부 요청 **완전 0** — 오프라인에서 열려도 정상.
- ontology에 거래처 민감정보(환자·매출·계약) 포함 → **`wiki.html`은 절대 공유·업로드·커밋 금지.** `.gitignore`에 `wiki.html` 등록.
- 산출물은 `knowledge-wiki/` 폴더에만 생성.

## 10. 파일 배치

```
knowledge-wiki/
├── build_wiki.py         # 파이프라인 (단일 진입점)
├── wiki/                 # 모듈: collector.py parser.py resolver.py graph.py render.py
├── templates/            # wiki.html 템플릿 (cytoscape + 페이지 리더)
├── tests/                # 픽스처 기반 단위 테스트
├── fixtures/             # 테스트용 미니 지식 폴더
├── wiki.html             # 산출물 (gitignore)
└── CLAUDE.md             # 로컬 도구 운영 메모(경량)
```
자동 실행(launchd/cron) 아님 → AUTOMATION-RUNBOOK 등록 불필요.

## 11. 테스트 전략

픽스처 미니 폴더(`fixtures/`)로:
- Collector: 화이트리스트 walk가 기대 파일 수 반환.
- Parser: frontmatter·제목·raw 링크 정확 추출.
- Resolver: `[[slug]]` 파일명 매칭(대소문자 구분·중복 basename 우선순위) / 상대경로 md링크(앵커 제거·%20 디코드) / dangling 판정 / SOURCES 밖 out_of_scope / glob·확장자없음 스킵 각각 검증.
- Graph: 노드·엣지·백링크 수 일치. **엣지 `(source,target,kind)` dedup 검증**(중복 링크 2회 → 엣지 1개).
- Parser: md→HTML 변환 + 원시 script 이스케이프 + `search_text` 태그 제거 검증.
- 목표 커버리지 80%+ (rules/common/testing.md).
