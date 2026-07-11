# AI 전화 에이전트 — 커미션 스플릿 확인 콜

부동산 리로케이션 컨설팅 업무 중 매번 반복되는 "에이전트한테 전화해서 커미션 스플릿 확인하기"를
AI 음성 에이전트([Vapi](https://vapi.ai))가 대신 걸어주도록 만든 도구.

## 왜 이 통화부터?

전화 자체가 싫은 게 진짜 마찰점인데, 그중에서도 **본인 인증이 필요 없는 통화**부터 시작하는 게 안전하다.
- 에이전트 커미션 확인 = 매물 주소만 있으면 되는 정보성 질문 → AI가 대신 걸어도 무리 없음
- PECO·신용카드사처럼 본인 인증(계정번호·생년월일 등)이 필요한 통화는 계정 보안·사기 탐지 이슈가 있어서 다음 단계로 미룸

## 준비물 (직접 가입 필요 — 결제 수단 등록)

1. [vapi.ai](https://vapi.ai) 가입 (Google 계정으로 가능)
2. 대시보드 → **API Keys** → Private Key 복사
3. 대시보드 → **Phone Numbers** → **Buy Number** (Twilio 계정 없이 Vapi 자체 번호로 충분)
4. 구매한 번호의 **Phone Number ID** 복사

## 사용법

```bash
cp .env.example .env
# .env 에 VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, TARGET_PHONE_NUMBER 채우기
export $(cat .env | xargs)   # 또는 dotenv 라이브러리 사용
node make-call.js "123 Main St, Philadelphia PA"
```

`assistant-config.json` 안의 `voiceId`는 Vapi 대시보드 → **Voice Library** 에서 원하는 목소리 골라 교체.

## 지금 할 수 있는 것 / 다음 단계

- ✅ 매물 주소 입력하면 AI가 에이전트에게 전화해서 커미션 스플릿·특이사항 확인
- ⏭ 2단계: 통화 결과를 자동으로 요약해서 고객 리포트 이메일 초안까지 생성
- ⏭ 3단계: 본인 인증이 필요한 통화(PECO, 카드사 등)로 확장 — 계정 정보를 AI에게 안전하게 넘기는 방법 검토 필요
