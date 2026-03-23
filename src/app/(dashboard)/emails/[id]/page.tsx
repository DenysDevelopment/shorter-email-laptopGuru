"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { EmailBodyViewer } from "@/components/dashboard/email-detail/email-body-viewer";
import { ConversationTimeline } from "@/components/dashboard/email-detail/conversation-timeline";
import { EditEmailModal } from "@/components/dashboard/edit-email-modal";

interface SentEmail {
  id: string;
  to: string;
  subject: string;
  status: string;
  sentAt: string;
}

interface Landing {
  id: string;
  slug: string;
  title: string;
  views: number;
  clicks: number;
  createdAt: string;
  video: { title: string; thumbnail: string } | null;
  sentEmails: SentEmail[];
}

interface EmailDetail {
  id: string;
  messageId: string;
  from: string;
  subject: string;
  body: string;
  productUrl: string | null;
  productName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  category: string;
  receivedAt: string;
  processed: boolean;
  archived: boolean;
  landings: Landing[];
}

interface ThreadData {
  emails: EmailDetail[];
  landings: Landing[];
}

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const fetchEmail = useCallback(async () => {
    const res = await fetch(`/api/emails/${id}`);
    if (!res.ok) {
      router.push("/emails");
      return;
    }
    const data = await res.json();
    setEmail(data.email);
    setThread(data.thread);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    void fetchEmail();
  }, [fetchEmail]);

  async function handleArchive() {
    await fetch(`/api/emails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    router.push("/emails");
  }

  async function handleToggleProcessed() {
    if (!email) return;
    await fetch(`/api/emails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processed: !email.processed }),
    });
    fetchEmail();
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">Загрузка...</div>
    );
  }

  if (!email) return null;

  const categoryLabel = email.category === "lead" ? "Заявка" : "Прочее";
  const categoryColor =
    email.category === "lead"
      ? "bg-green-50 text-green-600"
      : "bg-gray-100 text-gray-500";

  return (
    <div>
      {/* Back link */}
      <Link
        href="/emails"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Назад к заявкам
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-4">
          {/* Email Header */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor}`}>
                {categoryLabel}
              </span>
              {email.processed && (
                <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                  Обработана
                </span>
              )}
              {email.archived && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  В архиве
                </span>
              )}
            </div>
            <h1 className="text-lg font-semibold text-gray-900">{email.subject}</h1>
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span>От: {email.from}</span>
              <span>
                {new Date(email.receivedAt).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Email Body */}
          <EmailBodyViewer html={email.body} />

          {/* Conversation Timeline */}
          <ConversationTimeline thread={thread} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">Клиент</h3>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-brand hover:text-brand/80"
              >
                Изменить
              </button>
            </div>
            <div className="space-y-2">
              <InfoRow label="Имя" value={email.customerName} />
              <InfoRow label="Email" value={email.customerEmail} />
              <InfoRow label="Телефон" value={email.customerPhone} />
            </div>
          </div>

          {/* Product */}
          {(email.productName || email.productUrl) && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Товар</h3>
              {email.productName && (
                <p className="text-sm font-medium text-gray-900">{email.productName}</p>
              )}
              {email.productUrl && (
                <a
                  href={email.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand hover:underline break-all mt-1 block"
                >
                  {email.productUrl}
                </a>
              )}
            </div>
          )}

          {/* Landings */}
          {email.landings.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Лендинги ({email.landings.length})
              </h3>
              <div className="space-y-2">
                {email.landings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/analytics/${l.slug}`}
                    className="block text-sm text-brand hover:underline"
                  >
                    /{l.slug} — {l.views} просм., {l.clicks} клик.
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Действия</h3>
            <button
              onClick={handleToggleProcessed}
              className="w-full text-sm text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {email.processed ? "↩ Снять обработку" : "✓ Отметить обработанной"}
            </button>
            {!email.archived && (
              <button
                onClick={handleArchive}
                className="w-full text-sm text-left px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              >
                Архивировать
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && email && (
        <EditEmailModal
          email={email}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            fetchEmail();
          }}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <p className="text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}
