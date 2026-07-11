---
name: 퍼스널 브랜딩 카드뉴스
description: 인스타/틱톡/스레드/블로그용 카드뉴스 템플릿 시스템. Pencil 기반 + 리텐션 8장 구조 + 7종 reusable 템플릿
type: project
originSessionId: 786aa3c7-b776-4d8a-84c6-a8238478f0a6
---

병원마케팅 대표 개인 퍼스널 브랜딩 콘텐츠 엔진.

**포지셔닝:** AI×마케팅 + 병원 실전 + 개인
**엣지 3축:** 🗺️ 구글 지도 상위노출 / 🤖 AI 검색 최적화 / ⚒️ Claude Code 활용
**서명:** "병원마케팅 대표" / "구글 지도 · AI 검색 최적화"
**채널:** 인스타(주), 틱톡·스레드·블로그(후)

**Why:** 기존 content-engine 대시보드 UI 실패. 이번엔 디자인부터 잡아 로컬 퍼스트 진행. blinked-cardnews-kit의 63/37 레이아웃 법칙 차용.

---

## 핵심 원칙

**존댓말 필수.** 원장님 대상 콘텐츠는 전 문장 존댓말. 카드 제작 시 하드코딩 반말("~다", "~이다") 금지.

**권위 장치.** 공식 인용(Google Business Profile Help 등) + 배지 형식 사용. 모든 주장은 [공식] / [실전 분석] 구분.

**리텐션 8장 프레임 (기승전결):**
- 01 Hook — 후킹 질문·충격 숫자 (이미지)
- 02 Empathy — 흔한 실패 공감 (이미지)
- 03~05 Core — 핵심 3개 (이미지/텍스트 섞음)
- 06 Turn — 반전·시너지 (텍스트)
- 07 Summary — 체크리스트·저장 유도 (텍스트)
- 08 CTA — 저장·DM·팔로우 3단 (텍스트)

**CTA 3단.** 🔖 저장(가벼움) + 💬 DM 유도(오렌지 강조, 중간) + ➕ 팔로우(강). 단일 버튼 금지.

**이미지 배치 (기본 3장 자동 안배).** 시리즈 리듬을 만드는 3개 지점만 이미지, 나머지 5장 텍스트.
- **01 Hook (필수)** — 스크롤 멈춤용 첫 인상
- **02 Empathy 또는 03 Core 첫 장** — 감정 진입 / 권위 진입 (공식 인용 병치)
- **06 Turn 또는 07 Summary** — 중반 리텐션 복귀 / 저장 유도 직전 임팩트

정보형 시리즈 = 01/03/07, 스토리형 = 01/02/06 식으로 주제에 맞춰 배치. 시리즈 작업 시 "이미지 3장 위치와 이유"를 한 줄 보고.

---

## 디자인 토큰

- bg-cream `#F5F1EA`
- bg-dark `#121212`
- accent-orange `#FF5B2E`
- text-ink `#111111`
- text-sub `#6B6B6B`
- 폰트: Pretendard

**폰트 사이즈 (큰 텍스트 기준 · 텍스트 카드):**
- 라벨 pill: 22
- pageIndex: 20
- 섹션 태그: 16
- 헤드라인: 52~56
- 공식 인용: 26 (quote), 16 (source), 14 (OFFICIAL 배지), 28 (❝)
- 전술 row title: 28 / row desc: 22
- 서명 이름: 22 / 설명: 18
- 계속·END: 20

**이미지 카드 폰트:**
- 큰 인용구 헤드라인: 60~64
- 글라스 인용 박스: 22 (text), 14 (배지), 20 (pill text)

---

## 작업 파일 & 위치

- **최종 8장 라인(INSIGHT-06):** `y=13300`, `x=0~8400`
- **블록 창고 (y=3100 아래):** cmp/Header · Footer · CTAButton · KeyNumber · StepCard · CompareCard · CardShell-A/B
- **파일:** `/Users/user/Desktop/claude code/personal-brand/cardnews.pen`

---

## 7종 Reusable 템플릿 (2026-04-23 확정)

모두 1080×1350, 63/37 법칙 또는 전체 크림. reusable:true로 마크됨.

| ID | 이름 | 구조 | 사용처 |
|---|---|---|---|
| `pmMBy` | cmp/Card-Image-Hook | 상단 이미지 + 글라스 라벨 + 큰 인용 / 하단 크림 + HOOK 태그 + 서브 + 서명 | 01 Cover |
| `1dvKO` | cmp/Card-Image-Empathy | 상단 이미지 + 큰 질문 / 하단 크림 + EMPATHY 태그 + ❌ 4줄 + 결론 | 02 공감 |
| `gHAIZ` | cmp/Card-Image-Body | 상단 이미지 + 글라스 공식 인용 / 하단 크림 + 헤드라인 + 전술 4개 | 03 Core(첫) |
| `KtGzj` | cmp/Card-Text-Body | 전체 크림 + 라벨 + 공식 인용 박스 + 헤드라인 + 전술 4개 | 04·05 Core |
| `EEEZ0` | cmp/Card-Text-Turn | 전체 크림 + TURN 태그 + 헤드라인 + 3 rows + 결론 | 06 반전 |
| `rxDDq` | cmp/Card-Text-Summary | 전체 크림 + SUMMARY 태그 + 헤드라인 + 3축 체크리스트 12개 + 저장 힌트 | 07 요약 |
| `0l2FF` | cmp/Card-Text-CTA | 전체 크림 + ACTION 태그 + 헤드라인 + 서브 + 3단 CTA + 출처 + 서명 | 08 CTA |

---

## 새 시리즈 제작 워크플로

1. **주제 확정 + 공식 소스 확인** — 기억 의존 금지. WebFetch로 공식 문서 인용구 확보.
2. **카피 초안 텍스트로 승인** — 크레딧 아끼기 위해 Pencil 넣기 전에 텍스트로 교정.
3. **카드 8장 copy 제작:**
   - `C("<templateId>", "document", {x, y, descendants: {...}})`으로 템플릿 복제
   - descendants에 기존 원본 자식 id + 새 content override
   - 원본 자식 id는 `batch_get([templateId], readDepth:5)`로 확인
4. **이미지 카드 재생성:** `G("<bgImageId>", "ai", "prompt")` — 크레딧 소모
5. **서명은 자동 유지:** "병원마케팅 대표" / "구글 지도 · AI 검색 최적화"
6. **완성 후 스크린샷 확인.** 인스타 업로드는 수동 (PNG export 파이프라인은 추후).

---

## 완료 (2026-04-21 ~ 04-23)

- 시안 A/B 2종 확립 (크림 매거진 / 풀블리드 시네마)
- 블록 창고 9개 (Header/Footer/CTA/KeyNumber/StepCard/CompareCard/CardShell-A/B)
- INSIGHT-01~04 4개 참고 시리즈 (y=1500·5500·8500·10100·11700)
- **INSIGHT-06 · 리텐션 8장 풀세트 (구글 지도 상위노출)** — 최종 (y=13300)
- 7종 reusable 템플릿 마킹
- 전 카드 존댓말 전환 완료

## 미착수

- TIP / CASE / ME 다른 주제 시리즈
- DM 자동 응답 (`지도` 키워드 → 체크리스트 PDF 발송)
- PNG export → 인스타 자동 업로드 파이프라인
- Remotion 연결 → MP4 릴스 추출
- 플랫폼별 변환 (틱톡 9:16 · 스레드 텍스트 · 블로그 롱폼)
