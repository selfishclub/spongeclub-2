# 텔레그램 캡처봇 설치하기 (30분, 따라만 하기)

> 목표: **텔레그램에 한 줄 보내면 → 내 개인 저장소 `inbox.md`에 자동으로 쌓이는** 것.
> 분류·복원은 그다음 "인박스 정리해줘"로 두뇌가 한다. 여기선 '캡처 파이프'만 켠다.

전체 그림:
```
[텔레그램 봇]  ──한 줄──▶  [Vercel 함수]  ──저장──▶  [내 비공개 저장소 inbox.md]
```

준비물 4가지: ① 텔레그램 봇 토큰 ② 내 비공개 저장소 ③ 깃허브 토큰 ④ Vercel 계정
(모두 무료. 계정 만드는 부분만 직접, 코드는 이미 다 돼 있음)

---

## STEP 1. 텔레그램 봇 만들기 (5분)
1. 텔레그램에서 **@BotFather** 검색 → 대화 시작.
2. `/newbot` 입력 → 봇 이름과 아이디(끝이 `bot`) 정하기.
3. BotFather가 주는 **토큰**(`123456:ABC...`)을 복사해 둔다. → 이게 `TELEGRAM_TOKEN`.
4. (선택) 내 chat id 알아두기: 봇에게 아무 말이나 보낸 뒤, 브라우저에서
   `https://api.telegram.org/bot<토큰>/getUpdates` 열면 `"chat":{"id":숫자}` 보임. → `ALLOWED_CHAT_ID`.

## STEP 2. 내 비공개 데이터 저장소 만들기 (5분)
> ⚠️ 반드시 **Private(비공개)**. 여기에 내 생각·일정이 쌓이니까.
1. 깃허브에서 **New repository** → 이름 예 `heunjeok-os-data` → **Private** 선택 → Create.
2. 이 폴더의 [`_data-template/`](./_data-template/) 안 파일들(`inbox.md`, `roles/*.md`)을
   그 저장소에 그대로 올린다. (웹에서 Add file → Upload 로 드래그해도 됨)
   → 저장소 주소가 `myid/heunjeok-os-data` 라면 이게 `DATA_REPO`.

## STEP 3. 깃허브 토큰 만들기 (5분)
1. 깃허브 → Settings → Developer settings → **Fine-grained tokens** → Generate new token.
2. **Repository access**: Only select repositories → `heunjeok-os-data` 선택.
3. **Permissions** → Repository permissions → **Contents: Read and write** 하나만 켜기.
4. Generate → 나오는 토큰(`github_pat_...`) 복사. → 이게 `GITHUB_TOKEN`.
   (⚠️ 이 토큰은 절대 공개 저장소·채팅에 붙여넣지 말 것)

## STEP 4. Vercel에 올리기 (10분)
1. [vercel.com](https://vercel.com) 로그인(깃허브 계정으로).
2. 이 `telegram-capture` 폴더를 배포한다. 가장 쉬운 길:
   - 이 폴더만 담은 **새 깃허브 저장소**(예 `heunjeok-os-capture`, 공개여도 됨 — 코드엔 비밀 없음)를 만들어 올리고,
   - Vercel → **Add New → Project → 그 저장소 Import → Deploy**.
   - (또는 터미널에서 `npm i -g vercel` 후 이 폴더에서 `vercel` 명령)
3. 배포되면 주소가 나온다: `https://heunjeok-os-capture.vercel.app`
4. Vercel → 프로젝트 → **Settings → Environment Variables** 에 아래를 넣는다
   (값은 [.env.example](./.env.example) 참고):
   - `TELEGRAM_TOKEN`, `GITHUB_TOKEN`, `DATA_REPO`
   - (선택) `ALLOWED_CHAT_ID`, `WEBHOOK_SECRET`
5. 환경변수 넣었으면 **Redeploy** 한 번.

## STEP 5. 텔레그램 ↔ Vercel 연결 (2분)
브라우저 주소창에 아래를 한 번 열면 끝 (토큰/주소 바꿔서):
```
https://api.telegram.org/bot<텔레그램토큰>/setWebhook?url=https://<내-vercel-주소>/api/telegram
```
`{"ok":true,"result":true,...}` 나오면 성공.
(WEBHOOK_SECRET 을 썼다면 뒤에 `&secret_token=<그 값>` 붙이기)

## STEP 6. 테스트 ✅
1. 내 봇에게 "테스트 한 줄" 보내기 → **"📥 담았어요 ✅"** 답장 오면 성공.
2. 내 `heunjeok-os-data` 저장소의 `inbox.md` 열어보면 그 줄이 들어와 있음.
3. 이제 클로드 코드에서 그 저장소를 열고 **"인박스 정리해줘"** → 두뇌가 역할별로 정리.

---

## 잘 안 될 때
- 답장이 안 옴 → Vercel → 프로젝트 → **Logs** 에서 에러 확인. 보통 환경변수 오타.
- `GitHub PUT 403/404` → 토큰 권한(Contents write)·`DATA_REPO` 철자·저장소 Private 여부 확인.
- `setWebhook` 이 `ok:false` → Vercel 주소 끝에 `/api/telegram` 붙였는지 확인.
- 봇이 남한테 노출돼 걱정되면 → `ALLOWED_CHAT_ID` 설정 후 Redeploy.

## 비밀 지키기 (중요)
- 토큰·PAT 는 **오직 Vercel 환경변수**에만. 코드·공개 저장소·채팅에 붙여넣지 않기.
- 데이터 저장소는 **Private** 유지.
