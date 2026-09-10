import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || null;
  const to = searchParams.get("to") || null;
  return NextResponse.json(getDashboardStats({ from, to }));
}
