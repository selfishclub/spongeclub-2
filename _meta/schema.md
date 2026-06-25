# Frontmatter 스키마

각 마크다운 파일 상단 YAML frontmatter에 들어가는 필드 정의입니다.

## 자기소개.md

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|:---:|------|------|
| `member` | string | ✅ | 멤버 닉네임 | `dani` |
| `crew` | string | ✅ | 소속 조 | `A조` |
| `domain` | string | ✅ | 관심·작업 분야 | `프론트엔드` |
| `github` | string | ✅ | GitHub 아이디 | `selfishclub` |
| `goal` | string | ✅ | 6주 뒤 만들고 싶은 것 | `포트폴리오 사이트` |

## 주차 submission.md (W1~W6)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|:---:|------|------|
| `member` | string | ✅ | 멤버 닉네임 | `dani` |
| `crew` | string | ✅ | 소속 조 | `A조` |
| `week` | number | ✅ | 주차 (1~6) | `1` |
| `type` | string | ✅ | 문서 유형 (고정값 `weekly`) | `weekly` |
| `title` | string | ✅ | 제출물 제목 | `첫 배포 성공` |
| `summary` | string | ✅ | 한 줄 요약 | `Vercel로 첫 배포 완료` |
| `date` | string | ✅ | 작성일 (YYYY-MM-DD) | `2026-06-25` |
