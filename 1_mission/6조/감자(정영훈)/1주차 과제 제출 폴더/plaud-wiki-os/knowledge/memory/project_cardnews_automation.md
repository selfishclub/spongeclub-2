---
name: 카드뉴스 자동화 Phase 1
description: 새벽 콘텐츠 생성 + 9시 보고 파이프라인. personal-brand/auto/ 모듈. SOP+plan 기반.
type: project
originSessionId: 9f2acf25-e6d1-4993-a00e-2d13531eb78e
---
병원마케팅 대표 퍼스널 브랜딩 카드뉴스 데일리 사이클 자동화. Phase 1 코드 완료 (2026-05-11).

## 사이클
- 05:00 launchd → topic_picker (Nova DB 큐 또는 Claude 보충) → copy_writer (8장 + §6 셀프체크 3-retry) → image_matcher (14장 풀 키워드 매칭) → caption_writer (insight-06 baseline) → deck_builder (YAML) → prompt_packer (Pencil agent md)
- 09:00 iMessage 알림 → 사용자 8:55에 pencil-prompt.md를 Pencil agent에 던지기

## 구조
- `personal-brand/auto/` — 9개 모듈 + tests/ (47개 통과)
- `personal-brand/auto/launchd/com.company.cardnews-daily.plist` — 05:00 trigger
- `personal-brand/auto/rules/copy_rules.md` — SOP §6 사본
- `personal-brand/auto/rules/images_pool.json` — 키워드 태깅 풀 (현 3장, 14장으로 확장 필요)
- `personal-brand/drafts/YYYY-MM-DD/` — 산출물

## 결정사항 (SOP 4번 체크)
- 4.4(A): Claude는 prompt md까지만. 사용자가 8:55에 Pencil에 던짐.
- 4.6: localhost 대시보드 + iMessage 알림 둘 다 (Phase 2)
- 4.7: iMessage "승인" 키워드 + 대시보드 + CLI 셋 다 (Phase 2/3)

## 사용자 사전 작업 (Task 10)
1. ✅ `~/.config/personal-brand/.env` (2026-05-11 19:20)
2. ✅ pyyaml 6.0.3 / anthropic 0.100.0
3. ⏳ Nova 미션 DB(2ce7def7-859f-81d0-b7c4-fca5697722e3)에 "카드뉴스" 태그 + 주제 페이지 1개 (상태=대기) — 미시드 시 Claude 보충 폴백
4. ✅ `images_pool.json` 14장
5. ✅ launchd 등록 + 자동 실행 검증 완료 (2026-05-11 22:16) — `launchctl start` exit 0, 산출물 7종 정상

## launchd 권한 (macOS Privacy)
- `Desktop/` 폴더 접근 차단 → 초기 종료코드 126 (Operation not permitted)
- 해결: plist의 `ProgramArguments`를 `bash wrapper` → `/usr/bin/python3 -c "..."` 직접 호출로 단순화
- 사용자가 `시스템 설정 → 전체 디스크 접근 권한`에 `/usr/bin/python3` 추가 (1회)
- 검증: 2026-05-11 22:14 `launchctl start` 후 exit 0, STDERR 클린

## 알려진 한계
- 서명 "AI 검색 최적화"가 §6 "최적화 단독" 규칙 false positive (9시 검수 시 사람 판단)
- 추상명사 boundary는 합성어 접미사(적/화/성/력/론) 휴리스틱

## Pencil 빌드 (2026-05-12 추가)
- 디자인 시스템 `design system/company_design_system.pen` 기준으로 통일 (블루/화이트, $primary-blue)
- `template-fill/archetype_slots.json` — 7개 archetype 슬롯 ID 매핑 (디자인 시스템 컴포넌트 기준)
- `template-fill/deck_fill.py` — JSON에서 매핑 자동 로드
- `auto/deck_builder.py` — copy_writer (headline, body) → archetype별 풍부 슬롯 분해
- 매 사이클 새 .pen 생성: `cp 'design system/company_design_system.pen' personal-brand/cardnews-company-YYYYMMDD.pen` 후 batch_design
- 검증: 2026-05-12 8장 빌드 OK (`cardnews-company-20260512.pen` top-level AUTO-01~08)

## 알려진 한계 (2026-05-12)
- `mcp__pencil__export_nodes` 자체 버그 — active editor·파일·앱 다 맞아도 "wrong .pen file" 거부. PNG는 Pencil GUI 수동 export 필요
- `_split_title_desc` 휴리스틱이 자연어 줄을 어색하게 자름 (예: "리뷰 30개 / 중 답변이..."). copy_writer 프롬프트를 archetype별 풍부 슬롯 직접 생성하게 재설계 필요 (별도 Phase)

## IG 자동 게시 워커 (2026-05-12 추가)
- 노션 카드뉴스 DB에 `승인` checkbox 속성 추가
- `auto/publisher.py` — 폴링 워커. 카테고리=카드뉴스 AND 승인=true AND Status!=게재 완료 페이지 감지
- 흐름: 페이지 발견 → Date Created 날짜의 `drafts/<date>/exports/*.png` 8장 확인 → sips로 JPG 변환 → Supabase Storage(`personal-brand` bucket, `auto-<date>/01.jpg~08.jpg`) PUT → `publish-to-ig.py --series auto-<date> --publish` 호출 → Notion Status "게재 완료" + iMessage 알림
- launchd: `com.company.cardnews-publisher.plist`, 10분 주기, 등록 완료 2026-05-12
- 사용자 흐름: 매일 05시 자동 빌드 → 9시 알림 → 사용자가 Pencil GUI에서 cmd+E로 PNG 8장 export (drafts/<date>/exports/) → 노션 페이지에서 승인 체크박스 → 10분 안에 자동 게시

## export_nodes MCP 버그 (2026-05-12 확인)
- `mcp__pencil__export_nodes`는 reusable 컴포넌트 정의만 export 가능 (예: `MHUK6` OK)
- batch_design으로 만든 인스턴스(frame containing ref)는 cmd+S 저장 후에도 "wrong .pen file" 거부
- 우회: 사용자가 Pencil GUI에서 매일 한 번 cmd+E로 PNG export

## 후속 Phase
- Phase 2: localhost 대시보드 + copy_writer archetype-aware 재설계
- Phase 3: PNG export 완전 자동화 (Pencil MCP 버그 해결 또는 AppleScript GUI 자동화)
- Phase 4: DM 자동 응대

## 참조
- 플랜: `docs/superpowers/plans/2026-05-11-cardnews-automation-phase1.md`
- SOP: `personal-brand/SOP.md`
- IG publisher: `personal-brand/publish-to-ig.py` (이미 완성)
- YAML→Pencil 변환기: `personal-brand/template-fill/deck_fill.py`
