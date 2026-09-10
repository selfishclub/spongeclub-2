import { NextResponse } from "next/server";
import { getLinkByShortCode, recordClick } from "@/lib/db";
import { classifyRequest } from "@/lib/redirect";

export async function GET(request, { params }) {
  const link = getLinkByShortCode(params.code);
  if (!link) {
    return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  const { isBot, deviceType } = classifyRequest(userAgent);
  if (!isBot) {
    recordClick(link.id, {
      deviceType,
      referrer: request.headers.get("referer") || null,
    });
  }

  return NextResponse.redirect(new URL(link.target_url, request.url), 302);
}
