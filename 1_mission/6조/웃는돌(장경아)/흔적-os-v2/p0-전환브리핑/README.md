# P0 — 전환 브리핑 🫧

> **하루 2터치, 전환 1개.** 밤에 내일의 '하나'를 묻고, 아침에 그걸 되돌려준다.
> PRD: [`../PRD.md`](../PRD.md) · 계획: [`../구현계획.md`](../구현계획.md)

```
🌙 21:30   "내일 본업 시작할 때, 뭐 하나 할까요?"   → 숫자 하나 답장
              (안 해도 됨. 1번으로 자동 · 아침에 그렇다고 밝힘)

🟢 09:00   "본업 모드예요. ▸ 지금 이거 하나 — ___"   → 읽으면 끝
```

## 왜 이렇게 생겼나

v1은 **내가 불러야만** 작동했고, 그래서 안 부르게 됐고, 그러자 던질 이유도 사라졌다. P0는 그 반대로 만든다.

| 결정 | 이유 |
|---|---|
| 전환을 **하나만** 고른다 | 저강도 다빈도 nudge는 알림 피로로 죽는다. 4주차에 배운 것 — 좁히는 결정이 곧 제품력 |
| 우선순위를 **AI가 안 정한다** | 틀린 추천 몇 번이면 신뢰가 무너진다. 지금은 `가장 오래 열린 순` 규칙뿐 |
| 아침 메시지에 **버튼이 없다** | 읽는 것만으로 가치가 완결돼야 한다 (Readwise형) |
| 자동 선택이면 **그렇다고 밝힌다** | 근거 없는 확신을 주지 않는 것이 신뢰의 조건 |
| 후보가 없으면 **안 보낸다** | 조용함이 기능이다 |
| 스트릭·점수가 **없다** | 이미 지친 사람에게 죄책감을 주지 않는다 |

## 구조

```
p0-전환브리핑/
├── api/
│   ├── cron-evening.js   🌙 저녁 승인 요청
│   ├── cron-morning.js   🟢 아침 배달
│   └── telegram.js       💬 숫자=승인 / 완료=닫기 / 그 외=캡처
├── lib/
│   ├── store.js          🔧 Supabase 어댑터 — 스키마 다르면 여기만 수정
│   ├── brief.js          문안 생성 + KST 날짜 (순수 함수)
│   ├── telegram.js       발송 helper
│   └── auth.js           cron 보호
├── schema.sql            daily_focus 테이블 하나
├── vercel.json           cron 2개
└── test/dry-run.js       배포 전 모킹 테스트
```

의존성 없음 (Node 18+ 내장 `fetch`만).

---

## 설치 (30분)

### STEP 0. 먼저 정할 것 2개
- **대상 전환** — 5개 역할 중 가장 비싼 전환 하나. 기본 가설은 `엄마 → 본업`(= `FOCUS_ROLE=본업`)
- **두 시각** — 기본 21:30 / 09:00

> ⚠️ 이 둘이 틀리면 P0 전체가 헛돈다. 코드 수정 없이 환경변수·`vercel.json`으로 바꿀 수 있다.

### STEP 1. 테이블 추가
Supabase → SQL Editor 에 [`schema.sql`](./schema.sql) 붙여넣고 Run.
v1 흔적 테이블은 **건드리지 않는다.** `daily_focus` 하나만 추가된다.

### STEP 2. 스키마 확인
`lib/store.js` 상단의 `TRACES` / `C` 가 v1 테이블과 맞는지 본다.
```js
const TRACES = "traces";
const C = { id, role, kind, text, done, createdAt };
```
다르면 **이 파일만** 고치면 된다. 나머지 파일은 저장소 구조를 모른다.

### STEP 3. 배포 전 테스트
```bash
node test/dry-run.js
```
텔레그램·Supabase 없이 전 구간을 가짜로 돌린다. 실제 메시지 문안이 그대로 출력되니 **눈으로 톤부터 확인**할 것. `🟢 PASS` 가 떠야 다음으로.

### STEP 4. 환경변수
[`.env.example`](./.env.example) 참고. Vercel → Settings → **Environments**.
> 2주차 교훈 둘: ① 메뉴는 `Environments` 안에 있다 ② **값을 바꾸면 Redeploy 해야 반영된다.**

`CRON_SECRET`은 반드시 설정한다. 없으면 주소만 알면 누구나 브리핑을 강제 발송할 수 있다.

### STEP 5. 배포 + webhook
```bash
# webhook 연결 (bot 뒤에 토큰을 바로 붙인다 — 2주차에 401 났던 그 지점)
curl "https://api.telegram.org/bot<토큰>/setWebhook?url=https://<프로젝트>.vercel.app/api/telegram"
# → {"ok":true} 확인
```

> ⚠️ **봇 하나에 webhook은 하나만 걸린다.** 기존 `imprint-os-app`의 webhook을 이쪽으로 돌리면 v1 캡처가 끊긴다.
> → `api/telegram.js` 의 `captureFallback()` 에 v1 분류 로직을 연결하거나 (P1에서 정식으로 함),
> → 아니면 이 코드를 **기존 앱 안으로 복사**해서 합치는 편이 낫다 (권장).

### STEP 6. 켜기 전 손으로 한 번
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<프로젝트>.vercel.app/api/cron-evening
```
텔레그램에 저녁 질문이 오면 성공. 숫자로 답한 뒤 `/api/cron-morning` 도 같은 방식으로 확인.

---

## ⏰ cron 정확도에 관한 정직한 주의

Vercel의 cron은 플랜에 따라 **실행 빈도와 시각 정확도가 다르다.** 무료(Hobby) 플랜은 하루 1회 수준으로 제한되고, 지정한 분(分)에 정확히 도는 게 아니라 **그 시간대 안 어디쯤** 실행될 수 있다. `vercel.json`의 두 cron은 각각 하루 1회라 빈도 제한엔 걸리지 않지만, **"9시 정각"이 중요하다면 이 방식으로는 부족할 수 있다.**

배포 후 며칠 실제 도착 시각을 확인해보고, 흔들림이 크면:
- **cron-job.org** 나 **GitHub Actions** 로 같은 URL을 `Authorization: Bearer $CRON_SECRET` 헤더와 함께 때리기 (무료·분 단위 정확)
- 또는 Vercel 유료 플랜

두 엔드포인트는 **누가 불러도 상관없게** 설계돼 있다 (`delivered_at` 으로 중복 발송을 막는다).

---

## 4주 뒤에 볼 것

P0의 성패는 배포 여부가 아니라 **4주 뒤에도 살아 있는가**다. (PRD §8)

- [ ] 저녁·아침 메시지 **7일 연속** 도착
- [ ] 저녁 승인 **주 4일 이상**
- [ ] 아침에 고른 하나를 끝낸 날 **주 3일 이상**
- [ ] 무시율 **30% 이하** — 넘으면 즉시 빈도를 낮춘다

> 데이터는 `daily_focus` 에 다 쌓인다. `source`(auto/approved)와 `done` 만 세면 위 지표가 그대로 나온다.
> 이 숫자들이 **P3 주간 리듬 리포트의 재료**가 된다 — *"아침에 고른 하나를 끝낸 날 4/7"*.
