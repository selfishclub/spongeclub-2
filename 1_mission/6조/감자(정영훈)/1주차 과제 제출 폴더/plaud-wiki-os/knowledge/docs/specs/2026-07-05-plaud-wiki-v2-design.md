# Plaud 지식위키 v2 — 통화녹음·라벨·삭제·액션 추출

- 작성일: 2026-07-05
- 대상: `knowledge-wiki/`
- 선행: `2026-07-05-plaud-wiki-ingest-design.md` (v1 — Plaud→위키 적층. 코드 완료, MCP 설치 후 Task 1·7만 잔여)

## 1. 목적

v1은 "녹음이 쌓이는" 파이프라인. v2는 4가지를 추가한다:
1. **통화녹음 흡수** — 유선 미팅(통화녹음)도 같은 파이프라인으로.
2. **노드 라벨 상시 표시** — 클릭 없이 그래프에서 노드 식별.
3. **웹UI 노드 정리** — 녹음 노드 삭제 + 일반 노드 숨기기.
4. **액션 추출** — 미팅 인풋에서 "다음에 할 액션"을 뽑아 텔레그램으로 배달 + 노드에 기록.

## 2. 구성요소

### 2.1 통화녹음 → Plaud 업로드 통합 (코드 변경 0)
- 워크플로우: 대면 미팅 = Plaud 디바이스 녹음(자동), 유선 미팅 = 통화녹음 오디오를 Plaud 앱에 업로드.
- 업로드되면 Plaud가 전사·AI 요약 → v1 fetch가 그대로 흡수. **자체 전사 파이프라인 만들지 않는다(YAGNI).**
- 산출물: `knowledge-wiki/CLAUDE.md`에 운영 SOP 1절 추가(업로드 습관 포함).

### 2.2 노드 라벨 상시 표시
- 현재: `templates/wiki.html.tmpl`의 cytoscape 노드 스타일에 `label` 없음 → 클릭해야 제목 확인.
- 변경: 노드 스타일에 `label: data(title)` 추가. 322+노드 겹침 완화:
  - 제목 12자 초과 시 말줄임(`…`) — 그래프 데이터에 `short_title` 필드 추가(파이썬에서 절단).
  - `min-zoomed-font-size`로 줌아웃 시 라벨 자동 숨김(cytoscape 내장).
  - 색은 기존 테마 변수 사용, 새 디자인 도입 없음(기존 wiki.html 룩 유지).
- 적용 지점: `wiki/graph.py`(short_title 필드) + `templates/wiki.html.tmpl`(스타일 1블록).

### 2.3 웹UI 노드 정리 (serve.py 확장)
- **녹음 노드**(`layer == "recording"`): "삭제" 버튼 → `POST /delete-recording` → `recordings/*.md` 파일 삭제.
  원장(processed.json)은 유지 → 재수집 안 됨(의도: 지운 건 다시 안 나타남).
- **그 외 노드**(메모리·온톨로지·rules·docs): "숨기기" 버튼 → `POST /hide-node` →
  `knowledge-wiki/hidden.json`(slug 배열)에 추가. **원본 파일은 절대 건드리지 않는다.**
- `build_wiki.py`·`serve.py` 그래프 로드 시 hidden.json의 slug 제외.
- 보안: 기존 serve.py 보호(127.0.0.1, Host 검증, CSP) 그대로. 삭제는 `recordings/` 디렉터리
  내부 경로만 허용(경로 탈출 차단: resolve 후 부모 확인).
- UI: 사이드패널(노드 상세)에 버튼 추가. hidden 해제는 hidden.json 직접 편집(UI 없음, YAGNI).

### 2.4 액션 추출 → 텔레그램 + 노드 기록
- ingest 단계에서 새 녹음마다:
  1. 요약 텍스트를 Sonnet(`claude-sonnet-4-6`, 기존 `.env`의 `ANTHROPIC_API_KEY` 재사용)에 전달
     → "사용자가 다음에 해야 할 액션" 목록(JSON) 추출. 액션 없으면 빈 배열.
  2. 노드 마크다운에 `## 다음 액션` 섹션으로 기록(`- [ ]` 체크박스).
  3. 신규 액션이 1개 이상이면 **텔레그램 봇 API**(`sendMessage`, stdlib urllib)로 푸시:
     "📋 {제목} ({날짜})\n- 액션1\n- 액션2".
- 설정: `.env`에 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (gitignore 기존 적용).
- 실패 격리: 액션 추출/텔레그램 실패해도 **노드 적층은 성공** (액션은 best-effort, 스킵 로그만).
- API 인젝션 방어: 요약 원문은 데이터로만 취급, LLM 출력은 JSON 스키마 검증 후 사용.
  텔레그램 메시지는 평문(파싱 모드 없음)으로 전송해 마크다운 인젝션 무효화.

## 3. 제외 (YAGNI)
- 자체 전사(Whisper 등) — Plaud 업로드로 해결.
- hidden 해제 UI, 노드 편집 UI — 파일 직접 수정으로 충분.
- 액션의 노션 Nova 등록 — 텔레그램+노드 기록으로 시작, 필요해지면 추가.
- 라벨 충돌 회피 고급 레이아웃 — min-zoomed-font-size로 충분.

## 4. 보안·규제
- 녹음(거래처 미팅) 민감정보: 텔레그램 푸시에는 **액션 문장만** 전송(요약 원문 전송 금지).
- 텔레그램 토큰/챗ID는 `.env`(gitignore). 로그에 토큰·요약 원문 금지(v1 규칙 승계).
- 삭제 엔드포인트는 recordings/ 밖 접근 차단(경로 검증). 숨기기는 원본 불변.

## 5. 테스트
- 2.2: short_title 절단 로직 단위테스트. 렌더 결과에 label 스타일 존재 확인.
- 2.3: hidden 필터링(그래프에서 제외), 삭제 경로 검증(탈출 시도 거부), 원장 유지 확인.
- 2.4: 액션 추출 JSON 파싱(정상/깨진 출력/빈 배열), 텔레그램 페이로드 구성, 실패 격리
  (추출 실패 시에도 ingest 성공). LLM·텔레그램 API는 목킹.

## 6. 미확정
1. 텔레그램 봇 토큰/chat_id — 사용자 제공 필요(기존 텔레그램 플러그인 봇 재사용 가능성 확인).
2. Plaud 앱의 외부 오디오 업로드 UX(모바일/웹 경로) — 사용자가 1회 확인.
