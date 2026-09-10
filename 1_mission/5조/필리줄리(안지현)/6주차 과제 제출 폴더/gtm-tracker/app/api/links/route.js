import { NextResponse } from "next/server";
import { listLinks, createLink } from "@/lib/db";
import { readJson } from "@/lib/http";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const search = searchParams.get("search") || "";
  const includeArchived = searchParams.get("includeArchived") === "true";

  const links = listLinks({
    channelId: channelId ? Number(channelId) : null,
    search,
    includeArchived,
  });
  return NextResponse.json({ links });
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body) {
    return NextResponse.json({ error: "요청 본문(JSON)이 필요해요" }, { status: 400 });
  }
  const channelIds = Array.isArray(body.channelIds) ? body.channelIds : [body.channelId];
  if (!channelIds.length || channelIds.some((id) => !id)) {
    return NextResponse.json({ error: "채널을 선택해주세요" }, { status: 400 });
  }

  try {
    const links = channelIds.map((channelId) =>
      createLink({
        channelId: Number(channelId),
        contentCode: body.contentCode || "",
        memo: body.memo || "",
        createdBy: body.createdBy || "",
      })
    );
    return NextResponse.json({ links: links.map(withShortUrl) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

function withShortUrl(link) {
  return { ...link, shortUrl: `/l/${link.short_code}` };
}
