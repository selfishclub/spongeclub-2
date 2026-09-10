import { beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDbForTests, listChannels, createChannel } from "../../lib/db.js";

beforeEach(() => {
  resetDbForTests();
});

describe("getDb", () => {
  it("seeds five default channels on first access", () => {
    getDb();
    const channels = listChannels();
    expect(channels).toHaveLength(5);
    expect(channels.map((c) => c.source)).toContain("instagram");
  });
});

describe("listChannels", () => {
  it("excludes archived channels by default", () => {
    const db = getDb();
    const [first] = listChannels();
    db.prepare("UPDATE channels SET archived = 1 WHERE id = ?").run(first.id);

    expect(listChannels()).toHaveLength(4);
    expect(listChannels({ includeArchived: true })).toHaveLength(5);
  });
});

describe("createChannel", () => {
  it("inserts and returns the new channel with an id", () => {
    const channel = createChannel({
      name: "네이버 검색 광고",
      source: "naver",
      medium: "cpc",
      note: "키워드는 utm_term에",
    });

    expect(channel.id).toBeTypeOf("number");
    expect(channel.name).toBe("네이버 검색 광고");
    expect(listChannels()).toHaveLength(6);
  });
});
