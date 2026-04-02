# Дизайн мульти-тенантной CRM

**Дата:** 2026-04-01
**Статус:** Черновик
**Подход:** Общая БД + companyId

## Краткое описание

Превращаем одноорганизационную CRM в мульти-тенантную SaaS-платформу, где несколько компаний используют один и тот же инстанс. Глобальный SUPER_ADMIN управляет всеми компаниями и может "переключаться" в любую компанию для просмотра её данных.

## Принятые решения

| Решение | Выбор | Обоснование |
|---------|-------|-------------|
| Модель тенантности | Общая БД + companyId | Индустриальный стандарт, лучшая совместимость с Prisma, простой switch |
| Пользователь-компания | 1 аккаунт = 1 компания | Простая модель, достаточная для задачи |
| Создание компаний | Только SUPER_ADMIN | Контролируемый онбординг, без саморегистрации |
| Роли | SUPER_ADMIN > ADMIN > USER | Минимальные изменения текущей системы ролей, добавляем одну роль |
| Суперадмин-панель | Отдельный роут `/super-admin` | Чистое разделение от интерфейса компании |
| Существующие данные | Полная очистка + свежий старт | Текущие данные не важны |
| Публичная регистрация | Убрана | Только админы создают пользователей |

## 1. Модель данных

### Новая модель: `Company`

```prisma
model Company {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique   // URL-дружественный идентификатор
  logo        String?
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users              User[]
  landings           Landing[]
  videos             Video[]
  quickLinks         QuickLink[]
  shortLinks         ShortLink[]
  contacts           Contact[]
  conversations      Conversation[]
  channels           Channel[]
  templates          Template[]
  autoReplyRules     AutoReplyRule[]
  tags               Tag[]
  teams              Team[]
  incomingEmails     IncomingEmail[]
  sentEmails         SentEmail[]
  businessHours      BusinessHoursSchedule[]
  quickReplies       MsgQuickReply[]
  notifications      Notification[]
}
```

### Обновлённый enum: `Role`

```prisma
enum Role {
  SUPER_ADMIN   // Глобальный — не привязан к компании
  ADMIN         // Админ компании
  USER          // Сотрудник компании
}
```

### Обновлённая модель: `User`

```prisma
model User {
  // ... существующие поля ...
  companyId   String?    // null = SUPER_ADMIN
  company     Company?   @relation(fields: [companyId], references: [id])
  role        Role       @default(USER)
}
```

### `companyId` добавляется ко всем таблицам бизнес-данных

Каждая таблица, хранящая данные компании, получает обязательное поле `companyId`:

- Landing, Video, QuickLink, ShortLink
- Contact, Conversation, Message, Channel
- Template, AutoReplyRule, Tag, Team, TeamMember
- IncomingEmail, SentEmail
- BusinessHoursSchedule, MsgQuickReply, Notification
- InternalNote, ConversationAssignment
- WebhookEvent, OutboundJob, OutboundJobLog
- AnalyticsMessageDaily, AnalyticsConversationDaily, AnalyticsResponseTime
- TypingIndicator

`LandingVisit` и `QuickLinkVisit` получают `companyId` напрямую — фильтрация через JOIN с Landing/QuickLink ненадёжна и медленна.

## 2. Авторизация и изоляция данных

### JWT payload

Текущий: `{ sub, email, role, permissions }`
Новый: `{ sub, email, role, permissions, companyId }`

- `companyId` равен null для SUPER_ADMIN (пока он не переключится в компанию)
- После switch: `companyId` устанавливается + добавляется флаг `impersonating: true`

**Инвалидация старых токенов:** При switch добавляется поле `tokenVersion: Int @default(0)` в модель `User`. При каждом switch — инкремент `tokenVersion`. JwtStrategy проверяет версию при каждом запросе. Это предотвращает одновременное наличие нескольких валидных JWT на разные компании у одного суперадмина.

### Механизм "switch" суперадмина

1. SUPER_ADMIN вызывает `POST /api/super-admin/companies/:id/switch`
2. Бэкенд инкрементирует `tokenVersion` у пользователя, выдаёт новый JWT с `{ companyId: <целевая>, impersonating: true, originalRole: SUPER_ADMIN }`
3. Фронтенд сохраняет JWT и редиректит на `/dashboard`
4. В UI отображается постоянный баннер: "Просмотр: Компания X [Выйти]"
5. "Выйти" вызывает `POST /api/super-admin/exit-company` → инкрементирует `tokenVersion` → восстанавливает оригинальный JWT SUPER_ADMIN

