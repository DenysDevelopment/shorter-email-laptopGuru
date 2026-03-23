"use client";

interface IncomingEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  processed: boolean;
  category: string;
  customerName: string | null;
}

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

interface ThreadData {
  emails: IncomingEmail[];
  landings: Landing[];
}

type TimelineItem =
  | { type: "incoming"; date: string; data: IncomingEmail }
  | { type: "sent"; date: string; data: SentEmail & { videoTitle: string } }
  | { type: "landing"; date: string; data: Landing };

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildTimeline(thread: ThreadData): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const email of thread.emails) {
    items.push({ type: "incoming", date: email.receivedAt, data: email });
  }

  for (const landing of thread.landings) {
    items.push({ type: "landing", date: landing.createdAt, data: landing });
    for (const sent of landing.sentEmails) {
      items.push({
        type: "sent",
        date: sent.sentAt,
        data: { ...sent, videoTitle: landing.video?.title || landing.title },
      });
    }
  }

  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationTimeline({ thread }: { thread: ThreadData | null }) {
  if (!thread || (thread.emails.length === 0 && thread.landings.length === 0)) {
    return null;
  }

  const items = buildTimeline(thread);
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">
          Лента переписки ({items.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((item, i) => (
          <TimelineItemCard key={`${item.type}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function TimelineItemCard({ item }: { item: TimelineItem }) {
  const borderColor =
    item.type === "incoming"
      ? "border-l-blue-400"
      : item.type === "sent"
        ? "border-l-green-400"
        : "border-l-orange-400";

  const label =
    item.type === "incoming"
      ? "Входящее"
      : item.type === "sent"
        ? "Отправлено"
        : "Лендинг";

  const labelColor =
    item.type === "incoming"
      ? "bg-blue-50 text-blue-600"
      : item.type === "sent"
        ? "bg-green-50 text-green-600"
        : "bg-orange-50 text-orange-600";

  return (
    <div className={`p-4 border-l-4 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs px-2 py-0.5 rounded-full ${labelColor}`}>
          {label}
        </span>
        <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
      </div>

      {item.type === "incoming" && (
        <>
          <p className="text-sm font-medium text-gray-900">{item.data.subject}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            от {item.data.customerName || item.data.from}
          </p>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {stripHtml(item.data.body).slice(0, 200)}
          </p>
        </>
      )}

      {item.type === "sent" && (
        <>
          <p className="text-sm font-medium text-gray-900">
            Видео: {item.data.videoTitle}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">→ {item.data.to}</p>
          <span
            className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
              item.data.status === "sent"
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {item.data.status === "sent" ? "Доставлено" : "Ошибка"}
          </span>
        </>
      )}

      {item.type === "landing" && (
        <>
          <p className="text-sm font-medium text-gray-900">{item.data.title}</p>
          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            <span>/{item.data.slug}</span>
            <span>{item.data.views} просм.</span>
            <span>{item.data.clicks} клик.</span>
          </div>
        </>
      )}
    </div>
  );
}
