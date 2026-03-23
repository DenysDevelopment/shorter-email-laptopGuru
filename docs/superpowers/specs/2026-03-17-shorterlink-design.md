# shorterLINK — Спецификация проекта

## 1. Контекст и цель

**Проблема:** На сайте laptop.guru клиенты оставляют заявки (заполняют форму → письмо приходит на почту). Сейчас нет автоматизированного способа отправить клиенту персонализированный email с видеообзором товара и ссылкой на покупку.

**Решение:** Веб-приложение **shorterLINK**, которое:
1. Подтягивает заявки с почты (IMAP)
2. Позволяет привязать YouTube-видео к заявке
3. Генерирует лендинг-страницу (видео + кнопка «Купить»)
4. Создаёт короткую ссылку на лендинг
5. Генерирует красивый HTML-email и отправляет клиенту (SMTP)

**Целевые пользователи:** Сотрудники laptop.guru (регистрация с логином/паролем).

---

## 2. Стек технологий

| Слой | Технология |
|------|-----------|
| Framework | **Next.js 15** (App Router) + TypeScript |
| Стили | **Tailwind CSS** |
| ORM | **Prisma** |
| База данных | **PostgreSQL** |
| Авторизация | **NextAuth.js** (Credentials provider, JWT) |
| Почта (чтение) | **imapflow** (IMAP-клиент) |
| Почта (отправка) | **nodemailer** (SMTP) |
| YouTube | **YouTube Data API v3** (метаданные видео) |
| Email-шаблоны | **React Email** (JSX → HTML email) |
| Иконки | **lucide-react** |
| Reverse proxy | **Caddy** (auto SSL, zero-config) |
| Деплой | **Docker** + docker-compose на VPS (Украина) |

---

## 3. Структура проекта

