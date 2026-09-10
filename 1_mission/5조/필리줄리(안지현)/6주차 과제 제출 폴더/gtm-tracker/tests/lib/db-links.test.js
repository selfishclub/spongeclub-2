import { beforeEach, describe, expect, it } from "vitest";
import {
  resetDbForTests,
  listChannels,
  createLink,
  getLinkByShortCode,
  listLinks,
  recordClick,
  setLinkArchived,
} from "../../lib/db.js";

beforeEach(() => {
  resetDbForTests();
});

function reelChannel() {
  return listChannels().find((c) => c.medium === "reel");
}

describe("createLink", () => {
  it("auto-suggests a content code and short code when none is given", () => {
    const link = createLink({ channelId: reelChannel().id, contentCode: "", memo: "", createdBy: "" });
    expect(link.content_code).toBe("reel01");
    expect(link.short_code).toBe("ig-reel01");
    expect(link.target_url).toContain("utm_source=instagram");
    expect(link.target_url).toContain("utm_campaign=julie-os-waitlist");
  });

  it("uses a provided content code as-is", () => {
    const link = createLink({ channelId: reelChannel().id, contentCode: "reel04", memo: "런칭 릴스", createdBy: "julie" });
    expect(link.content_code).toBe("reel04");
    expect(link.short_code).toBe("ig-reel04");
    expect(link.memo).toBe("런칭 릴스");
  });

  it("throws for an unknown channel id", () => {
    expect(() => createLink({ channelId: 9999, contentCode: "", memo: "", createdBy: "" })).toThrow();
  });
});

describe("getLinkByShortCode", () => {
  it("finds a link by its short code", () => {
    const created = createLink({ channelId: reelChannel().id, contentCode: "reel01", memo: "", createdBy: "" });
    const found = getLinkByShortCode("ig-reel01");
    expect(found.id).toBe(created.id);
  });

  it("returns undefined for an unknown code", () => {
    expect(getLinkByShortCode("nope")).toBeUndefined();
  });
});

describe("recordClick + listLinks", () => {
  it("counts clicks per link and reports zero signups when none exist", () => {
    const link = createLink({ channelId: reelChannel().id, contentCode: "reel01", memo: "", createdBy: "" });
    recordClick(link.id, { deviceType: "mobile", referrer: null });
    recordClick(link.id, { deviceType: "desktop", referrer: null });

    const [row] = listLinks();
    expect(row.clicks).toBe(2);
    expect(row.signups).toBe(0);
    expect(row.shortUrl).toBe("/l/ig-reel01");
  });

  it("excludes archived links by default and includes them when asked", () => {
    const link = createLink({ channelId: reelChannel().id, contentCode: "reel01", memo: "", createdBy: "" });
    setLinkArchived(link.id, true);

    expect(listLinks()).toHaveLength(0);
    expect(listLinks({ includeArchived: true })).toHaveLength(1);
  });

  it("filters by channelId and search text", () => {
    const channel = reelChannel();
    createLink({ channelId: channel.id, contentCode: "reel01", memo: "런칭", createdBy: "" });
    createLink({ channelId: channel.id, contentCode: "reel02", memo: "이벤트", createdBy: "" });

    expect(listLinks({ channelId: channel.id })).toHaveLength(2);
    expect(listLinks({ search: "이벤트" })).toHaveLength(1);
    expect(listLinks({ search: "이벤트" })[0].content_code).toBe("reel02");
  });
});
