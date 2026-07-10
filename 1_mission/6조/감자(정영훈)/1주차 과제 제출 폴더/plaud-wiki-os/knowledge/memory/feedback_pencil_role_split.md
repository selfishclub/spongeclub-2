---
name: Pencil 작업 역할 분담 (강화)
description: .pen 파일은 절대 Claude가 직접 수정하지 마라. Pencil MCP tool 사용 금지. 콘텐츠도 텍스트 prompt로 정리해서 사용자가 Pencil agent에 던지게 한다. (2026-05-09 강화)
type: feedback
originSessionId: ef508474-d3c5-4c6b-bfba-fbcacdbf3e4c
---
## 절대 규칙 (2026-05-09 강화)

**.pen 파일은 Claude가 직접 수정하지 마라.** Pencil MCP의 어떤 도구도 쓰지 말 것:
- ❌ `mcp__pencil__batch_design` (모든 변경 작업)
- ❌ `mcp__pencil__set_variables`
- ❌ 그 외 modify성 도구
- ✅ `mcp__pencil__batch_get`, `mcp__pencil__get_screenshot`, `mcp__pencil__export_nodes` 같은 read-only는 OK (검증 목적)

**해야 할 일:**
- 슬라이드 콘텐츠 + 디자인 의도를 **마크다운 prompt 파일**로 정리
- 사용자가 그 prompt를 **Pencil agent에 직접 붙여넣기**
- Pencil agent가 .pen 파일 수정

**Why (실패 사례 누적):**
1. **2026-05-05**: Pencil MCP connection drop, 결과 늦음 → 1차 합의 (콘텐츠만 Claude)
2. **2026-05-08~09**: Claude가 batch_design으로 디자인 적용 시도 → **Pencil GUI vs MCP 메모리 sync 문제**:
   - batch_design 변경이 MCP 메모리에만 있고 디스크 저장 안 됨
   - 사용자가 Pencil 닫고 재오픈 → 옛 디스크 상태 복귀, 모든 작업 휘발
   - 5+ 시간 작업 한 번에 사라짐
   - 파일 복구 시 41 bytes로 잘림 사고도 발생
3. **결론**: Pencil은 GUI 통한 native 작업만 신뢰 가능. MCP 통한 modify는 신뢰성 없음.

**How to apply:**
- 사용자가 .pen 파일 작업 요청 → **즉시 prompt 형태 markdown 파일 작성**
- 파일 위치: 작업 폴더 안 (예: `service-m/pencil_agent_prompt.md`)
- 내용: 13장 모든 슬라이드 콘텐츠 + 디자인 시스템 변수/컴포넌트 안내 + 사진 위치 + 체크리스트
- 사용자가 Pencil agent에 prompt 붙여넣기 → Pencil agent가 .pen 직접 작업
- 검증: read-only MCP 도구로 확인 가능 (export_nodes로 PNG 뽑아서 image read)

**예외:** 사용자가 "직접 수정해" 또는 "Claude가 해"라고 명시할 경우만 modify. 그 경우에도 매 batch 후 사용자에게 ⌘+S 요청 필수.

## 검토 루프 (iteration workflow, 2026-05-09 추가)

사용자가 Pencil agent로 prompt 적용 + 저장 후 Claude에 알리면:

1. **Claude는 .pen 파일 read-only로 읽음** (`batch_get`, `export_nodes` 등)
2. **초기 prompt/시뮬레이션과 비교** — 무엇이 잘 반영됐고 무엇이 빠졌나
3. **diff 분석 후 수정 prompt 작성** — 마크다운 파일로
4. 사용자가 그 prompt를 Pencil agent에 다시 던짐
5. 반복

**Claude는 절대 .pen 직접 수정하지 않는다.** 검토 후 항상 prompt 형태로 피드백.

**검토 결과물 형식:**
```markdown
# 검토 결과 — [프로젝트명] [라운드 N]

## 잘 반영된 것
- ...

## 차이점 / 누락 / 수정 필요
- 슬라이드 X: [무엇이 다른지] → [어떻게 수정해야 하는지]

## 다음 라운드 prompt
[Pencil agent에 그대로 던질 텍스트]
```

## Prompt 파일 형식 표준

```markdown
# Pencil Agent Prompt — [프로젝트명]

## 작업 개요
- 파일 경로
- 슬라이드 수
- 사이즈 (예: 1920×1080)

## 디자인 시스템 변수
- 컬러 토큰 ($primary 등)
- 타이포 토큰
- shape

## 재사용 컴포넌트 (cmp/*)

## 디자인 스타일 가이드 (Hero vs 일반 슬라이드 등)

## 슬라이드 콘텐츠 (각 슬라이드별)
- 레이아웃
- 텍스트
- 컴포넌트 사용

## 작업 시 체크리스트

## 참조 자료 경로
```
