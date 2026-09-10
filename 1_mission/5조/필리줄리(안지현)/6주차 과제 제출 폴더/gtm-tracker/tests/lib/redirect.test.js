import { describe, expect, it } from "vitest";
import { classifyRequest } from "../../lib/redirect.js";

describe("classifyRequest", () => {
  it("marks bot user agents and skips device classification", () => {
    expect(classifyRequest("KAKAOTALK")).toEqual({ isBot: true, deviceType: null });
  });

  it("classifies an iPhone user agent as mobile", () => {
    expect(
      classifyRequest("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15")
    ).toEqual({ isBot: false, deviceType: "mobile" });
  });

  it("classifies a desktop Chrome user agent as desktop", () => {
    expect(
      classifyRequest("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0")
    ).toEqual({ isBot: false, deviceType: "desktop" });
  });
});
