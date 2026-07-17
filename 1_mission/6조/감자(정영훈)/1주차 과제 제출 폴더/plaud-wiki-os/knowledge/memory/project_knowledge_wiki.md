---
name: project-knowledge-wiki
description: "흩어진 지식 250개+를 그래프+위키 HTML로 시각화하는 로컬 전용 도구. YouTube agentic-os 영상에서 출발했으나 통짜설치 대신 \"내 지식 지도\" 니즈로 전환"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4ed7b418-2f0a-44b8-b967-3affeb36e6bd
---

`knowledge-wiki/` — 워크스페이스에 흩어진 마크다운 지식(ontology 41 + Claude memory 102 + rules 64 + CLAUDE.md 20 + docs 42)을 하나의 자체 완결 `wiki.html`(그래프 + 위키 페이지)로 뽑는 로컬 전용 파이썬 도구.

**출발점:** YouTube "The Agentic OS Setup That Will 10x Claude Code"([KbWen/agentic-os](https://github.com/KbWen/agentic-os)) 보고 "만들어보고 싶다" → 뜯어보니 형은 이미 90% 갖고 있어서 통짜설치는 3중 충돌. 진짜 니즈는 "내가 쌓은 지식이 어떻게 형성됐는지 눈으로 보는 LLM 위키"로 전환.

**결과 (2026-07-05):** 6단계 파이프라인(collect/parse/resolve/graph/render/run), 10 tests PASS. 실제 빌드 = **노드 322 · 엣지 335 · 끊긴링크 53 · 고립 72**. 헤드리스 브라우저 6종 검증 WORKS(렌더·클릭·검색·필터·외부요청0).

**핵심 설계 결정:**
- 링크 해석: `[[slug]]`는 **파일명** 매칭(frontmatter `name:`은 비어있거나 엉뚱해서 못 씀). 마크다운 `[](../x.md)`는 상대경로. 못 찾으면 dangling 빨간 노드.
- cytoscape.js **인라인**(CDN 아님) — wiki.html이 거래처 민감정보 품어서 오프라인·외부요청0 필수.
- **wiki.html·*.png은 gitignore** (거래처 환자/매출/계약 노출). 절대 공유·업로드 금지.

**실행:** `cd knowledge-wiki && python3 build_wiki.py && open wiki.html`. 지식 늘면 재실행 갱신. 자동실행 아님.

**대화형 챗(RAG) 확장 (2026-07-05):** 브라우저 위키 옆 챗창. `python3 serve.py`(127.0.0.1:8787) → 질문 → 키워드검색 top-K → Sonnet 요약 답변 + 출처 노드 그래프 하이라이트. API 키는 `knowledge-wiki/.env`의 `ANTHROPIC_API_KEY`(gitignore). 21 tests PASS. 보안리뷰 HIGH×2(XSS/인젝션 비콘) 수정: LLM출력 html.escape+살균 + CSP(외부img/fetch 차단) + Host검증(DNS리바인딩) + body캡. **제로 신규 의존성**(anthropic·markdown 기설치). serve.py는 `.env` 자동 로드.

**의미검색 + UI 재설계 (2026-07-05):** 챗 검색을 키워드→**로컬 임베딩**(fastembed `paraphrase-multilingual-MiniLM-L12-v2` ~220MB, 완전 오프라인)으로 업그레이드. 콘텐츠해시 캐시(.embed_cache.npz gitignore, 재시작 0초), fastembed 실패 시 키워드 폴백. 실측: "GBP 순위 측정" → 방법론 문서 1위(키워드 땐 4위). UI는 ui-ux-pro-max로 다크 슬레이트 대시보드 재설계(탭 문서/질문하기, 레이어색 범례, SVG아이콘). 27 tests PASS, 헤드리스 6종 검증 통과. 새 의존성=fastembed(승인됨).

**두 모드:** `build_wiki.py`(정적 그래프) / `serve.py`(챗, 127.0.0.1:8787). 자동실행 아님.

**남은 개선 후보:** 그래프 레이아웃이 저연결 층은 밴드/그리드로 뭉침(organic 느낌 약함), 엣지 흐릿. 고립 73·끊김 54는 지식의 구멍 신호.

**Plaud 녹음 적층 (2026-07-05, 코드 완성):** 대면=Plaud 디바이스, 유선=통화녹음을 Plaud 앱 업로드 → 하나의 파이프라인. `fetch_plaud.sh`(헤드리스 claude -p + **공식 Plaud MCP** — 비공식 API 안 씀, 사용자 결정) → `wiki/plaud_ingest.py`(파싱→노드→자동링크→증분원장 processed.json) → 재빌드. 노드 파일명에 id 해시(동명 충돌·데이터 소실 방지), fetch 실패는 예외로 표면화, 링커는 다중토큰 slug만 별칭 등록(generic 단어 오탐 방지). recordings/ gitignore(거래처 민감정보). **완결(2026-07-05 저녁):** MCP 설치+OAuth 완료(`~/.plaud/tokens-mcp.json` 자동갱신), `fetch_plaud.sh` E2E 실검증(계정 녹음 0건이라 `[]` 정상 → 파이프라인 전체 실동작 확인), **launchd `com.company.plaud-ingest` 매일 08:00 가동**, 런북 등록. fetch는 `claude -p --model sonnet --allowedTools "mcp__plaud__*"` 패턴. 이제 Plaud에 녹음 올리면 다음날 아침 자동으로 위키에 쌓임.

**v2 (2026-07-05, 완료):** ① 노드 라벨 상시 표시(short_title 12자 절단, min-zoomed-font-size 8) ② 웹UI 정리 — 녹음 노드=파일 삭제(원장 유지, 재수집 안 됨), 일반 노드=숨기기(hidden.json, **고유 id 매칭** — basename 매칭은 동명 CLAUDE 21개 오제거 CRITICAL이라 수정). 클릭 시 서버가 wiki.html 재빌드+챗 캐시 재적재까지 즉시 반영, 락+입력검증. ③ 액션추출+텔레그램 배달(Task 4·5)은 **보류** — 사용자 "덜어내기 우선" 방향 전환([[project_system_cleanup]] 0705). 70 tests PASS.

설계·계획: `docs/superpowers/specs/2026-07-05-knowledge-wiki-design.md`, `docs/superpowers/plans/2026-07-05-knowledge-wiki.md`, `docs/superpowers/specs/2026-07-05-plaud-wiki-ingest-design.md`, `docs/superpowers/specs/2026-07-05-plaud-wiki-v2-design.md`. 관련: [[project_recall_system]](과거 세션 검색), [[project_system_cleanup]].
