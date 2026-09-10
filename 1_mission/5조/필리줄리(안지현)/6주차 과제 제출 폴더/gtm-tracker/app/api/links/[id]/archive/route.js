import { NextResponse } from "next/server";
import { setLinkArchived, getDb } from "@/lib/db";

export async function POST(request, { params }) {
  const db = getDb();
  const link = db.prepare("SELECT * FROM utm_links WHERE id = ?").get(params.id);
  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const nextArchived = !link.archived;
  setLinkArchived(params.id, nextArchived);
  return NextResponse.json({ archived: nextArchived });
}
