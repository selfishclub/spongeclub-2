import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");
  if (!text) {
    return NextResponse.json({ error: "text 파라미터가 필요해요" }, { status: 400 });
  }
  const svg = await QRCode.toString(text, { type: "svg", margin: 1, width: 240 });
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml" } });
}
