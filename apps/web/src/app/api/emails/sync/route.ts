import { NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { syncEmails } from "@/lib/imap";
import { PERMISSIONS } from "@shorterlink/shared";

export async function POST() {
  const { error } = await authorize(PERMISSIONS.EMAILS_WRITE);
  if (error) return error;

  try {
    const imported = await syncEmails();
    return NextResponse.json({ imported });
  } catch (error) {
    console.error("[IMAP SYNC ERROR]", error);
    return NextResponse.json({ error: "Ошибка синхронизации почты" }, { status: 500 });
  }
}
