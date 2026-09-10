import { describe, expect, it } from "vitest";
import { sourceAbbr, suggestContentCode, generateShortCode } from "../../lib/utm.js";

describe("sourceAbbr", () => {
  it("maps known sources to short codes", () => {
    expect(sourceAbbr("instagram")).toBe("ig");
    expect(sourceAbbr("kakao")).toBe("kakao");
    expect(sourceAbbr("email")).toBe("mail");
  });

  it("falls back to the first 4 characters for unknown sources", () => {
    expect(sourceAbbr("pinterest")).toBe("pint");
  });
});

describe("suggestContentCode", () => {
  it("returns an empty string for the bio medium (single canonical link)", () => {
    expect(suggestContentCode("bio", 0)).toBe("");
    expect(suggestContentCode("bio", 3)).toBe("");
  });

  it("numbers other media starting at 01, padded to 2 digits", () => {
    expect(suggestContentCode("reel", 0)).toBe("reel01");
    expect(suggestContentCode("reel", 3)).toBe("reel04");
    expect(suggestContentCode("story", 9)).toBe("story10");
  });
});

describe("generateShortCode", () => {
  const channel = { source: "instagram", medium: "reel" };

  it("combines the source abbreviation with the content code", () => {
    expect(generateShortCode(channel, "reel04", new Set())).toBe("ig-reel04");
  });

  it("falls back to the medium when content code is empty", () => {
    expect(generateShortCode({ source: "instagram", medium: "bio" }, "", new Set())).toBe("ig-bio");
  });

  it("appends a numeric suffix on collision", () => {
    const existing = new Set(["ig-reel04"]);
    expect(generateShortCode(channel, "reel04", existing)).toBe("ig-reel04-2");
  });

  it("keeps incrementing the suffix until it finds a free slug", () => {
    const existing = new Set(["ig-reel04", "ig-reel04-2"]);
    expect(generateShortCode(channel, "reel04", existing)).toBe("ig-reel04-3");
  });
});
