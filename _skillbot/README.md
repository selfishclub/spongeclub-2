# 스킬봇 (skillbot)

스폰지 스킬러스 2기 — 슬랙 슬래시커맨드로 스킬을 카탈로그 포맷으로 **올리고 검색**하는 봇.
Next.js(App Router) + Vercel. 슬랙이 저장소(SoT), 별도 DB 없음.

- `/스킬등록` → 올리기 모달 → 채널에 게시
- `/스킬검색 <키워드>` → 채널 카탈로그에서 매칭(스킬명·설명·카테고리) → 본인만 보이는 결과(같은 스킬 합산·평균점수·링크)
- 운영 도메인: `https://sponge-skillers.vercel.app`

- 인계·운영 정보: [`HANDOFF.md`](HANDOFF.md)
- (설계·구현 플랜 문서는 운영자 쪽에만 있음)

## 게시 결과 미리보기

채널엔 코드박스 제목 한 줄(부모)만:
```
[개발] 비디오메이커 - 코드로 영상 만들어주는 스킬 · 4/5
```
점수를 안 넣으면(=찜) `· 4/5` 없이 올라감. 상세는 봇이 첫 댓글로, 이미지·영상은 사람이 그 스레드에 댓글로 첨부.

## 로컬 개발

```bash
cd _skillbot
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev        # http://localhost:3000
npm test           # vitest (26 tests)
npm run typecheck
npm run build
```

환경변수 3개 (`.env.local`):
```
SLACK_SIGNING_SECRET=   # 슬랙 앱 Basic Information
SLACK_BOT_TOKEN=xoxb-   # OAuth & Permissions 설치 후
SKILL_CHANNEL_ID=       # 게시 대상 채널 ID (모달 폴백용)
```
⚠️ `.env.local`·토큰은 git에 안 올라감(`.gitignore`). 절대 커밋 금지.

## 배포 + 슬랙 연결 (에밀리, 1회)

1. **Vercel** 새 프로젝트 import → **Root Directory = `_skillbot`**.
2. 환경변수 3개(`SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`, `SKILL_CHANNEL_ID`) 등록.
3. 첫 배포 → 도메인 확정(예: `https://skillbot.vercel.app`).
4. `api.slack.com/apps` → **Create New App**(From scratch) → 워크스페이스 = 스폰지클럽.
5. **Slash Commands** → 커맨드 **2개** 등록 (둘 다 Request URL = `<도메인>/api/slack/command`):
   - `/스킬등록`
   - `/스킬검색`
6. **Interactivity & Shortcuts** → ON, Request URL = `<도메인>/api/slack/interactivity`.
7. **OAuth & Permissions** → Bot Token Scopes에 `commands`, `chat:write`, `channels:history`, `groups:history`(비공개채널 대비) 추가 → 워크스페이스 설치 → `xoxb-` 토큰 확보.
8. **Basic Information** → Signing Secret 확보. (7·8의 값을 2단계 Vercel 환경변수에 채우고 **redeploy**.)
9. 채널에서 `/invite @스킬봇` (검색하려면 봇이 그 채널에 있어야 함). 채널 ID를 `SKILL_CHANNEL_ID`에 넣고 redeploy.

> 5·6에서 Request URL 저장 시 슬랙이 자동 검증 핑을 보냄 → 200 떠야 저장됨(배포·시크릿이 먼저 준비돼야 함).
> 스코프 추가/변경 시 **Reinstall** 필요 (토큰은 보통 유지되지만, 안전하게 재복사해 env 갱신 권장).

## 스모크 체크리스트 (테스트 채널 권장)

- [ ] `/스킬등록` → 모달 바로 오픈, 8칸(점수·더하고싶은말은 선택)
- [ ] 점수 4 + 전부 채워 제출 → 채널에 코드박스 제목 + 봇 댓글(섹션·올린사람 멘션·하단 안내)
- [ ] 점수 비워 제출 → 제목에 `· N/5` 없음(찜)
- [ ] 링크 빈칸/형식오류 → 제출 막힘(에러 표시)
- [ ] 봇 댓글 스레드에 이미지 댓글 첨부 정상
- [ ] `/스킬검색 영상` → 매칭 결과 본인만 보이게 뜸(없으면 skillers-finder 안내)
- [ ] `/스킬검색`(키워드 없이) → "검색어를 같이 입력해줘" 안내

## 후속 (같은 앱에 추가 예정)

- 푸시 멘트 (월·수·금·토 스케줄) — W2
- 웹 대시보드 2뷰(전체·주차별) — 후속 (`/` 경로에 올림)

## 검색 동작 메모

- `conversations.history`로 채널 최근 메시지(기본 200)를 읽어 코드박스 제목만 파싱 → 키워드 매칭.
- 같은 스킬명끼리 합산(글 수·써봤/찜·평균점수), 글 많은 순 정렬, 상위 5개 + 슬랙 링크.
- 봇이 채널에 **초대돼 있어야** 읽을 수 있음. 데이터(올라온 스킬)가 쌓일수록 유용.
