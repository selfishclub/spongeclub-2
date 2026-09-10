import { isBotUserAgent } from "./bots.js";

const MOBILE_UA_PATTERN = /Mobile|Android|iPhone|iPad/i;

export function classifyRequest(userAgent) {
  if (isBotUserAgent(userAgent)) {
    return { isBot: true, deviceType: null };
  }
  return {
    isBot: false,
    deviceType: MOBILE_UA_PATTERN.test(userAgent) ? "mobile" : "desktop",
  };
}
