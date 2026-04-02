"use client";

import { useCallback, useEffect, useState } from "react";

interface ChannelInfo {
  handle: string;
  channelTitle?: string | null;
  thumbnail?: string | null;
  lastSyncAt?: string | null;
}

interface SyncResult {
  imported: number;
  total: number;
}

export function YouTubeChannelCard({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const fetchChannel = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube-channel");
      const data = await res.json();
      setChannel(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchChannel();
  }, [fetchChannel]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setConnecting(true);

    try {
      const res = await fetch("/api/youtube-channel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка подключения");
      } else {
        setChannel(data);
        setHandle("");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Отключить YouTube канал? Ранее загруженные видео останутся.")) return;

    try {
      await fetch("/api/youtube-channel", { method: "DELETE" });
      setChannel(null);
    } catch {
      setError("Ошибка отключения");
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setError("");

    try {
      const res = await fetch("/api/videos/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка синхронизации");
      } else {
        setSyncResult(data);
        onSyncComplete?.();
        fetchChannel();
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return null;

  if (!channel) {
    return (
      <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">YouTube канал</h2>
        <p className="text-sm text-gray-500 mb-4">
          Подключите YouTube канал, чтобы автоматически загружать видео.
        </p>
        <form onSubmit={handleConnect} className="flex gap-3">
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@handle или ссылка на канал"
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-muted outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={connecting || !handle.trim()}
            className="bg-brand hover:bg-brand-hover text-white font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {connecting ? "Проверка..." : "Подключить"}
          </button>
        </form>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {channel.thumbnail && (
            <img
              src={channel.thumbnail}
              alt=""
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {channel.channelTitle || channel.handle}
            </h2>
            <p className="text-xs text-gray-400">
              {channel.handle}
              {channel.lastSyncAt && (
                <> &middot; Синхр. {new Date(channel.lastSyncAt).toLocaleString("ru-RU")}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-brand hover:bg-brand-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {syncing ? "Синхронизация..." : "Синхронизировать"}
          </button>
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-2"
          >
            Отключить
          </button>
        </div>
      </div>

      {syncResult && (
        <p className="text-sm text-green-600 mt-3">
          Добавлено {syncResult.imported} новых видео (всего на канале: {syncResult.total})
        </p>
      )}
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  );
}
