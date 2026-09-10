import Database from "better-sqlite3";
import path from "node:path";
import { suggestContentCode, generateShortCode } from "./utm.js";

let dbInstance;

const SEED_CHANNELS = [
  { name: "인스타 프로필", source: "instagram", medium: "bio", note: "프로필 상단 링크. 하나만 둔다" },
  { name: "인스타 릴스", source: "instagram", medium: "reel", note: "릴스 댓글·스티커. 릴스마다 새 번호" },
  { name: "인스타 스토리", source: "instagram", medium: "story", note: "스토리 링크 스티커. 올린 날짜로 코드" },
  { name: "카카오 DM·채널", source: "kakao", medium: "dm", note: "카카오톡 채널 메시지·1:1 공유" },
  { name: "이메일", source: "email", medium: "newsletter", note: "뉴스레터·개별 메일 발송" },
];

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.GTM_DB_PATH || path.join(process.cwd(), "data.db");
  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  initSchema(dbInstance);
  seedChannels(dbInstance);
  return dbInstance;
}

export function resetDbForTests() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = undefined;
  }
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      medium TEXT NOT NULL,
      note TEXT,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS utm_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL REFERENCES channels(id),
      content_code TEXT,
      memo TEXT,
      short_code TEXT NOT NULL UNIQUE,
      target_url TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS link_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER NOT NULL REFERENCES utm_links(id),
      clicked_at TEXT NOT NULL,
      device_type TEXT,
      referrer TEXT
    );

    CREATE TABLE IF NOT EXISTS waitlist_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT NOT NULL,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

function seedChannels(db) {
  const { c: count } = db.prepare("SELECT COUNT(*) as c FROM channels").get();
  if (count > 0) return;

  const insert = db.prepare(
    "INSERT INTO channels (name, source, medium, note, archived) VALUES (@name, @source, @medium, @note, 0)"
  );
  const insertAll = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  insertAll(SEED_CHANNELS);
}

export function listChannels({ includeArchived = false } = {}) {
  const db = getDb();
  if (includeArchived) {
    return db.prepare("SELECT * FROM channels ORDER BY id").all();
  }
  return db.prepare("SELECT * FROM channels WHERE archived = 0 ORDER BY id").all();
}

export function createChannel({ name, source, medium, note = "" }) {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO channels (name, source, medium, note, archived) VALUES (?, ?, ?, ?, 0)"
    )
    .run(name, source, medium, note);
  return db.prepare("SELECT * FROM channels WHERE id = ?").get(result.lastInsertRowid);
}

export function createLink({ channelId, contentCode, memo, createdBy = "" }) {
  const db = getDb();
  const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(channelId);
  if (!channel) throw new Error(`channel not found: ${channelId}`);

  const { n: existingCount } = db
    .prepare("SELECT COUNT(*) as n FROM utm_links WHERE channel_id = ?")
    .get(channelId);
  const finalContentCode =
    contentCode && contentCode.trim() ? contentCode.trim() : suggestContentCode(channel.medium, existingCount);

  const existingCodes = new Set(db.prepare("SELECT short_code FROM utm_links").all().map((r) => r.short_code));
  const shortCode = generateShortCode(channel, finalContentCode, existingCodes);
  const targetUrl = buildTargetUrl(channel, finalContentCode);
  const createdAt = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO utm_links (channel_id, content_code, memo, short_code, target_url, created_by, created_at, archived)
       VALUES (@channelId, @contentCode, @memo, @shortCode, @targetUrl, @createdBy, @createdAt, 0)`
    )
    .run({
      channelId,
      contentCode: finalContentCode,
      memo: memo || "",
      shortCode,
      targetUrl,
      createdBy,
      createdAt,
    });

  return db.prepare("SELECT * FROM utm_links WHERE id = ?").get(result.lastInsertRowid);
}

function buildTargetUrl(channel, contentCode) {
  const params = new URLSearchParams({
    utm_source: channel.source,
    utm_medium: channel.medium,
    utm_campaign: "julie-os-waitlist",
    utm_content: contentCode || "",
  });
  return `/waitlist?${params.toString()}`;
}

export function getLinkByShortCode(shortCode) {
  const db = getDb();
  return db.prepare("SELECT * FROM utm_links WHERE short_code = ?").get(shortCode);
}

export function setLinkArchived(id, archived) {
  const db = getDb();
  db.prepare("UPDATE utm_links SET archived = ? WHERE id = ?").run(archived ? 1 : 0, id);
}

export function recordClick(linkId, { deviceType = null, referrer = null } = {}) {
  const db = getDb();
  db.prepare(
    "INSERT INTO link_clicks (link_id, clicked_at, device_type, referrer) VALUES (?, ?, ?, ?)"
  ).run(linkId, new Date().toISOString(), deviceType, referrer);
}

export function listLinks({ channelId = null, search = "", includeArchived = false } = {}) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         l.id, l.channel_id, l.content_code, l.memo, l.short_code, l.target_url,
         l.created_by, l.created_at, l.archived,
         c.name as channel_name, c.source as channel_source, c.medium as channel_medium
       FROM utm_links l
       JOIN channels c ON c.id = l.channel_id
       WHERE (@includeArchived = 1 OR l.archived = 0)
         AND (@channelId IS NULL OR l.channel_id = @channelId)
         AND (@search = '' OR l.memo LIKE @searchLike OR l.content_code LIKE @searchLike)
       ORDER BY l.created_at DESC`
    )
    .all({
      includeArchived: includeArchived ? 1 : 0,
      channelId,
      search,
      searchLike: `%${search}%`,
    });

  return rows.map((row) => {
    const { n: clicks } = db.prepare("SELECT COUNT(*) as n FROM link_clicks WHERE link_id = ?").get(row.id);
    const { n: signups } = db
      .prepare(
        "SELECT COUNT(*) as n FROM waitlist_signups WHERE utm_source = ? AND utm_medium = ? AND utm_content = ?"
      )
      .get(row.channel_source, row.channel_medium, row.content_code || "");
    return {
      ...row,
      clicks,
      signups,
      conversionRate: clicks > 0 ? signups / clicks : 0,
      shortUrl: `/l/${row.short_code}`,
    };
  });
}
