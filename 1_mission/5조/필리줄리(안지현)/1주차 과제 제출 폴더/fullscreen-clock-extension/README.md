# Fullscreen Clock & Timer (Chrome 확장)

새 탭을 전체화면 **시계 · 세계시간 · 타이머 · 스톱워치**로 바꿔주는 미니멀 다크 테마 확장입니다.

## 기능
- **시계** — 현재 시각을 큰 디지털 글씨로, 날짜·요일 표시
- **세계시간** — 여러 도시의 시간을 동시에 (도시 추가/삭제, 설정 저장)
- **타이머** — 분/초 직접 입력 또는 프리셋(1·3·5·10·25분), 종료 시 알람음(외부 파일 불필요)
- **스톱워치** — 1/100초 단위, 랩 기록
- 마지막 모드·세계시간 설정은 자동 저장(localStorage)
- 단축키: `1`~`4` 모드 전환, `Space` 타이머/스톱워치 시작·정지

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
├── styles.css        # 미니멀 다크 테마
├── app.js            # 4개 모드 로직
├── gen-icons.js      # 아이콘 생성기 (재생성 시 node gen-icons.js)
└── icons/            # 16/48/128 PNG 아이콘
```

## 아이콘 다시 만들기
```
node gen-icons.js
```
