-- ============================================================
-- 🏌️ Golf Rank — Supabase 스키마 (앱 구조에 맞춘 JSONB 버전)
-- Supabase → SQL Editor 에 통째로 붙여넣고 Run
-- ⚠️ 맨 위 DROP 이 예전 테이블들을 정리해요 (아직 실제 데이터 없으니 안전)
-- ============================================================

drop table if exists comments        cascade;
drop table if exists announcements    cascade;
drop table if exists handicap_history cascade;
drop table if exists hole_scores      cascade;
drop table if exists round_players    cascade;
drop table if exists scores           cascade;
drop table if exists guests           cascade;
drop table if exists schedules        cascade;
drop table if exists rounds           cascade;
drop table if exists members          cascade;
drop table if exists invitations      cascade;
drop table if exists clubs            cascade;


-- 1. 모임 ---------------------------------------------------
create table clubs (
  id           text primary key,          -- 앱이 만든 id (club_...) 그대로 사용
  name         text not null,
  description  text,
  ranking_type text default 'score',
  max_members  int  default 20,
  club_code    text,
  created_by   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2. 멤버(로스터) ------------------------------------------
create table members (
  id               text primary key,       -- 앱 member id (me, m_...)
  club_id          text references clubs(id) on delete cascade,
  name             text not null,          -- 실명
  nickname         text,                   -- 닉네임(표시 이름)
  role             text default 'member',  -- owner(모임장)/staff(운영진)/member
  handicap         float,                  -- 기준 핸디(최근 3R 평균)
  experience_years int,                    -- 구력
  life_best        int,                    -- 라베
  gender           text,
  tee              text,
  age_group        text,
  goal_score       int,
  avatar           text,                   -- 프로필 사진(지금은 dataURL, 나중에 Storage)
  created_at       timestamptz default now()
);
create index idx_members_club on members(club_id);

-- 3. 라운드 (점수는 JSON 덩어리로) --------------------------
create table rounds (
  id         text primary key,             -- 앱 round id (round_...)
  club_id    text references clubs(id) on delete cascade,
  date       date not null,
  course     text,
  par        int  default 72,
  scores     jsonb not null default '[]',  -- [{playerId,name,role,total,holes,holesRel,front,back,source}]
  media      jsonb default '[]',           -- [{id,type,mime}]  (파일은 IndexedDB/Storage)
  source     text,                         -- total|manual|ocr
  created_at timestamptz default now()
);
create index idx_rounds_club on rounds(club_id);

-- 4. 일정 (예정 라운드) ------------------------------------
create table schedules (
  id         text primary key,
  club_id    text references clubs(id) on delete cascade,
  date       date not null,
  tee_time   text,
  course     text,
  memo       text,
  created_at timestamptz default now()
);
create index idx_sched_club on schedules(club_id);

-- 5. 공지사항 (소셜) ---------------------------------------
create table announcements (
  id          uuid default gen_random_uuid() primary key,
  club_id     text references clubs(id) on delete cascade,
  author      text,                        -- 작성자(로그인 전엔 이름)
  author_role text,
  body        text not null,
  pinned      boolean default true,
  created_at  timestamptz default now()
);
create index idx_ann_club on announcements(club_id);

-- 6. 댓글 (소셜) -------------------------------------------
create table comments (
  id          uuid default gen_random_uuid() primary key,
  club_id     text references clubs(id) on delete cascade,
  target_type text not null,               -- 'round' | 'photo' | 'announcement'
  target_id   text not null,               -- 대상 id
  author      text,
  body        text not null,
  created_at  timestamptz default now()
);
create index idx_cmt_club   on comments(club_id);
create index idx_cmt_target on comments(target_type, target_id);


-- ============================================================
-- RLS: 지금은 로그인 전이라 anon(익명) 전체 허용 (MVP)
--   → 로그인 붙이면 "본인/모임원만" 으로 좁힐 거예요.
-- ============================================================
alter table clubs         enable row level security;
alter table members       enable row level security;
alter table rounds        enable row level security;
alter table schedules     enable row level security;
alter table announcements enable row level security;
alter table comments      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['clubs','members','rounds','schedules','announcements','comments']
  loop
    execute format('create policy "open_%1$s" on %1$s for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ✅ 완료: Table Editor 에서 clubs, members, rounds, announcements, comments 확인