```
shorterLINK/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Группа: Login, Register
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/        # Группа: защищённые страницы
│   │   │   ├── dashboard/      # Главная панель
│   │   │   ├── emails/         # Входящие заявки с почты
│   │   │   ├── videos/         # Библиотека YouTube-видео
│   │   │   ├── landings/       # Созданные лендинги
│   │   │   ├── links/          # Сокращённые ссылки + статистика
│   │   │   ├── send/           # Отправка email клиенту
│   │   │   └── sent/           # История отправленных писем
│   │   ├── l/[slug]/           # Публичный лендинг (видео + кнопка)
│   │   ├── r/[code]/           # Редирект короткой ссылки
│   │   ├── api/                # API Routes
│   │   │   ├── auth/           # NextAuth
│   │   │   ├── emails/         # CRUD входящих заявок
│   │   │   ├── videos/         # CRUD видео
│   │   │   ├── landings/       # Создание лендингов + /[slug]/click (трекинг кликов)
│   │   │   ├── links/          # Сокращение ссылок
│   │   │   ├── send/           # Отправка email
│   │   │   └── health/         # Health-check endpoint
│   │   └── layout.tsx
│   ├── components/             # UI-компоненты
│   │   ├── ui/                 # Базовые: Button, Input, Card, Modal
│   │   ├── dashboard/          # Dashboard-специфичные
│   │   ├── email/              # Email-превью
│   │   └── landing/            # Landing-превью
│   ├── lib/                    # Утилиты и сервисы
│   │   ├── db.ts               # Prisma-клиент
│   │   ├── auth.ts             # NextAuth конфиг
│   │   ├── imap.ts             # IMAP-сервис (чтение почты)
│   │   ├── smtp.ts             # SMTP-сервис (отправка email)
│   │   ├── youtube.ts          # YouTube API-клиент
│   │   ├── links.ts            # Генерация коротких ссылок
│   │   └── parser.ts           # Парсинг email-заявок
│   ├── emails/                 # React Email шаблоны
│   │   └── video-review.tsx    # Шаблон письма с видеообзором
│   └── types/                  # TypeScript типы
├── prisma/
│   ├── schema.prisma           # Схема БД
│   └── seed.ts                 # Начальные данные
├── public/                     # Статика
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

---

## 4. Модель данных (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  videos        Video[]
  landings      Landing[]
  sentEmails    SentEmail[]
  processedEmails IncomingEmail[]
}

model IncomingEmail {
  id            String    @id @default(cuid())
  messageId     String    @unique     // RFC 822 Message-ID (дедупликация IMAP)
  from          String                // email отправителя (может быть системный noreply@)
  subject       String
  body          String                // тело письма (raw HTML)
  productUrl    String?               // распарсенная ссылка на товар
  productName   String?               // название товара (из письма)
  customerName  String?               // имя клиента (из формы)
  customerEmail String?               // email клиента (извлечён из тела письма)
  customerPhone String?               // телефон клиента
  receivedAt    DateTime
  processed     Boolean   @default(false)
  archived      Boolean   @default(false) // скрытие спама/нерелевантных
  processedBy   User?     @relation(fields: [processedById], references: [id])
  processedById String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  landings      Landing[]             // может быть несколько (повторная отправка)

  @@index([processed])                // фильтрация по статусу
  @@index([archived])
}

model Video {
  id            String    @id @default(cuid())
  youtubeId     String    @unique     // ID видео на YouTube
  title         String                // подтягивается с YouTube
  thumbnail     String                // URL превью
  duration      String?               // длительность
  channelTitle  String?               // название канала
  active        Boolean   @default(true) // soft-delete (false = скрыт из библиотеки)
  addedBy       User      @relation(fields: [userId], references: [id])
  userId        String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  landings      Landing[]
}

model Landing {
  id            String    @id @default(cuid())
  slug          String    @unique     // URL-слаг для /l/[slug] (nanoid, 10 символов)
  title         String                // заголовок лендинга
  videoId       String
  video         Video     @relation(fields: [videoId], references: [id])
  productUrl    String                // ссылка на товар (кнопка «Купить»)
  buyButtonText String    @default("Купить")
  personalNote  String?               // персональная заметка сотрудника
  emailId       String?               // НЕ unique — допускается несколько лендингов на одну заявку
  incomingEmail IncomingEmail? @relation(fields: [emailId], references: [id])
  views         Int       @default(0) // счётчик просмотров
  clicks        Int       @default(0) // клики по «Купить»
  createdBy     User      @relation(fields: [userId], references: [id])
  userId        String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  shortLinks    ShortLink[]
  sentEmails    SentEmail[]

  @@index([createdAt])
}

model ShortLink {
  id            String    @id @default(cuid())
  code          String    @unique     // короткий код для /r/[code] (nanoid, 8 символов)
  landingId     String
  landing       Landing   @relation(fields: [landingId], references: [id])
  clicks        Int       @default(0) // счётчик переходов (atomic increment)
  createdAt     DateTime  @default(now())
}

model SentEmail {
  id            String    @id @default(cuid())
  to            String                // email получателя
  subject       String
  landingId     String
  landing       Landing   @relation(fields: [landingId], references: [id])
  sentBy        User      @relation(fields: [userId], references: [id])
  userId        String
  status        String    @default("sent") // sent | failed
  errorMessage  String?               // причина ошибки (если status = failed)
  sentAt        DateTime  @default(now())

  @@index([sentAt])
}
```

**Изменения относительно v1.0:**
- `IncomingEmail`: добавлено поле `customerEmail` (email клиента из тела, т.к. `from` может быть системным), `archived` (скрытие спама), убран `@unique` с `Landing.emailId` (допускается повторная отправка), добавлены индексы `@@index([processed])`, `@@index([archived])`
- `Video`: добавлено поле `active` (soft-delete, чтобы не ломать FK)
- `Landing`: `emailId` теперь НЕ unique (несколько лендингов на одну заявку), добавлено `personalNote`, `@@index([createdAt])`
- `SentEmail`: добавлено `errorMessage`, `@@index([sentAt])`

---

## 5. Ключевые страницы и функционал

### 5.1 Авторизация
- **Login** `/login` — вход по email + пароль
- **Register** `/register` — регистрация по инвайт-коду (email, имя, пароль + код приглашения)
- Инвайт-код хранится в env-переменной `INVITE_CODE` — защита от посторонних
- Защита всех `/dashboard/*` через middleware NextAuth

