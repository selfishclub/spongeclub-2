-- 흔적 OS v2 · P0 — Supabase 스키마 추가분
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.
-- (v1의 흔적 테이블은 그대로 두고, 이 테이블 하나만 추가한다)

create table if not exists public.daily_focus (
  id            bigserial primary key,

  -- 이 '하나'가 배달될 날짜 (한국 날짜 기준). 하루에 하나만 존재한다.
  for_date      date        not null unique,
  role          text        not null,

  -- 선택된 흔적
  trace_id      bigint,
  text          text        not null,
  days_open     int,

  -- 'auto'     = 저녁에 응답이 없어 1번으로 자동 선택된 것
  -- 'approved' = 저녁에 내가 숫자로 직접 고른 것
  source        text        not null default 'auto',

  -- 저녁에 제시했던 후보 3개 (나중에 "왜 그게 떴나"를 되짚기 위해 보관)
  candidates    jsonb,

  done          boolean     not null default false,
  created_at    timestamptz not null default now(),
  delivered_at  timestamptz            -- 아침 배달 완료 시각 (중복 발송 방지)
);

create index if not exists daily_focus_for_date_idx on public.daily_focus (for_date desc);

-- 3주차에 배운 것: 서버에서 service_role 키로만 접근하므로 RLS를 켜도 앱은 그대로 동작하고,
-- 실수로 anon 키가 노출돼도 이 테이블은 읽히지 않는다.
alter table public.daily_focus enable row level security;
