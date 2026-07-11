---
tags:
  - 우리회사
  - 운영
---
# 사용 도구 & API 맵

> 관련 원칙: [[mentor-k-systems]]

## 핵심 도구

| 도구 | 용도 | 연동 상태 |
|------|------|----------|
| **Claude Code** | 개발, 자동화, 멘토 | 주력 도구 |
| **Notion (나의 OS)** | 미션 관리, 게이미피케이션 | 활성 |
| **pluuug** | CRM, 파이프라인 | API 키 있음, 미연동 |
| **그랜터** | 재무/지출 관리 | API 연동 완료 |
| **텔레그램** | 알림, 핑, 업무일지 | 봇 2개 가동 |
| **Google Workspace** | 이메일, 드라이브, 시트 | ~n만원/월 |

## 마케팅 도구

| 도구 | 용도 | 상태 |
|------|------|------|
| **DataForSEO** | GBP 그리드 랭킹 스캔 | 연동 완료, n개 병원 |
| **Meta Ads** | 리드 광고 | 토큰 있음 (만료 주기 관리) |
| **Google Places API** | 진단 리포트 자동 생성 | 연동 완료 |

## 자동화 인프라

| 구성요소 | 위치 | 비고 |
|---------|------|------|
| pipeline | daily-automation, webhook, daemon | launchd 가동 |
| gbp-local | 랭킹 스캔, 리포트 생성 | Express 서버 |
| 멘토K봇 | YouTube → 온톨로지 | launchd 등록, IP차단 중 |
| threads-bot | SNS 콘텐츠 자동 생성 | launchd 가동 |

## API 키 위치

| API | 키 저장 위치 | 비고 |
|-----|-------------|------|
| pluuug | 미설정 | openapi.pluuug.com/v1 |
| 그랜터 | daily-automation.py 내 하드코딩 | .env 분리 필요 |
| DataForSEO | server.ts 내 하드코딩 | .env 분리 필요 |
| Meta Ads | pipeline/.meta_token | 60일 갱신 |
| 텔레그램 | 각 스크립트 내 하드코딩 | .env 분리 필요 |
| Google OAuth | 멘토K봇/token.json | |
