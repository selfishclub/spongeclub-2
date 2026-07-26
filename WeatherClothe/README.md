# WeatherClothe

여행지와 날짜를 넣으면 **최근 10년 실제 기온 + D-14 예보**를 바탕으로 옷차림과 여행 준비 리스트를 만들어 주는 웹앱입니다.

- 빌드 도구 없는 정적 사이트 (HTML / CSS / Vanilla JS)
- 외부 API: [Open-Meteo](https://open-meteo.com) Geocoding · Archive · Forecast — **API 키 불필요**
- 저장은 전부 브라우저 `localStorage` (서버·DB 없음)

## 로컬 실행

```bash
npx serve .
```

## Vercel 배포

이 앱은 저장소 루트가 아니라 `WeatherClothe/` 하위에 있으므로 **Root Directory 설정이 필요합니다.**

### 대시보드에서 (권장)

1. [vercel.com/new](https://vercel.com/new) → `selfishclub/spongeclub-2` import
2. **Root Directory** → `WeatherClothe` 선택
3. **Framework Preset** → `Other`
4. Build Command / Install Command → 비워 둠 (정적 파일 그대로 서빙)
5. Deploy

`main` 브랜치에 푸시하면 자동 재배포되고, 다른 브랜치·PR은 프리뷰 URL이 생깁니다.

### CLI에서

```bash
cd WeatherClothe
npx vercel login
npx vercel          # 프리뷰 배포
npx vercel --prod   # 프로덕션 배포
```

## 배포 설정 파일

| 파일 | 역할 |
|---|---|
| [vercel.json](vercel.json) | 빌드 없음(정적) 지정, 보안 헤더, 캐시 정책 |
| [.vercelignore](.vercelignore) | 과제 문서(`docs/`)는 배포물에서 제외 |

`app.js` · `style.css`는 파일명에 해시가 없으므로 `must-revalidate`로 두어, 재배포 시 사용자가 옛 버전을 잡고 있지 않게 했습니다.

## 구조

```
index.html   화면 3분할(검색 / 준비 리스트 / 저장) + 하단 내비
style.css    라이트·다크 모드, 모바일 우선 레이아웃
app.js       지오코딩 · 날씨 조회 · 코디 조합 · 준비물 생성 · 저장 리스트
docs/        페르소나 조사, 인사이트, 솔루션 제안 (배포 제외)
```
