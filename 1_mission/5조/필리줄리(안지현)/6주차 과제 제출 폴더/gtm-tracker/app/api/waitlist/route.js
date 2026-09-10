import { NextResponse } from "next/server";
import { createSignup } from "@/lib/db";
import { readJson } from "@/lib/http";

export async function POST(request) {
  const body = await readJson(request);
  if (!body) {
    return NextResponse.json({ error: "요청 본문(JSON)이 필요해요" }, { status: 400 });
  }
  try {
    const signup = createSignup({
      name: body.name || "",
      email: body.email,
      utm_source: body.utm_source || "direct",
      utm_medium: body.utm_medium || "none",
      utm_campaign: body.utm_campaign || "",
      utm_content: body.utm_content || "",
    });
    return NextResponse.json({ signup }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
