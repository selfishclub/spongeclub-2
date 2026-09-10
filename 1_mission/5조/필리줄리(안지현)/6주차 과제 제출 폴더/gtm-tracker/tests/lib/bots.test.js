import { describe, expect, it } from "vitest";
import { isBotUserAgent } from "../../lib/bots.js";

describe("isBotUserAgent", () => {
  it("treats a missing user agent as a bot", () => {
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
  });

  it("recognizes common link-preview and crawler user agents", () => {
    expect(isBotUserAgent("kakaotalk-scrap/1.0")).toBe(true);
    expect(isBotUserAgent("Slackbot-LinkExpanding 1.0")).toBe(true);
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
  });

  it("does not flag normal browser user agents", () => {
    expect(
      isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15")
    ).toBe(false);
    expect(
      isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0")
    ).toBe(false);
  });

  it("does not flag the KakaoTalk in-app browser (real users)", () => {
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (Linux; Android 13; SM-G991N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 KAKAOTALK 10.4.5"
      )
    ).toBe(false);
  });
});
