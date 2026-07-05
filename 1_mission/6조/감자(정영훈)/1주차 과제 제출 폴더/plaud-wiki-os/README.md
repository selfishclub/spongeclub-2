# plaud-wiki-os — 개인 지식 위키 + 회의록 적층 + 액션 아이템 OS

흩어진 마크다운 지식을 **그래프 위키**로 보고, **Plaud 녹음(미팅)이 매일 자동으로 쌓이고**, 미팅마다 **다음 액션**이 나오는 로컬 퍼스트 개인 OS.

## 동작 흐름

```
[매일 08:00 launchd]
  → fetch_plaud.sh        헤드리스 claude + 공식 Plaud MCP → 새 녹음 요약 JSON
  → wiki/plaud_ingest.py  증분 선별(원장) → 마크다운 노드 생성 → 기존 지식 자동 [[링크]]
                          → AI가 "다음 액션" 추출(체크박스 기록, 텔레그램 옵션)
  → build_wiki.py         그래프 재생성 (wiki.html)
```

- **대면 미팅**: Plaud 디바이스로 녹음 → 자동 흡수
- **유선 미팅**: 통화녹음 파일을 Plaud 앱에 업로드 → 동일 파이프라인

## 빠른 시작

```bash
pip install -r requirements.txt
python3 -m pytest -q        # 76 tests
python3 build_wiki.py       # 동봉된 sample-knowledge/로 그래프 생성
open wiki.html
```

챗·액션 추출까지 쓰려면 `.env.example`을 `.env`로 복사하고 `ANTHROPIC_API_KEY` 입력 후:

```bash
python3 serve.py            # http://127.0.0.1:8787 (그래프 + 챗)
```

Plaud 연동(본인 계정 필요):

```bash
npx -y @plaud-ai/mcp@latest install   # 공식 MCP 설치 + OAuth
./fetch_plaud.sh 2026-01-01           # 첫 실행 시 브라우저 Authorize 1회
python3 -m wiki.plaud_ingest          # 수동 적층 실행
# 자동화: com.example.plaud-ingest.plist 경로 수정 후 ~/Library/LaunchAgents/에 등록
```

## 설계 포인트

- **가져오기만 AI, 처리는 전부 결정적 파이썬** — MCP 출력과 파이썬 사이 경계는 `Recording` 하나. LLM이 이상한 출력을 내도 파싱 실패 = 빈 배열로 안전
- **증분 원장(processed.json)** — 매일 돌아도 새 녹음만, 파일명에 고유 해시(동명 충돌로 인한 데이터 소실 방지)
- **실패 격리** — 액션 추출/텔레그램이 죽어도 노드 적층은 성공
- **보안** — 완전 로컬(127.0.0.1 + Host 검증 + CSP), 녹음·키는 gitignore, 로그에 본문 미출력, 삭제는 recordings/ 내부만(경로 탈출 차단)
- **덜어내기** — 웹UI에서 녹음 삭제 / 노드 숨기기(고유 ID 매칭, 원본 파일 불변)

## 구조

| 경로 | 역할 |
|---|---|
| `build_wiki.py` / `serve.py` | 정적 그래프 빌드 / 챗 서버 |
| `fetch_plaud.sh` | 헤드리스 claude로 Plaud MCP에서 요약 JSON |
| `wiki/plaud_*.py` | 파싱 → 노드 변환 → 자동 링크 → 적층 → 액션 추출 |
| `wiki/` 나머지 | 수집·파싱·링크해석·그래프·렌더·검색·분류 |
| `sample-knowledge/` | 바로 실행해볼 수 있는 가상 지식 샘플 |
| `tests/` | 76 tests (LLM·텔레그램·API 전부 목킹) |

> 실데이터(내 지식·녹음·위키HTML)는 개인정보라 제외했고, 가상 샘플로 대체했다.
