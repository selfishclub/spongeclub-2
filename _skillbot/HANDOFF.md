# HANDOFF — 스킬봇 인계 정보

> 이 폴더는 **소스 클린 사본**이에요. 운영자(에밀리) 작업방에서 소스만 떼어 온 것이고,
> 운영안·명단·메모리 같은 내부 자산은 넘어오지 않았어요.

## 이게 뭐 하는 앱인가

- 스폰지 스킬러스 2기 슬랙봇. `/스킬등록` 으로 스킬을 카탈로그 포맷으로 올리고, `/스킬검색` 으로 찾아요.
- 웹(`/` 경로) = 채널에 올라온 스킬을 미러링하는 **발견 카탈로그** 뷰.
- **별도 DB가 없어요. 슬랙 채널 자체가 저장소(SoT)예요.** → 채널이 살아 있어야 앱이 의미가 있어요.

## 배포

| 항목 | 값 |
|---|---|
| 플랫폼 | Vercel (Next.js App Router) |
| **Root Directory** | **`_skillbot`** ← 이 값 빠뜨리면 빌드 실패해요 (모노repo라 자동 인식 안 됨) |
| 빌드 | `npm run build` (기본값 그대로) |
| 현재 운영 도메인 | `https://sponge-skillers.vercel.app` |

⚠️ **Vercel 프로젝트 설정은 repo에 안 들어 있어요.** 새로 붙일 땐 Root Directory를 직접 넣어야 해요.

⚠️ **무료(Hobby) 플랜에서는 다른 사람이 push한 커밋이 배포되지 않아요.**
빌드 실패처럼 보이지만 실제로는 `Deployment Blocked — commit author did not have contributing access` 이고
빌드 로그도 안 남아요. 협업하려면 Pro(좌석당 과금)여야 해요.

## 환경변수 3개

값은 여기에 안 적어요. 이름과 발급처만요.

| 이름 | 어디서 |
|---|---|
| `SLACK_SIGNING_SECRET` | 슬랙 앱 → Basic Information |
| `SLACK_BOT_TOKEN` | 슬랙 앱 → OAuth & Permissions (워크스페이스 설치 후 `xoxb-` 토큰) |
| `SKILL_CHANNEL_ID` | 게시 대상 슬랙 채널 ID |

**값을 바꾸면 반드시 redeploy 해야 반영돼요.** (안 하면 401로 조용히 죽어요)

## 외부 연동과 소유자

| 연동 | 소유 | 넘어가나 |
|---|---|---|
| 슬랙 앱 | **슬랙 워크스페이스(스폰지클럽)** | ❌ 안 따라가요. 워크스페이스가 바뀌면 `slack-manifest.yml` 로 **새로 만들고 토큰 재발급** |
| Vercel 프로젝트 | 배포한 계정 | 계정 옮기면 Transfer 또는 새로 Import |
| 도메인 | Vercel 기본 도메인 사용 중 | 커스텀 도메인 없음 |

슬랙 앱을 새로 만들 땐 `slack-manifest.yml` 안의 URL 3곳을 **새 배포 도메인으로 바꿔야** 해요.

## 죽었을 때

1. **슬래시 커맨드가 무응답** → Vercel 배포 상태부터. 그다음 슬랙 앱 Request URL이 현재 도메인과 맞는지.
2. **401 / 인증 실패** → 토큰 갈고 **redeploy 안 한 경우**가 대부분이에요.
3. **검색이 빈 결과** → 봇이 그 채널에 초대돼 있어야 읽을 수 있어요. `/invite @스킬봇`
4. **앱 자체가 날아감** → `slack-manifest.yml` 로 재생성 → 토큰 재발급 → Vercel 환경변수 교체 → redeploy.

## 안 넘어온 것

- 운영자 하네스 (`CLAUDE.md`, `.claude/`, 메모리)
- 2기 운영안·선발대 명단·운영 캘린더
- 설계/구현 플랜 문서
- `.env.local` 실제 값 (git에 올라간 적 없어요)
