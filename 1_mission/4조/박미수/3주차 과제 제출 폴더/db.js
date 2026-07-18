/* ============================================================
   db.js — Supabase 연결 + 소셜(공지/댓글)
   · supabase-js CDN 이 먼저 로드되어 있어야 함 (window.supabase)
============================================================ */
const SB_URL = 'https://pstkuigiiskquyskyaxb.supabase.co';
const SB_KEY = 'sb_publishable_vtNbZIOZVcKh0URJzXukBQ_5QmXV-Uv';

let _sb = null;
function sbClient() {
  if (!_sb && window.supabase && window.supabase.createClient) {
    _sb = window.supabase.createClient(SB_URL, SB_KEY);
  }
  return _sb;
}

/* ── 작성자 이름 (로그인 붙기 전 임시) ── */
function myName() { return localStorage.getItem('golfrank.myname') || ''; }
function setMyName(n) { localStorage.setItem('golfrank.myname', n); }
function ensureMyName() {
  let n = myName();
  if (!n) {
    n = (prompt('여기에 표시될 내 이름(닉네임)을 입력하세요', '') || '').trim();
    if (n) setMyName(n);
  }
  return n;
}

/* ── 인증 (카카오 로그인) ── */
async function currentUser() {
  const c = sbClient(); if (!c) return null;
  const { data } = await c.auth.getUser();
  return (data && data.user) || null;
}
function userDisplayName(u) {
  if (!u) return '';
  const m = u.user_metadata || {};
  return m.name || m.full_name || m.user_name || m.nickname || (u.email ? u.email.split('@')[0] : '') || '사용자';
}
async function signInKakao(redirectTo) {
  const c = sbClient(); if (!c) throw new Error('Supabase 연결 안 됨');
  // 닉네임만 요청 (이메일/프로필사진은 카카오 심사 필요 → 제외)
  const { error } = await c.auth.signInWithOAuth({ provider: 'kakao', options: { scopes: 'profile_nickname', redirectTo: redirectTo || location.href } });
  if (error) throw error;
}
async function signOut() {
  const c = sbClient(); if (!c) return;
  await c.auth.signOut();
  localStorage.removeItem('golfrank.myname');
}
/* ── 이메일 로그인/가입 ── */
async function signInEmail(email, password) {
  const c = sbClient(); if (!c) throw new Error('Supabase 연결 안 됨');
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error; return data;
}
async function signUpEmail(email, password, displayName) {
  const c = sbClient(); if (!c) throw new Error('Supabase 연결 안 됨');
  const { data, error } = await c.auth.signUp({ email, password, options: { data: { name: displayName || email.split('@')[0] } } });
  if (error) throw error; return data;
}

/* ── 모임 upsert (공지/댓글의 FK 충족 + 클라우드 동기화 시작) ── */
async function upsertClub(club) {
  const c = sbClient(); if (!c || !club) return;
  const { error } = await c.from('clubs').upsert({
    id: club.id, name: club.name, description: club.description || null,
    ranking_type: club.rankingType || 'score', max_members: club.maxMembers || 20,
    club_code: club.clubCode || null, updated_at: new Date().toISOString(),
  });
  if (error) console.error('upsertClub', error);
}

