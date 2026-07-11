---
name: reference_pencil_mcp_setup
description: Pencil(.pen) MCP 작업 시 필수 운영 노하우 — 연결·폰트·렌더 가상화·export
metadata: 
  node_type: memory
  type: reference
  originSessionId: ced7721e-65d1-4176-bb60-abe6363fba6b
---

Pencil(.pen) 디자인 MCP 작업 시 반복 발생하는 함정과 해결.

- **MCP 연결 대상 = Antigravity 앱** (`~/.claude.json`의 pencil 서버가 `--app antigravity`). 데스크톱 Pencil.app에 파일을 열면 MCP가 못 본다. 반드시 `open -a Antigravity "<.pen 경로>"`로 **Antigravity에서** 열어야 `get_editor_state`가 잡힌다.
- **경로 주의**: `~/Library/Mobile Documents/.../Desktop/claude code`는 실제로 `~/Desktop/claude code`의 심볼릭(iCloud Desktop 동기화). MCP엔 realpath(`/Users/user/Desktop/claude code/...`)로 전달.
- **한글 폰트**: Pretendard는 Pencil에서 invalid. `Noto Sans KR` 사용(구글폰트). 폰트는 변수(`$font`)로 잡으면 일괄 교체 가능.
- **캔버스 렌더 가상화 (가장 큰 함정)**: 뷰포트에 한 번도 안 들어온 슬라이드는 미페인트라 `get_screenshot`·`export_nodes`가 **전부 흰/빈 화면**으로 나온다. 데이터는 정상(batch_get로 확인됨). 해결: Antigravity 캔버스에서 **Zoom to Fit(전체 보기)** 한 번 → 전 슬라이드 페인트 → 이후 export/screenshot 정상.
- **export 동기화 지연**: `Generate`(이미지)로 방금 추가한 슬라이드는 export 백엔드가 "wrong .pen file" 에러. **Cmd+S 저장**하면 동기화됨.
- 슬라이드 1920×1080, 루트 프레임 1개=1슬라이드, `clip:true`. 검증은 batch_get(데이터)+snapshot_layout(구조), 시각은 export PNG.

관련: [[reference_company_design_system]] [[feedback_design_html_reference_sop]] [[feedback_pencil_new_file]]
