---
tags:
  - 우리회사
  - 브랜드
  - 아이덴티티
---
# 우리 회사 브랜드

## 핵심 규칙

1. **로고는 `brand/company-logo.png` 하나만 사용.** AI가 임의로 생성한 S 로고·워드마크 금지.
2. **컬러 팔레트는 `brand/palette.json`이 유일한 소스.** 핑크+인디고 듀오톤.
3. **강조에 핑크만 쓰지 말 것.** 메인 = 핑크 / 보조 = 인디고.

## 파일

- `company-logo.png` — 공식 로고 (1920×1080)
- `palette.md` — 사람이 읽는 팔레트 가이드
- `palette.json` — 코드/자동화용 JSON

## 팔레트

| 토큰 | HEX | 용도 |
|------|-----|------|
| Primary Pink | `#FA3381` | 메인 하이라이트 (핵심 숫자, CTA) |
| Primary Indigo | `#01005C` | 브랜드 서명 (섹션 번호, 보조 차트) |
| Overlap Purple | `#36317E` | 파생 (핑크+인디고 중첩) |

## 사용처

- 제안서 (pipeline/decks/) — Editorial Landscape Stack 팔레트에 반영
- 홈페이지 (company-landing/) — 메인 컬러 토큰
- 랜딩 (diagnostic, 서비스M) — CTA + 강조
- 광고 소재 (pipeline/creatives/) — 듀오톤
- 자동 보고서 (GBP 대시보드 등) — 차트 컬러

## 금지 사항

- 임의 로고 생성 (Imagen, 그래픽 도구로 새 S 로고 제작)
- 올드 핑크 (`#FF4FB6`, `#E63B7F`, `#E91E63`) 사용
- 핑크 단독 강조 (핑크+인디고 페어링 원칙)
