import { NextResponse } from "next/server";
import { listChannels, createChannel } from "@/lib/db";
import { readJson } from "@/lib/http";

export async function GET() {
  return NextResponse.json({ channels: listChannels() });
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body) {
    return NextResponse.json({ error: "요청 본문(JSON)이 필요해요" }, { status: 400 });
  }
  if (!body.name || !body.source || !body.medium) {
    return NextResponse.json({ error: "name, source, medium은 필수예요" }, { status: 400 });
  }
  try {
    const channel = createChannel({
      name: body.name,
      source: body.source,
      medium: body.medium,
      note: body.note || "",
    });
    return NextResponse.json({ channel }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
