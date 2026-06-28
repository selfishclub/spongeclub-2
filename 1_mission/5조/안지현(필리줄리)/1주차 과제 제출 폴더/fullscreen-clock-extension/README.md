# SpongeClub Clock & Timer (Chrome 확장)

새 탭을 전체화면 **시계 · 세계시간 · 타이머 · 스톱워치**로. 스폰지클럽 노란 테마 + Montserrat 폰트 + 영/한 전환.

![theme](icons/icon128.png)

## 기능
- **시계 / Clock** — 큰 디지털 시각 + 날짜·요일
- **세계시간 / World** — 여러 도시 동시 표시(서울/뉴욕/런던/도쿄 기본, 추가·삭제 가능), UTC 오프셋·현지 날짜
- **타이머 / Timer** — 분·초 입력 또는 프리셋(1·3·5·10·25분), 종료 시 알람음(외부 파일 불필요), 10초 이하 빨간 경고
- **스톱워치 / Stopwatch** — 1/100초, 랩 기록
- **영/한 전환** — 우측 상단 `EN`/`한` 버튼. 탭·도시명·날짜·버튼까지 전부 전환, 선택 저장
- **스폰지 테마** — 노란 그라데이션 + 스폰지 점 텍스처 + 떠오르는 거품
- **폰트 번들** — Montserrat woff2 로컬 포함(오프라인 동작, 외부 CDN 불필요)
- **단축키** — `1`~`4` 모드 전환, `Space` 타이머/스톱워치 시작·정지

## 설치 방법 (개발자 모드 로드)
1. Chrome에서 `chrome://extensions` 접속
2. 오른쪽 위 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드** 클릭
4. 이 폴더(`fullscreen-clock-extension`) 선택
5. 새 탭을 열면 시계가 나타납니다

## 파일 구조
```
fullscreen-clock-extension/
├── manifest.json     # MV3 매니페스트 (new tab override)
├── newtab.html       # 화면 구조
├── styles.css        # 스폰지 노란 테마 + @font-face
├── app.js            # 4개 모드 + 영/한 i18n
├── fonts/
│   └── Montserrat.woff2   # 가변 폰트(400–900) 로컬 번들
├── icons/            # 16/48/128 PNG 아이콘
├── gen-icons.js      # 아이콘 생성기 (node gen-icons.js)
└── index.html        # 미리보기 전용 복사본 — 삭제해도 무방
```

## 아이콘 다시 만들기
```
node gen-icons.js
```

> 참고: 한글 글자는 Montserrat에 없어 시스템 폰트로 자연 폴백됩니다(정상). 영문·숫자는 Montserrat로 표시됩니다.