/* ── 모임 전체를 Supabase에 올리기 (공유) ── */
async function pushClub(club) {
  const c = sbClient(); if (!c || !club) return;
  await c.from('clubs').upsert({
    id: club.id, name: club.name, description: club.description || null,
    ranking_type: club.rankingType || 'score', max_members: club.maxMembers || 20,
    club_code: club.clubCode || null, created_by: club.createdBy || null, updated_at: new Date().toISOString(),
  });
  // 멤버: 병합(upsert) — user_id(claim)는 로컬에 있을 때만 실어서 클라우드 연결을 안 지움
  const memRows = (club.members || []).map((m) => {
    const row = {
      id: m.id, club_id: club.id, name: m.name, nickname: m.nickname || null, role: m.role || 'member',
      handicap: (m.handicap ?? null), experience_years: (m.experienceYears ?? null), life_best: (m.lifeBest ?? null),
      gender: m.gender || null, tee: m.tee || null, age_group: m.ageGroup || null, goal_score: (m.goalScore ?? null), avatar: m.avatar || null,
    };
    if (m.userId) row.user_id = m.userId;
    return row;
  });
  if (memRows.length) await c.from('members').upsert(memRows, { onConflict: 'id' });
  // 라운드: 병합(upsert) — 다른 사람이 올린 라운드를 안 지움
  if ((club.rounds || []).length) await c.from('rounds').upsert(club.rounds.map((r) => ({
    id: r.id, club_id: club.id, date: r.date, course: r.course || null, par: r.par || 72,
    scores: r.scores || [], media: r.media || [], source: r.source || null,
  })), { onConflict: 'id' });
  // 일정
  await c.from('schedules').delete().eq('club_id', club.id);
  if ((club.schedules || []).length) await c.from('schedules').insert(club.schedules.map((s) => ({
    id: s.id, club_id: club.id, date: s.date, tee_time: s.time || null, course: s.course || null, memo: s.memo || null,
  })));
}

/* ── 멤버십(계정 ↔ 모임 연결) ── */
async function ensureMembership(clubId, name, role) {
  const c = sbClient(); if (!c) return;
  const u = await currentUser(); if (!u) return;
  // 이미 있으면 그대로 두고, 없을 때만 추가 (역할 덮어쓰기 방지)
  await c.from('memberships').upsert(
    { club_id: clubId, user_id: u.id, name: name || userDisplayName(u), role: role || 'member' },
    { onConflict: 'club_id,user_id', ignoreDuplicates: true }
  );
}
async function myClubIds() {
  const c = sbClient(); if (!c) return [];
  const u = await currentUser(); if (!u) return [];
  const { data } = await c.from('members').select('club_id').eq('user_id', u.id);
  return [...new Set((data || []).map((r) => r.club_id))];
}
/* 특정 멤버 슬롯을 내 계정으로 이어받기 (이미 이어받은 슬롯이면 무시 → 중복 방지) */
async function claimMemberSlot(clubId, memberId) {
  const c = sbClient(); if (!c) return false;
  const u = await currentUser(); if (!u) return false;
  const { data } = await c.from('members').update({ user_id: u.id }).eq('club_id', clubId).eq('id', memberId).is('user_id', null).select();
  return !!(data && data.length);
}
/* 새 멤버로 나를 추가 (슬롯 매칭이 없을 때) */
async function addSelfAsMember(clubId, name) {
  const c = sbClient(); if (!c) return null;
  const u = await currentUser(); if (!u) return null;
  const id = 'm_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  await c.from('members').insert({ id, club_id: clubId, name: name || userDisplayName(u), role: 'member', user_id: u.id });
  return id;
}
/* 내 계정의 모임들을 클라우드에서 불러와 localStorage에 반영 (기기 간 동기화) */
async function pullMyClubs() {
  const ids = await myClubIds();
  let clubs = [];
  try { clubs = JSON.parse(localStorage.getItem('golfrank.clubs')) || []; } catch (e) {}
  for (const id of ids) {
    const club = await pullClub(id);
    if (!club) continue;
    const idx = clubs.findIndex((c) => c.id === id);
    if (idx >= 0) clubs[idx] = { ...clubs[idx], ...club }; else clubs.unshift(club);
  }
  localStorage.setItem('golfrank.clubs', JSON.stringify(clubs));
  return ids.length;
}

