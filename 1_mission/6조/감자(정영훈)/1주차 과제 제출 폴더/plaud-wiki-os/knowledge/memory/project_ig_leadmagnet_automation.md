---
name: project-ig-leadmagnet-automation
description: IG 릴스 댓글→리드 자동화. 하이브리드 — ManyChat 발송 + 자체 웹훅 Supabase 적재 + 로컬 어드민
metadata: 
  node_type: memory
  type: project
  originSessionId: 3255a9fe-2e17-477e-87dd-a10e159a46fd
---

`company-ig-leadmagnet/` (웹훅) + `lead-magnet-admin/` (로컬 어드민). @company_marketing(ig_id [IG_ID], page [PAGE_ID]) 릴스 댓글 리드매그넷.

**구조 = 하이브리드 (2026-05-27 확정)**:
- **발송 = ManyChat** (리모션 키워드에 이미 사용자가 돌리고 있음). ManyChat은 IG 메시징 Advanced Access 보유.
- **자체 웹훅 = Supabase 적재 전용** (`SEND_ENABLED` 미설정=off). 댓글 수신→`ig_leads` 적재. 발송/공개답글 비활성(ManyChat과 충돌·거짓답글 방지).
- **로컬 어드민** = ig_leads·lead_magnets·jobs + Meta 계정 현황 + 레퍼런스 링크→내 버전 PDF 생성요청. node+express, http://localhost:4321.

**중요 정정 (이전 메모리 오류)**: META_ADS_TOKEN에 `instagram_manage_messages`가 granted로 보였지만 **Standard Access**일 뿐. 일반인에게 DM 발송하려면 **Advanced Access = Meta App Review 필요**(미통과). 즉 "코드로 발송까지 자체구축 가능"은 **틀렸음** — 발송은 심사 관문이 실재. 수신(comments 웹훅)·공개답글·적재는 됨. 진단: `me/messages` recipient.id → `(#200) Advanced Access 없음, subcode 2534048`.

비용 증분 0 (Vercel Hobby + 기존 Supabase). PDF는 company-guide Vercel에 공개 호스팅. Vercel 팀 프로젝트 기본 SSO 보호 ON → 공개하려면 `ssoProtection:null` PATCH.

**남은 선택지(미착수)**: ① 어드민 "생성" 워커 — lead_magnet_jobs 큐를 로컬 claude가 처리해 레퍼런스→오리지널 재구성 PDF+DM 초안 (원본 복제 금지). ② 새 게시물 자동감지 팩토리(launchd 폴러+캡션 마커 `#리드_<키워드>`→생성→iMessage 승인→GDrive 아카이브+lead_magnets 등록, 웹훅을 레지스트리 조회로 리팩터). ③ Advanced Access 심사 추진 시 발송까지 자체화(ManyChat 대체). 관련: [[project_imessage_listener]] [[feedback_artifact_storage_policy]]
