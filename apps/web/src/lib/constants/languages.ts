import type { EmailLanguage } from "@/lib/email-template";

export const VALID_LANGUAGES: EmailLanguage[] = ["pl", "uk", "ru", "en"];

export const SUBJECT_BY_LANG: Record<EmailLanguage, (title: string) => string> = {
  pl: (title) => `Recenzja wideo dla Ciebie — ${title}`,
  uk: (title) => `Відеоогляд для вас — ${title}`,
  ru: (title) => `Видеообзор для вас — ${title}`,
  en: (title) => `Video review for you — ${title}`,
};

export const TITLE_BY_LANG: Record<EmailLanguage, (title: string) => string> = {
  pl: (title) => `Recenzja wideo: ${title}`,
  uk: (title) => `Відеоогляд: ${title}`,
  ru: (title) => `Видеообзор: ${title}`,
  en: (title) => `Video review: ${title}`,
};

export const FALLBACK_NAME: Record<EmailLanguage, string> = {
  pl: "Kliencie",
  uk: "Клієнте",
  ru: "Клиент",
  en: "Customer",
};
