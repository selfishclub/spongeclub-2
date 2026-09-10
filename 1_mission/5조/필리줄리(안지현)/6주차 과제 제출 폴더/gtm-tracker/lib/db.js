import Database from "better-sqlite3";
import path from "node:path";

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