### 5.2 Dashboard `/dashboard`
- Сводная статистика: кол-во заявок, отправленных писем, просмотров лендингов
- Быстрые действия: «Проверить почту», «Добавить видео», «Создать рассылку»

### 5.3 Входящие заявки `/emails`
- Кнопка «Загрузить новые» — подключается к IMAP, скачивает новые письма
- Список заявок: имя клиента, email, товар, дата (card-based layout, не таблица)
- Парсер автоматически извлекает из письма: ссылку на товар, имя, телефон, email клиента
- Статус: новая / обработана / архивная
- **Форма редактирования** — inline или modal для правки: customerName, customerEmail, customerPhone, productUrl (когда парсер ошибся)
- **Архивация** — кнопка для скрытия спама/нерелевантных заявок
- Фильтр: Все / Новые / Обработанные / Архив
- Пагинация: 20 заявок на страницу

### 5.4 Видеотека `/videos`
- Поле ввода YouTube-ссылки → система подтягивает: название, превью, длительность
- Список добавленных видео с превью
- Поиск по названию

### 5.5 Создание лендинга и отправка `/send`
**Главный рабочий экран (одна страница, без wizard):**
1. Выбираешь заявку (клиента) из списка необработанных
2. Выбираешь видео из библиотеки (система автоподсказывает по product name)
3. Опционально: добавляешь персональную заметку для email
4. Предпросмотр лендинга и email (side-by-side на десктопе, tabs на мобилке)
5. Нажимаешь «Отправить» → **confirm dialog** с email получателя → система:
   - Создаёт лендинг `/l/[slug]`
   - Генерирует короткую ссылку `/r/[code]`
   - Отправляет email через SMTP
   - Помечает заявку как обработанную
   - Показывает toast «Письмо отправлено» + кнопку «Скопировать ссылку»
- **Повторная отправка:** возможно создать новый лендинг для той же заявки (другое видео, исправление ошибки)

### 5.6 Публичный лендинг `/l/[slug]` — продающий дизайн
- Встроенный YouTube-плеер (iframe, responsive 16:9)
- Заголовок видео + описательный текст
- **Блок преимуществ** (3 пункта: обзор от эксперта, честное сравнение, гарантия)
- Open Graph мета-теги (title, description, thumbnail) для красивого превью в мессенджерах
- **Большая CTA-кнопка «Купить»** → ведёт через `/api/landings/[slug]/click` (считает клик, затем 302-редирект на productUrl)
- Контактный блок (email laptop.guru)
- Адаптивный дизайн (max-w-2xl, mobile-first)
- Счётчик просмотров (atomic increment при каждом открытии)
- Шрифт Lato (консистентность с laptopguru.pl)

### 5.7 Редирект `/r/[code]`
- Принимает короткий код, ищет лендинг, редиректит
- Считает клики

### 5.8 Статистика `/links`
- Список всех коротких ссылок
- Клики, просмотры, дата создания
- **Кнопка «Скопировать»** (copy to clipboard) рядом с каждой ссылкой

### 5.9 История отправок `/sent`
- Список всех отправленных писем
- Получатель, видео, лендинг, дата, статус (sent/failed)
- Если failed — показывать errorMessage
- Фильтрация по статусу

---

## 6. HTML-email шаблон

Письмо клиенту содержит:
- Логотип / заголовок (laptop.guru)
- Текст приветствия: «Здравствуйте, [имя]! Для вас подготовлен видеообзор»
- **Персональная заметка** (опционально, если сотрудник добавил)
- Превью-картинка видео (кликабельная → ведёт на лендинг)
- Кнопка «Смотреть видеообзор» → короткая ссылка на лендинг
- Подпись / footer (контакты laptop.guru)

Сделан через **React Email** — JSX-компонент, который компилируется в email-совместимый HTML.

**Стилизация:** 600px max-width, шрифт Lato/Arial, CTA-кнопка `#fb7830` (оранжевый бренд). Table-based layout для Outlook. Dark mode поддержка через `@media (prefers-color-scheme: dark)`.

**Совместимость:** тестировать в Gmail, Outlook (desktop + web), Apple Mail.

---

## 7. IMAP-парсер (чтение заявок)

