const SOURCE_ABBR = {
  instagram: "ig",
  kakao: "kakao",
  email: "mail",
  naver: "naver",
  youtube: "yt",
  meta: "meta",
};

export function sourceAbbr(source) {
  return SOURCE_ABBR[source] || source.slice(0, 4);
}

export function suggestContentCode(medium, existingCount) {
  if (medium === "bio") return "";
  return `${medium}${String(existingCount + 1).padStart(2, "0")}`;
}

export function generateShortCode(channel, contentCode, existingCodes) {
  const base = `${sourceAbbr(channel.source)}-${contentCode || channel.medium}`;
  let candidate = base;
  let suffix = 2;
  while (existingCodes.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
