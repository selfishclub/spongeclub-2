import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTests, listChannels, createLink, recordClick, createSignup, getDashboardStats } from "../../lib/db.js";

beforeEach(() => {
  resetDbForTests();
});

describe("createSignup", () => {
  it("requires a valid email", () => {
    expect(() => createSignup({ email: "" })).toThrow();
    expect(() => createSignup({ email: "not-an-email" })).toThrow();
  });

  it("stores the signup with its UTM attribution", () => {
    const signup = createSignup({
      name: "테스터",
      email: "tester@example.com",
      utm_source: "instagram",
      utm_medium: "reel",
      utm_campaign: "julie-os-waitlist",
      utm_content: "reel01",
    });
    expect(signup.id).toBeTypeOf("number");
    expect(signup.utm_content).toBe("reel01");
  });

  it("defaults missing UTM fields to direct/none", () => {
    const signup = createSignup({ email: "direct@example.com" });
    expect(signup.utm_source).toBe("direct");
    expect(signup.utm_medium).toBe("none");
  });
});

describe("getDashboardStats", () => {
  it("aggregates totals, conversion rate, and active links with no data", () => {
    const stats = getDashboardStats({});
    expect(stats).toMatchObject({ totalClicks: 0, totalSignups: 0, conversionRate: 0, activeLinks: 0 });
    expect(stats.dailySeries).toEqual([]);
  });

  it("computes clicks, signups, and per-channel/per-content breakdowns", () => {
    const reel = listChannels().find((c) => c.medium === "reel");
    const bio = listChannels().find((c) => c.medium === "bio");

    const reelLink = createLink({ channelId: reel.id, contentCode: "reel01", memo: "", createdBy: "" });
    const bioLink = createLink({ channelId: bio.id, contentCode: "", memo: "", createdBy: "" });

    recordClick(reelLink.id, { deviceType: "mobile", referrer: null });
    recordClick(reelLink.id, { deviceType: "mobile", referrer: null });
    recordClick(bioLink.id, { deviceType: "desktop", referrer: null });

    createSignup({ email: "a@example.com", utm_source: "instagram", utm_medium: "reel", utm_content: "reel01" });

    const stats = getDashboardStats({});
    expect(stats.totalClicks).toBe(3);
    expect(stats.totalSignups).toBe(1);
    expect(stats.conversionRate).toBeCloseTo(1 / 3);
    expect(stats.activeLinks).toBe(2);

    const reelBreakdown = stats.channelBreakdown.find((c) => c.channelId === reel.id);
    expect(reelBreakdown).toMatchObject({ linkCount: 1, clicks: 2, signups: 1 });

    const topReel = stats.topContent.find((t) => t.shortCode === "ig-reel01");
    expect(topReel).toMatchObject({ clicks: 2, signups: 1 });
  });

  it("only counts clicks/signups inside the requested date range", () => {
    // Midday timestamps: date(col, 'localtime') can't cross a day boundary for
    // any realistic test-runner timezone, so this stays stable under localtime.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));

    const reel = listChannels().find((c) => c.medium === "reel");
    const link = createLink({ channelId: reel.id, contentCode: "reel01", memo: "", createdBy: "" });
    recordClick(link.id, { deviceType: "mobile", referrer: null });

    vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));
    recordClick(link.id, { deviceType: "mobile", referrer: null });

    vi.useRealTimers();

    const janOnly = getDashboardStats({ from: "2026-01-01", to: "2026-01-31" });
    expect(janOnly.totalClicks).toBe(1);

    const all = getDashboardStats({});
    expect(all.totalClicks).toBe(2);
  });

  it("scopes topContent to the requested date range, matching the tiles", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

    const reel = listChannels().find((c) => c.medium === "reel");
    const link = createLink({ channelId: reel.id, contentCode: "reel01", memo: "", createdBy: "" });
    recordClick(link.id, { deviceType: "mobile", referrer: null });
    createSignup({ email: "mar@example.com", utm_source: "instagram", utm_medium: "reel", utm_content: "reel01" });

    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    recordClick(link.id, { deviceType: "mobile", referrer: null });

    vi.useRealTimers();

    const marOnly = getDashboardStats({ from: "2026-03-01", to: "2026-03-31" });
    const row = marOnly.topContent.find((t) => t.shortCode === link.short_code);
    expect(row).toMatchObject({ clicks: 1, signups: 1 });
    expect(row.clicks).toBe(marOnly.totalClicks);
  });
});