**Ограничения в режиме impersonation:** SUPER_ADMIN с `impersonating: true` имеет **read-only** доступ по умолчанию. Мутации (создание/удаление) требуют дополнительного подтверждения на фронтенде.

### CompanyGuard (NestJS)

Новый guard, применяемый ко всем эндпоинтам с данными компании:

1. Извлекает `companyId` из JWT
2. Если `companyId` = null и роль SUPER_ADMIN → блокирует доступ (нужно сначала переключиться)
3. Если `companyId` = null и роль не SUPER_ADMIN → отклоняет (невалидное состояние)
4. Внедряет `companyId` в контекст запроса для использования в сервисах

### Prisma tenant middleware

Расширение Prisma-клиента, которое автоматически:

- **При чтении** (`findMany`, `findFirst`): добавляет `WHERE companyId = X`
- **`findUnique`**: автоматически переписывается в `findFirst` с добавлением `companyId` (Prisma не позволяет добавить дополнительное условие к `findUnique` по уникальному ключу):
  ```typescript
  if (params.action === 'findUnique') {
    params.action = 'findFirst';
    params.args.where = { ...params.args.where, companyId };
  }
  ```
- **При создании**: устанавливает `companyId = X`
- **При обновлении/удалении**: добавляет `WHERE companyId = X` для предотвращения кросс-тенантных мутаций

`companyId` передаётся через AsyncLocalStorage (контекст запроса NestJS), чтобы сервисам не нужно было явно его передавать.

Таблицы, исключённые из тенантной фильтрации: `User` (фильтруется отдельно), `Company` (только суперадмин).

**Важно про AsyncLocalStorage:** NestJS должен создавать новый ALS-контекст на каждый HTTP-запрос. Рекомендуется использовать `nestjs-cls` (`ClsModule`) вместо самописного решения — иначе при параллельных запросах возможна утечка `companyId` между запросами.

## 3. Суперадмин-панель (`/super-admin`)

### Страницы

**`/super-admin/dashboard`** — Глобальный обзор
- Общее количество компаний, пользователей, активность
- Быстрая статистика по каждой компании (карточки или таблица)

**`/super-admin/companies`** — Управление компаниями
- Таблица: название, slug, статус (активна/нет), кол-во пользователей, дата создания
- Действия: создать, редактировать, активировать/деактивировать, удалить
- Кнопка "Войти в компанию" → запускает switch

**`/super-admin/companies/[id]`** — Детали компании
- Редактирование информации о компании (название, slug, логотип, описание)
- Список пользователей компании (создать ADMIN/USER, удалить)
- Статистика: кол-во лендингов, контактов, переписок

**`/super-admin/users`** — Глобальный список пользователей
- Все пользователи всех компаний
- Фильтр по компании, роли
- Создание пользователей SUPER_ADMIN

### Контроль доступа

- Только роль `SUPER_ADMIN` имеет доступ к роутам `/super-admin/*`
- Фронтенд middleware проверяет `role === SUPER_ADMIN` перед рендером
- Бэкенд эндпоинты защищены декоратором `@RequireRole(Role.SUPER_ADMIN)`
- Обычные ADMIN/USER получают 403 на этих роутах

### Навигация

- SUPER_ADMIN видит отдельный сайдбар с пунктами суперадмин-меню
- При переключении в компанию: видит обычный сайдбар компании + верхний баннер
- ADMIN/USER никогда не видят суперадмин-роуты

## 3.5. Индексы

Каждая модель с `companyId` должна иметь минимально:

```prisma
@@index([companyId])
@@index([companyId, createdAt])
```

Дополнительно по частым фильтрам:

```prisma
// Conversation
@@index([companyId, status])
@@index([companyId, assigneeId])

// Message
@@index([companyId, conversationId, createdAt])

// Contact
@@index([companyId, email])
```

Без этих индексов каждый тенант-фильтр делает full table scan.

## 4. Чистый старт (без миграции данных)

Существующие данные будут удалены. Шаги:

1. Сброс базы данных (`prisma migrate reset` или drop + recreate)
2. Применение новой схемы со всеми полями `companyId`
3. Запуск seed-скрипта, который создаёт:
   - Одного SUPER_ADMIN пользователя (Denys, заданные email/пароль)
   - Одну демо-компанию с ADMIN пользователем
   - Минимально: 1 канал (Email), 3 контакта, 2 переписки, 1 лендинг — чтобы систему можно было проверить сразу после `migrate reset`

