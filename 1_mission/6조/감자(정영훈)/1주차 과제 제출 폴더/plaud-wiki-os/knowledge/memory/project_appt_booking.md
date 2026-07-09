---
name: 대면 상담 예약 시스템 (diagnostic.company.kr/book)
description: 영업 병목(리드→미팅 연결) 해결용 셀프 예약 시스템. MVP 라이브 (2026-04-20)
type: project
originSessionId: c5a86f76-507a-40a3-a44a-b6a6a7138a15
---
# 대면 상담 예약 시스템 (2026-04-20 라이브)

## 병목 배경
Meta 광고로 리드 유입 → 전화·카톡 응답 없음 → 대면 미팅만 잡히면 계약 거의 확정. 
핵심: **리드 → 대면 미팅 예약** 구간의 마찰 제거.

## 엔드포인트
- 페이지: https://diagnostic.company.kr/book (+ ?inquiry=UUID 파라미터)
- 슬롯 조회: `GET /api/book-slots` → {slots[], count}
- 예약 제출: `POST /api/book-submit`

## DB 스키마 (Supabase)
- `crm_appointment_slots` — 관리자 수동 슬롯 (slot_datetime unique, is_available)
- `crm_appointments` — 예약 건 (slot_id FK, clinic/phone/address/size/urgency/status)
- 트리거: 예약 생성 → 슬롯 자동 비활성화, 취소/노쇼 → 슬롯 재오픈

## 슬롯 정책 (Q1 수동 고정 채택)
- 월~금 14:00 / 16:00 / 18:00 KST
- 초기 시드: 4/21~5/11 중 평일 × 3슬롯 = 42개 (어린이날 5/5 제외)
- 슬롯 추가: `crm_appointment_slots` INSERT 또는 Dashboard에서 수동

## 리드→예약 연결
Meta 인스턴트폼 SMS 에 `/book?inquiry={inquiry_id}` 링크 포함. 폼 제출 시 inquiry_id 이어붙여 CRM 리드-예약 1:1 매칭.

## SMS 구조 (앵글별)
`api/meta-leadgen.py` `_build_sms`:
- {greeting} + 앵글 훅 1줄 + 방문예약 URL + 전화번호 [연락처]
- `_ANGLE_HOOKS[slot]`: A/A2/B/C/D/F/H/N 슬롯별 1줄 맥락 문구

## 리마인더 (company-pipeline)
- `appt-reminder.py` + cron `*/15 * * * *`
- D-1 18:00 (내일 예약 건) + D-0 예약 2h 전
- 중복 방지: `/tmp/company-appt-reminder.log` 파일 기반

## 알림 파이프라인
1. 예약 제출 → Supabase 저장
2. Telegram 즉시 알림 (사용자 폰)
3. Solapi SMS 확정 (원장)
4. cron 리마인더 (D-1, D-0 2h)

## Why
"전화 안 받는 원장"을 "편한 시간 스스로 예약하는 원장"으로 전환. 미팅만 잡히면 클로징율 높음.

## How to apply
- 슬롯 확장/조정: Supabase Dashboard `crm_appointment_slots` 직접 관리
- 카피 수정: `api/meta-leadgen.py` 의 `_ANGLE_HOOKS` 또는 `/book` 페이지
- 예약 현황 조회: Supabase `crm_appointments` (Telegram 실시간 알림도 있음)

## 다음 확장 (V2 후보)
- Google Calendar 연동 (슬롯 자동 동기화)
- 노쇼 리드 자동 follow-up 시퀀스
- 예약률 / 참석률 / 전환율 대시보드
