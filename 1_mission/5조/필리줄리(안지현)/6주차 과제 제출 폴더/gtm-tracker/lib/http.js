import { NextResponse } from "next/server";

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
