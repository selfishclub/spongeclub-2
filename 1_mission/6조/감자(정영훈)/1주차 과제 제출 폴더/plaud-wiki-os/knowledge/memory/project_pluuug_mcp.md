---
name: Pluuug MCP 서버
description: 거래처 정보 → docx 양식 치환 → GDrive 저장 → Pluuug 계약 자동 등록 통합 MCP
type: project
originSessionId: c53499b8-7319-4439-b44a-68355c238f4d
---
`pluuug-mcp/` 프로젝트 (2026-05-08 빌드).

**위치**: `/Users/user/Desktop/claude code/pluuug-mcp/`

**MCP 툴 3개**:
- `create_contract`: 거래처 정보 입력 → 양식 치환 → GDrive 저장 → Pluuug 등록 (dry_run=True 기본)
- `list_contracts`: 계약 목록 조회 (페이지네이션 처리)
- `get_contract`: 단일 계약 상세

**계약 매핑 정책**:
- type="S" (정기결제), vatType="E" (별도)
- amount = max(450000, ad_budget * 0.15)
- title = "구글 애즈 광고 대행 - {company_name}"

**양식 변수 (placeholder)**: `{{COMPANY_NAME}}`, `{{CEO_NAME}}`, `{{BIZ_NUMBER}}`, `{{ADDRESS}}`, `{{SIGNING_DATE}}`. 양식 재빌드는 `scripts/build_template.js`로.

**GDrive 저장 경로**: `03_클라이언트/{company_name}/계약서/{YYMMDD}_{company_name}_구글애즈_계약서.docx`

**부산물 — 버그 발견**: `company-pipeline/migration/export_pluuug.py:38`이 `API_KEY`로 HMAC 서명. Pluuug 공식은 `SECRET_KEY` 사용. GET 요청은 통과해서 안 들켰지만 POST는 실패할 가능성. 추후 패치 필요.

**Why:** 거래처마다 계약서 docx 일일이 만들어 보내고 Pluuug에 수기 등록하던 작업을 한 번의 툴 호출로 압축. 양식 표준화 + 장부 자동화 동시 달성.

**How to apply:** `pluuug__create_contract`로 새 거래처 계약 시작. 항상 `dry_run=True`로 먼저 호출해서 docx + 페이로드 검토 후 사용자 승인 받고 `dry_run=False`로 재호출. Pluuug 데이터 조회/검색은 `list_contracts`/`get_contract`로 빠르게.