Подключается к Hostinger IMAP-серверу:
- Читает непрочитанные письма из INBOX (или указанной папки)
- Дедупликация по `Message-ID` заголовку (upsert в БД) — защита от повторного импорта
- Парсит HTML-тело письма:
  - Ищет ссылку на товар (regex по домену laptop.guru)
  - Извлекает поля формы: имя, email, телефон
- Сохраняет в таблицу `IncomingEmail`
- Помечает письмо как прочитанное на сервере
- При ошибках подключения: показывает пользователю сообщение об ошибке в UI

---

## 8. Деплой

```yaml
# docker-compose.yml (production)
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

  app:
    build: .
    restart: unless-stopped
    expose:
      - "3000"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=shorterlink
      - POSTGRES_USER=shorterlink
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shorterlink"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

```
# Caddyfile
your-domain.com {
  reverse_proxy app:3000
}
```

> **Для локальной разработки** используется упрощённый `docker-compose.dev.yml` только с PostgreSQL (без Caddy).

---

## 9. Переменные окружения (.env)

```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/shorterlink

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com

# IMAP (чтение заявок)
IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
IMAP_USER=...
IMAP_PASSWORD=...

# SMTP (отправка email)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=noreply@your-domain.com

# YouTube
YOUTUBE_API_KEY=...

# App
APP_URL=https://your-domain.com

# Registration
INVITE_CODE=your-secret-invite-code
```

---

## 10. Подпланы для реализации

Проект разбивается на следующие этапы (каждый = отдельный план).
Дизайн (Tailwind) применяется параллельно с разработкой каждой страницы — не отдельной фазой.
Подробное ТЗ дизайна: [DESIGN.md](../../DESIGN.md)

### План 1: Инициализация и архитектура
- Next.js 15 проект + TypeScript + Tailwind CSS
- Prisma + PostgreSQL + docker-compose.dev.yml (для локальной БД)
- Структура папок, базовый layout (header с горизонтальной навигацией)
- `/api/health` endpoint
- `.env.example`

### План 2: Авторизация
- NextAuth.js + Credentials provider (JWT, TTL 24h)
- Login / Register страницы (с инвайт-кодом из env)
- Middleware для защиты `/dashboard/*` роутов

### План 3: IMAP-парсер (входящие заявки)
- Подключение к Hostinger IMAP
- Парсинг email-заявок (customerEmail из тела, а не из from)
- API-роуты + страница `/emails`
- **Форма редактирования данных заявки** (modal/inline)
- **Архивация заявок**
- Пагинация (20 шт/страница)
- Санитизация HTML при отображении тела email (XSS-защита)

### План 4: Видеотека
- YouTube Data API интеграция (с oEmbed fallback)
- Добавление видео по ссылке
- Страница `/videos` (grid layout с карточками)
- Soft-delete (поле `active`)

### План 5: Core workflow (лендинги + ссылки + отправка — единая фаза)
- Генерация лендингов `/l/[slug]` (продающий дизайн, шрифт Lato)
- Сокращение ссылок `/r/[code]`
- React Email шаблон (с персональной заметкой)
- SMTP-интеграция (nodemailer)
- Рабочий экран `/send`: выбор заявки + автоподбор видео + персональная заметка + confirm dialog + отправка
- Повторная отправка для той же заявки
- Toast-уведомления
- Страница `/links` с кнопкой «Скопировать»

### План 6: Dashboard и аналитика
- Сводная статистика + быстрые действия
- Страница `/sent` (история отправок)
- Dashboard: последние заявки + последние отправки

### План 7: QA + production
- Responsive тестирование (mobile, tablet, desktop)
- Edge cases, error states, empty states
- Dockerfile (multi-stage build)
- Caddy + docker-compose.yml (production, SSL)

### План 8: Deploy
- Деплой на VPS
- Настройка домена + DNS
- SPF/DKIM/DMARC для email
- Go-live

---

## 11. Будущие улучшения (не в текущем скоупе)

- Автоматическая отправка email при получении заявки
- Аналитика: open rate, click rate
- Несколько шаблонов email
- A/B тестирование лендингов
- Интеграция с CRM
- Telegram-бот для уведомлений о новых заявках
