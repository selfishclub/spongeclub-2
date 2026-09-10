import { NextResponse } from "next/server";
import { listChannels, createChannel } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ channels: listChannels() });
}

export async function POST(request) {
  const body = await request.json();
  if (!body.name || !body.source || !body.medium) {
    return NextResponse.json({ error: "name, source, medium은 필수예요" }, { status: 400 });
  }
  const channel = createChannel({
    name: body.name,
    source: body.source,
    medium: body.medium,
    note: body.note || "",
  });
  return NextResponse.json({ channel }, { status: 201 });
}