## 5. Регистрация и создание пользователей

- **Публичная страница `/register` убирается** (или редиректит на `/login`)
- **SUPER_ADMIN** создаёт компании и их первого ADMIN через `/super-admin/companies`
- **ADMIN компании** создаёт USER-аккаунты через существующую `/admin` панель (в рамках своей компании)
- **Страница логина** (`/login`) остаётся — все пользователи логинятся здесь независимо от компании

### Изменения в потоке логина

1. Пользователь вводит email + пароль
2. Бэкенд валидирует учётные данные
3. Выдаётся JWT с `companyId` из записи пользователя
4. Фронтенд редиректит:
   - SUPER_ADMIN → `/super-admin/dashboard`
   - ADMIN/USER → `/dashboard` (в рамках компании)

## 6. Влияние на существующие модули

### Система пермишнов

Существующие 37 пермишнов остаются без изменений. Они применяются в контексте компании. SUPER_ADMIN обходит все проверки пермишнов (имеет неявный полный доступ).

### Модуль мессенджинга

Все сущности мессенджинга (Channel, Contact, Conversation и т.д.) получают `companyId`. Каждая компания настраивает свои каналы, шаблоны и правила автоответов независимо.

### Система email (IMAP/SMTP)

IMAP/SMTP-данные становятся per-company (хранятся в Channel или новой модели CompanyEmailConfig). Каждая компания подключает свои email-аккаунты.

### Лендинги и аналитика

Лендинги привязаны к компании. Публичные URL — **с namespace**: `/c/[company-slug]/l/[slug]`. Slug уникален в рамках компании (`@@unique([companyId, slug])`), а не глобально — это предотвращает конфликты между компаниями. `LandingVisit` получает `companyId` напрямую.

### Короткие ссылки и быстрые ссылки

Привязаны к компании. Публичные URL редиректа (`/go/[code]`, `/r/[code]`) — код уникален в рамках компании (`@@unique([companyId, code])`). Если нужен глобальный короткий URL без company-prefix, генерировать глобально-уникальный код (nanoid достаточной длины).

### Email конфигурация (IMAP/SMTP)

IMAP/SMTP данные хранятся в `Channel` + `ChannelConfig` — они уже per-company через `companyId`. Отдельная модель `CompanyEmailConfig` **не нужна** — это дублирование.

### Audit log

Все write-операции через суперадмина и чувствительные операции (удаление, деактивация) записываются:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  companyId  String?
  action     String   // CREATE, UPDATE, DELETE, SWITCH, etc.
  entity     String   // Company, User, Channel, etc.
  entityId   String?
  payload    Json?    // diff: { before, after }
  createdAt  DateTime @default(now())

  @@index([companyId, createdAt])
  @@index([userId, createdAt])
}
```

## 7. API-эндпоинты

### Новые эндпоинты суперадмина

```
POST   /api/super-admin/companies              — Создать компанию
GET    /api/super-admin/companies              — Список всех компаний
GET    /api/super-admin/companies/:id          — Детали компании
PATCH  /api/super-admin/companies/:id          — Обновить компанию
DELETE /api/super-admin/companies/:id          — Деактивировать компанию (soft delete: isActive = false). Каскадное удаление — только через отдельный эндпоинт с явным подтверждением.
POST   /api/super-admin/companies/:id/switch   — Переключиться в компанию
POST   /api/super-admin/exit-company           — Выйти из просмотра компании
GET    /api/super-admin/users                  — Список всех пользователей
POST   /api/super-admin/users                  — Создать пользователя (любая компания)
GET    /api/super-admin/dashboard              — Глобальная статистика
```

### Изменённые существующие эндпоинты

Все существующие эндпоинты остаются прежними, но теперь автоматически ограничены `companyId` из JWT через CompanyGuard + Prisma middleware.

## 8. Стратегия тестирования

- Юнит-тесты для CompanyGuard и Prisma tenant middleware
- Интеграционные тесты для проверки изоляции данных между тенантами
- Тест переключения SUPER_ADMIN и корректной фильтрации данных
- Тест инвалидации старого JWT после switch (старый токен должен получать 401)
- Тест что `findUnique` в middleware корректно переписывается в `findFirst` с companyId
- Тест что ALS-контекст не протекает между параллельными запросами разных тенантов
- Тест soft-delete компании: данные скрыты, но не удалены
