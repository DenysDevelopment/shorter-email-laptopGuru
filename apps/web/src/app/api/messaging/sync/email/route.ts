import { NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { PERMISSIONS } from "@shorterlink/shared";
import { syncEmailsToMessaging } from "@/lib/imap-messaging";

/**
 * POST /api/messaging/sync/email
 * Manually trigger email sync from IMAP into messaging system.
 */
export async function POST() {
  const { error } = await authorize(PERMISSIONS.MESSAGING_CHANNELS_WRITE);
  if (error) return error;

  try {
    const imported = await syncEmailsToMessaging();
    return NextResponse.json({ ok: true, imported });
  } catch (err) {
    console.error("[Email Sync API] Error:", err);
    return NextResponse.json(
      { error: "Ошибка синхронизации email" },
      { status: 500 },
    );
  }
}