/* ── Supabase에서 모임 전체 불러오기 ── */
async function pullClub(id) {
  const c = sbClient(); if (!c) return null;
  const { data: clubs } = await c.from('clubs').select('*').eq('id', id).limit(1);
  if (!clubs || !clubs.length) return null;
  const cl = clubs[0];
  const [mRes, rRes, sRes] = await Promise.all([
    c.from('members').select('*').eq('club_id', id),
    c.from('rounds').select('*').eq('club_id', id),
    c.from('schedules').select('*').eq('club_id', id),
  ]);
  const rounds = (rRes.data || []).map((r) => ({ id: r.id, date: r.date, course: r.course, par: r.par, scores: r.scores || [], media: r.media || [], source: r.source }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return {
    id: cl.id, name: cl.name, description: cl.description, rankingType: cl.ranking_type, maxMembers: cl.max_members,
    clubCode: cl.club_code, createdBy: cl.created_by,
    members: (mRes.data || []).map((m) => ({ id: m.id, name: m.name, nickname: m.nickname, role: m.role, handicap: m.handicap, experienceYears: m.experience_years, lifeBest: m.life_best, gender: m.gender, tee: m.tee, ageGroup: m.age_group, goalScore: m.goal_score, avatar: m.avatar, userId: m.user_id })),
    rounds,
    schedules: (sRes.data || []).map((s) => ({ id: s.id, date: s.date, time: s.tee_time, course: s.course, memo: s.memo })),
    currentMembers: (mRes.data || []).length,
    latestRound: rounds.length ? new Date(rounds[rounds.length - 1].date).getTime() : null,
  };
}

/* ── 불러와서 localStorage에 반영 (없으면 추가, 있으면 갱신) ── */
async function pullClubIntoLocal(id) {
  let club;
  try { club = await pullClub(id); } catch (e) { return null; }
  if (!club) return null;
  let clubs = [];
  try { clubs = JSON.parse(localStorage.getItem('golfrank.clubs')) || []; } catch (e) {}
  const idx = clubs.findIndex((c) => c.id === id);
  if (idx >= 0) clubs[idx] = { ...clubs[idx], ...club };
  else clubs.unshift(club);
  localStorage.setItem('golfrank.clubs', JSON.stringify(clubs));
  return club;
}

const APP_BASE = 'https://golf-rank-beta.vercel.app';   // 공유 링크 기준 주소

/* ── 공지사항 ── */
async function fetchAnnouncements(clubId) {
  const c = sbClient(); if (!c) return [];
  const { data, error } = await c.from('announcements').select('*').eq('club_id', clubId).order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}
async function postAnnouncement(clubId, author, authorRole, body) {
  const c = sbClient(); if (!c) throw new Error('Supabase 연결 안 됨');
  const { error } = await c.from('announcements').insert({ club_id: clubId, author, author_role: authorRole || null, body });
  if (error) throw error;
}
async function deleteAnnouncement(id) {
  const c = sbClient(); if (!c) return;
  await c.from('announcements').delete().eq('id', id);
}

/* ── 댓글 ── */
async function fetchComments(clubId, targetType, targetId) {
  const c = sbClient(); if (!c) return [];
  const { data, error } = await c.from('comments').select('*')
    .eq('club_id', clubId).eq('target_type', targetType).eq('target_id', targetId)
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return []; }
  return data || [];
}
async function postComment(clubId, targetType, targetId, author, body) {
  const c = sbClient(); if (!c) throw new Error('Supabase 연결 안 됨');
  const { error } = await c.from('comments').insert({ club_id: clubId, target_type: targetType, target_id: targetId, author, body });
  if (error) throw error;
}
async function deleteComment(id) {
  const c = sbClient(); if (!c) return;
  await c.from('comments').delete().eq('id', id);
}

/* ── 시간 표시 ── */
function timeAgo(iso) {
  const d = new Date(iso), now = new Date();
  const s = Math.floor((now - d) / 1000);
  if (s < 60) return '방금';
  if (s < 3600) return Math.floor(s / 60) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  if (s < 604800) return Math.floor(s / 86400) + '일 전';
  return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
}
