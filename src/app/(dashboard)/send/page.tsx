"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface IncomingEmail {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  productUrl: string | null;
  productName: string | null;
  subject: string;
  receivedAt: string;
}

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: string | null;
}

export default function SendPage() {
  const [emails, setEmails] = useState<IncomingEmail[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [personalNote, setPersonalNote] = useState("");
  const [buyButtonText, setBuyButtonText] = useState("Kup teraz");
  const [language, setLanguage] = useState<"pl" | "uk" | "ru" | "en">("pl");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ shortLink: { url: string }; landing: { url: string }; sentEmail: { status: string } } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/emails?filter=new&page=1")
      .then((r) => r.json())
      .then((d) => { setEmails(d.emails || []); setLoadingEmails(false); });

    fetch("/api/videos")
      .then((r) => r.json())
      .then((d) => { setVideos(d || []); setLoadingVideos(false); });
  }, []);

  const selectedEmailData = emails.find((e) => e.id === selectedEmail);
  const selectedVideoData = videos.find((v) => v.id === selectedVideo);

  async function handleSend() {
    if (!selectedEmail || !selectedVideo) return;
    if (!confirm("Отправить email клиенту?")) return;

    setError("");
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: selectedEmail,
          videoId: selectedVideo,
          personalNote: personalNote || undefined,
          buyButtonText,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Ошибка соединения");
    }

    setSending(false);
  }

  if (result) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Отправлено!</h1>
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="text-lg font-bold text-green-800">
              {result.sentEmail.status === "sent" ? "Успешно отправлено!" : "Ошибка отправки"}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Лендинг</p>
            <CopyableLink url={result.landing.url} />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Короткая ссылка</p>
            <CopyableLink url={result.shortLink.url} />
          </div>

          <button
            onClick={() => {
              setResult(null);
              setSelectedEmail("");
              setSelectedVideo("");
              setPersonalNote("");
            }}
            className="w-full mt-4 bg-brand hover:bg-brand-hover text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Отправить ещё
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Отправить письмо</h1>
        <p className="mt-1 text-sm text-gray-500">Выберите заявку и видео для отправки</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: configuration */}
        <div className="space-y-6">
          {/* Email selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-900">1. Выберите заявку</h2>
              {emails.length > 0 && (
                <span className="bg-brand text-white text-xs px-2 py-0.5 rounded-full">{emails.length}</span>
              )}
            </div>
            {loadingEmails ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-16" />
                ))}
              </div>
            ) : emails.length === 0 ? (
              <p className="text-sm text-gray-400">Нет новых заявок</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {emails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedEmail === email.id
                        ? "border-brand bg-brand-light ring-2 ring-brand/20"
                        : "border-gray-100 bg-white hover:border-gray-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {email.customerName || email.subject}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {email.customerEmail || "Нет email"} · {new Date(email.receivedAt).toLocaleDateString("ru-RU")}
                    </p>
                    {email.productName && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{email.productName}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Video selection */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">2. Выберите видео</h2>
            {loadingVideos ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-100 animate-pulse rounded-lg aspect-video" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <p className="text-sm text-gray-400">Добавьте видео в библиотеку</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
                {videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setSelectedVideo(video.id)}
                    className={`text-left rounded-lg overflow-hidden border transition-colors ${
                      selectedVideo === video.id
                        ? "ring-2 ring-brand border-brand"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <div className="relative aspect-video bg-gray-100">
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 50vw, 25vw"
                      />
                      {video.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                          {video.duration}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-900 line-clamp-1 p-1.5">{video.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          {selectedEmail && selectedVideo && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">3. Настройки</h2>

              {selectedEmailData && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <span className="font-medium">{selectedEmailData.customerName || "Клиент"}</span>
                  {" → "}
                  <span>{selectedEmailData.customerEmail}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Язык письма и лендинга</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "pl" | "uk" | "ru" | "en")}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-brand focus:ring-2 focus:ring-brand-muted outline-none transition-colors"
                >
                  <option value="pl">🇵🇱 Polski</option>
                  <option value="uk">🇺🇦 Українська</option>
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Персональная заметка (опционально)
                </label>
                <textarea
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-muted outline-none transition-colors resize-none"
                  placeholder="Добавьте личное сообщение..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текст кнопки
                </label>
                <input
                  type="text"
                  value={buyButtonText}
                  onChange={(e) => setBuyButtonText(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-brand focus:ring-2 focus:ring-brand-muted outline-none transition-colors"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl text-lg transition-colors disabled:opacity-50"
              >
                {sending ? "Отправка..." : "Отправить"}
              </button>
            </div>
          )}
        </div>

        {/* Right column: live preview */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Предварительный просмотр</p>

            {selectedEmailData && selectedVideoData ? (
              <div className="rounded-xl border border-gray-200 shadow-lg overflow-hidden bg-white">
                {/* Browser bar */}
                <div className="bg-gray-100 h-8 flex items-center px-3 gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="ml-2 text-[10px] text-gray-400 truncate">email preview</span>
                </div>

                {/* Preview content */}
                <div className="text-xs">
                  {/* Header */}
                  <div className="bg-[#fb7830] p-4 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/LG_logo2.webp" alt="Laptop Guru" className="h-12 mx-auto brightness-0 invert" />
                    <p className="text-white/80 text-[10px] uppercase tracking-wider mt-1">
                      {{ pl: "Osobista recenzja wideo", uk: "Персональний відео-огляд", ru: "Персональный видеообзор", en: "Personal video review" }[language]}
                    </p>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <p className="font-bold text-gray-900 text-sm mb-1">
                      {{ pl: "Witamy", uk: "Вітаємо", ru: "Здравствуйте", en: "Hello" }[language]}, {selectedEmailData.customerName || { pl: "Kliencie", uk: "Клієнт", ru: "Клиент", en: "Customer" }[language]}!
                    </p>
                    <p className="text-gray-500 mb-3">
                      {{ pl: "Nasz ekspert przygotował recenzję wideo specjalnie dla Ciebie", uk: "Наш експерт підготував відео-огляд спеціально для вас", ru: "Наш эксперт подготовил видеообзор специально для вас", en: "Our expert has prepared a video review especially for you" }[language]}
                    </p>

                    {personalNote && (
                      <div className="bg-orange-50 border-l-2 border-[#fb7830] p-2 mb-3 italic text-gray-600 rounded-r">
                        {personalNote}
                      </div>
                    )}

                    {/* Thumbnail */}
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-3">
                      <Image
                        src={selectedVideoData.thumbnail}
                        alt={selectedVideoData.title}
                        fill
                        className="object-cover"
                        sizes="300px"
                      />
                    </div>
                    <p className="font-medium text-gray-800 mb-3">{selectedVideoData.title}</p>

                    {/* CTA */}
                    <div className="text-center">
                      <span className="inline-block bg-[#fb7830] text-white px-6 py-2 rounded-lg font-bold text-[11px]">
                        {{ pl: "Obejrzyj recenzję", uk: "Дивитися огляд", ru: "Смотреть обзор", en: "Watch review" }[language]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <p className="text-gray-400 text-sm">Выберите заявку и видео для предварительного просмотра</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyableLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <code className="text-sm text-brand bg-brand-light px-3 py-1.5 rounded-lg flex-1 truncate">
        {url}
      </code>
      <button
        onClick={handleCopy}
        className="text-xs text-gray-500 hover:text-brand transition-colors whitespace-nowrap"
      >
        {copied ? "Скопировано!" : "Копировать"}
      </button>
    </div>
  );
}
