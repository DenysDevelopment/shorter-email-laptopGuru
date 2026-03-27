"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  totalEmails: number;
  unprocessedEmails: number;
  totalVideos: number;
  totalLandings: number;
  totalSent: number;
  failedSent: number;
  recentEmails: {
    id: string;
    customerName: string | null;
    customerEmail: string | null;
    subject: string;
    processed: boolean;
    receivedAt: string;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return null;
        }
        return r.json();
      })
      .then((data) => { if (data) setStats(data); });
  }, []);

  if (forbidden) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">Нет доступа к статистике.</p>
          <p className="text-sm text-gray-400 mt-1">Обратитесь к администратору для получения разрешений.</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-12 text-gray-400">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Общая статистика</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Новых заявок" value={stats.unprocessedEmails} href="/emails" accent />
        <StatCard label="Всего заявок" value={stats.totalEmails} href="/emails" />
        <StatCard label="Видео" value={stats.totalVideos} href="/videos" />
        <StatCard label="Отправлено" value={stats.totalSent} href="/sent" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/emails"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          Проверить почту
        </Link>
        <Link
          href="/videos"
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg border border-gray-200 transition-colors text-sm"
        >
          Добавить видео
        </Link>
        <Link
          href="/send"
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg border border-gray-200 transition-colors text-sm"
        >
          Отправить письмо
        </Link>
      </div>

      {/* Recent emails */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Последние заявки</h2>
        {!stats.recentEmails || stats.recentEmails.length === 0 ? (
          <p className="text-sm text-gray-400">Заявок пока нет</p>
        ) : (
          <div className="space-y-2">
            {stats.recentEmails.map((email) => (
              <div
                key={email.id}
                className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {!email.processed && (
                    <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {email.customerName || email.subject}
                    </p>
                    <p className="text-xs text-gray-400">{email.customerEmail}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(email.receivedAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 transition-colors ${
        accent
          ? "bg-brand-light border-brand/20 hover:border-brand/40"
          : "bg-white border-gray-100 hover:border-gray-200"
      }`}
    >
      <p className={`text-2xl font-bold ${accent ? "text-brand" : "text-gray-900"}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </Link>
  );
}
