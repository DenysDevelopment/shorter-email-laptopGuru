import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncEmails } from "@/lib/imap";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const imported = await syncEmails();
    return NextResponse.json({ imported });
  } catch (error) {
    console.error("[IMAP SYNC ERROR]", error);
    const message = error instanceof Error ? error.message : "IMAP sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
