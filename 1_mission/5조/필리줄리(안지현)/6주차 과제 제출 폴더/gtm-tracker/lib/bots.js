const BOT_UA_PATTERN =
  /bot|crawler|spider|preview|facebookexternalhit|kakaotalk-scrap|slackbot|telegrambot|discordbot|whatsapp|twitterbot|linkedinbot/i;

export function isBotUserAgent(userAgent) {
  if (!userAgent) return true;
  return BOT_UA_PATTERN.test(userAgent);
}
