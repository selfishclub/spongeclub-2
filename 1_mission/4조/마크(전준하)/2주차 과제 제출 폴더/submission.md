---
member: 전준하
조: 4
week: 2
type: weekly
title: n8n으로 콘텐츠 OS에 자동화 엔진 달기
summary: 1주차에 만든 콘텐츠 OS 대시보드에 n8n 스케줄러를 연결해 매주 토요일 오전 9시 Claude API가 카테고리별 초안을 자동 생성하는 구조를 완성했다.
date: 2026-07-12
---

## 결과물

**n8n 워크플로우 (localhost:5678)**
- Schedule Trigger → Code 노드 → HTTP Request (Claude API) → HTTP Request (Supabase 저장) 구조
- Code 노드에서 카테고리 4개(커리어·이직/LinkedIn, HR·AX/LinkedIn, AI·바이브코딩/블로그, 에세이/스레드) 정의
- Claude API가 카테고리별로 마크 스타일 초안 자동 생성 → Supabase `content_drafts` 테이블에 저장
- 매주 토요일 오전 9시 자동 실행, 실행 시 Discord 알림 예정

**콘텐츠 OS 대시보드 (/content 페이지)**
- n8n과 연결해 자동 생성된 초안이 대시보드에 바로 표시됨
- 확정 / 수정 요청 / 건너뜀 / 초안 복구 / 제목+본문 복사 기능 전부 동작 중

## 삽질 과정

- **n8n Execute Command 노드 없음**: 최신 n8n에서 해당 노드가 제거돼 있었다. Python 스크립트를 직접 실행하려던 계획을 바꿔, n8n 안에서 HTTP Request로 Claude API를 직접 호출하는 구조로 전환.
- **카테고리별 4개 동시 생성**: HTTP Request 하나로는 1개만 생성됨 → Code 노드에서 카테고리 배열을 정의하면 n8n이 자동으로 각 항목마다 다음 노드를 반복 실행한다는 걸 발견. 구조가 단순해졌다.
- **Body에 표현식 쓰기**: n8n HTTP Request Body에서 `{{ $json.category }}` 형식으로 앞 노드 데이터를 참조할 수 있어서 카테고리·채널을 동적으로 프롬프트에 넣을 수 있었다.

## 인사이트

복잡해 보이는 자동화도 결국 "데이터를 정의하고 → API를 호출하고 → 저장한다"는 3단계고, n8n은 그 3단계를 노드 3개로 눈에 보이게 만들어준다.
