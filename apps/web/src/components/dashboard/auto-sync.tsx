"use client";

import { useEffect, useRef } from "react";

const EMAIL_SYNC_INTERVAL = 60_000; // 60 секунд
const VIDEO_SYNC_INTERVAL = 300_000; // 5 минут
const MESSAGING_EMAIL_SYNC_INTERVAL = 30_000; // 30 секунд

export function AutoSync() {
  const emailTimer = useRef<ReturnType<typeof setInterval>>(null);
  const videoTimer = useRef<ReturnType<typeof setInterval>>(null);
  const messagingEmailTimer = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    async function syncEmails() {
      try {
        await fetch("/api/emails/sync", { method: "POST" });
      } catch {
        // тихо игнорируем ошибки
      }
    }

    async function syncVideos() {
      try {
        await fetch("/api/videos/sync", { method: "POST" });
      } catch {
        // тихо игнорируем ошибки
      }
    }

    async function syncMessagingEmails() {
      try {
        await fetch("/api/messaging/sync/email", { method: "POST" });
      } catch {
        // тихо игнорируем ошибки
      }
    }

    // Сразу при загрузке
    syncEmails();
    syncVideos();
    syncMessagingEmails();

    // Повторять по интервалу
    emailTimer.current = setInterval(syncEmails, EMAIL_SYNC_INTERVAL);
    videoTimer.current = setInterval(syncVideos, VIDEO_SYNC_INTERVAL);
    messagingEmailTimer.current = setInterval(syncMessagingEmails, MESSAGING_EMAIL_SYNC_INTERVAL);

    return () => {
      if (emailTimer.current) clearInterval(emailTimer.current);
      if (videoTimer.current) clearInterval(videoTimer.current);
      if (messagingEmailTimer.current) clearInterval(messagingEmailTimer.current);
    };
  }, []);

  return null;
}
