# shorterLINK — ТЗ дизайна (Design Specification)

**Версия:** 1.0
**Дата:** 2026-03-17
**Стиль:** Минимализм (dashboard) + Продающий (клиентский лендинг)
**Бренд:** Консистентен с laptopguru.pl

---

## 1. Цветовая палитра

Основана на брендинге laptopguru.pl с адаптацией для внутреннего инструмента.

### 1.1 Основные цвета

| Токен | Hex | Использование |
|-------|-----|---------------|
| `--primary` | `#fb7830` | Кнопки, ссылки, акценты, активные состояния |
| `--primary-hover` | `#e56a25` | Hover-состояние primary |
| `--primary-light` | `#fff4ed` | Фон badge, подсветка строк, фон уведомлений |
| `--primary-muted` | `rgba(251, 120, 48, 0.15)` | Фон тегов, лёгкие акценты |

### 1.2 Нейтральные цвета

| Токен | Hex | Использование |
|-------|-----|---------------|
| `--bg-primary` | `#ffffff` | Основной фон страниц |
| `--bg-secondary` | `#f9fafb` | Фон sidebar, фон карточек |
| `--bg-tertiary` | `#f3f4f6` | Фон input, фон таблиц (чередование) |
| `--border` | `#e5e7eb` | Все бордеры, разделители |
| `--border-focus` | `#fb7830` | Фокус на input, активный бордер |

### 1.3 Текст

| Токен | Hex | Использование |
|-------|-----|---------------|
| `--text-primary` | `#111827` | Заголовки, основной текст |
| `--text-secondary` | `#6b7280` | Подписи, мета-информация |
| `--text-tertiary` | `#9ca3af` | Placeholder, disabled текст |
| `--text-on-primary` | `#ffffff` | Текст на оранжевом фоне |

### 1.4 Семантические цвета

| Токен | Hex | Использование |
|-------|-----|---------------|
| `--success` | `#059669` | Статус «отправлено», «обработано» |
| `--success-light` | `#ecfdf5` | Фон success-badge |
| `--error` | `#dc2626` | Ошибки, статус «failed» |
| `--error-light` | `#fef2f2` | Фон error-badge |
| `--warning` | `#d97706` | Предупреждения |
| `--warning-light` | `#fffbeb` | Фон warning-badge |
| `--info` | `#2563eb` | Статус «новая заявка», информационные |
| `--info-light` | `#eff6ff` | Фон info-badge |

### 1.5 Tailwind CSS конфигурация

```js
// tailwind.config.ts — extend colors
colors: {
  brand: {
    DEFAULT: '#fb7830',
    hover: '#e56a25',
    light: '#fff4ed',
    muted: 'rgba(251, 120, 48, 0.15)',
  },
}
```

---

## 2. Типографика

### 2.1 Шрифт

| Параметр | Значение |
|----------|----------|
| **Основной шрифт** | `Inter` (Google Fonts) |
| **Fallback** | `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| **Лендинг (клиентский)** | `Lato` — как на laptopguru.pl, для консистентности бренда |

> Inter для dashboard — лучше читается в интерфейсах с таблицами и числами.
> Lato для лендинга — сохраняет брендинг laptopguru.pl.

### 2.2 Масштаб шрифтов

| Элемент | Размер | Вес | Line-height |
|---------|--------|-----|-------------|
| H1 (заголовок страницы) | 24px / `text-2xl` | 700 | 1.3 |
| H2 (секция) | 20px / `text-xl` | 600 | 1.35 |
| H3 (подсекция) | 16px / `text-base` | 600 | 1.4 |
| Body | 14px / `text-sm` | 400 | 1.5 |
| Small / Caption | 12px / `text-xs` | 400 | 1.4 |
| Button | 14px / `text-sm` | 500 | 1 |
| Badge | 12px / `text-xs` | 500 | 1 |

---

## 3. Компоненты UI

### 3.1 Кнопки

```
Primary:    bg-brand text-white rounded-lg px-4 py-2.5 font-medium
            hover:bg-brand-hover transition-colors
            Используется для: «Отправить», «Загрузить новые», «Добавить видео»

Secondary:  bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5
            hover:bg-gray-50 transition-colors
            Используется для: «Отмена», «Назад», второстепенные действия

Danger:     bg-red-600 text-white rounded-lg px-4 py-2.5
            hover:bg-red-700 transition-colors
            Используется для: «Удалить» (с confirm dialog)

Ghost:      bg-transparent text-gray-600 px-3 py-2
            hover:bg-gray-100 rounded-lg transition-colors
            Используется для: иконки-действия в таблицах, copy-кнопка
```

**Состояния кнопок:**
- Default → Hover → Active (pressed) → Disabled (opacity-50, cursor-not-allowed)
- Loading: spinner (animate-spin) слева от текста, текст «Отправка...»

### 3.2 Input / Textarea

```
Default:    w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5
            text-sm placeholder:text-gray-400
            focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-white
            transition-all

Error:      border-red-500 focus:border-red-500 focus:ring-red-500/20
            + текст ошибки text-xs text-red-600 mt-1
```

**Label:** `text-sm font-medium text-gray-700 mb-1.5`

### 3.3 Card

```
Default:    bg-white rounded-xl border border-gray-200 p-5
            Используется для: stat-карточки, видео-карточки, заявки

Hoverable:  + hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer
            Используется для: кликабельные элементы (выбор видео, выбор заявки)

Selected:   border-brand bg-brand/5 ring-2 ring-brand/20
            Используется для: выбранная заявка/видео на странице /send
```

### 3.4 Badge / Status

```
New (info):       bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium
Processed:        bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium
Sent (success):   bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium
Failed (error):   bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium
```

### 3.5 Table

```
Заголовок:  text-xs font-medium text-gray-500 uppercase tracking-wider
            bg-gray-50 px-4 py-3 border-b

Строка:     px-4 py-3.5 border-b border-gray-100
            hover:bg-gray-50 transition-colors

Чередование: odd:bg-white even:bg-gray-50/50 (опционально)
```

### 3.6 Modal / Dialog

```
Overlay:    fixed inset-0 bg-black/50 backdrop-blur-sm z-50
Dialog:     bg-white rounded-2xl shadow-xl max-w-md w-full p-6
            animate-in: scale-95 → scale-100, opacity-0 → opacity-100 (150ms)
```

### 3.7 Toast / Notification

```
Позиция:    fixed bottom-4 right-4 z-50
Container:  bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3
            flex items-center gap-3
            animate-in: translateY(100%) → translateY(0) (200ms)
            auto-dismiss: 4 секунды

Success:    left-border-4 border-l-green-500 + зелёная иконка ✓
Error:      left-border-4 border-l-red-500 + красная иконка ✕
Info:       left-border-4 border-l-blue-500 + синяя иконка ℹ
```

---

## 4. Layout — Dashboard (внутренняя панель)

### 4.1 Общая структура

```
┌────────────────────────────────────────────────────┐
│  Header (h-16, sticky top-0)                       │
│  [Logo]              [Навигация]        [User ▾]   │
├────────────────────────────────────────────────────┤
│                                                    │
│  Main content (max-w-6xl mx-auto px-6 py-8)       │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  Page title (H1) + Action button (справа)    │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  [Content area]                                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Решение: без sidebar.** Для 6 пунктов меню горизонтальная навигация в header эффективнее — экономит горизонтальное пространство, проще на мобилке.

### 4.2 Header

```
Высота:     h-16 (64px)
Фон:        bg-white border-b border-gray-200
Позиция:    sticky top-0 z-40

Контент:
  Левая:    Логотип «shorterLINK» — text-lg font-bold text-gray-900
            + подпись «by laptop.guru» — text-xs text-gray-400

  Центр:    Навигация — горизонтальные табы
            [Заявки] [Видео] [Отправить] [Ссылки] [Dashboard]
            Активный: text-brand border-b-2 border-brand
            Неактивный: text-gray-600 hover:text-gray-900

  Правая:   Имя пользователя + dropdown (Выйти)

Мобайл:     Hamburger-меню → slide-in navigation
```

### 4.3 Страница Dashboard

```
┌──────────────────────────────────────────────┐
│  Dashboard                                   │
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │  12  │  │   8  │  │  156 │  │  23  │     │
│  │новых │  │отпр. │  │views │  │clicks│     │
│  │заявок│  │писем │  │      │  │      │     │
│  └──────┘  └──────┘  └──────┘  └──────┘     │
│                                              │
│  Быстрые действия                            │
│  ┌─────────────┐ ┌─────────────┐             │
│  │ 📨 Проверить│ │ ✉️ Отправить│             │
│  │    почту    │ │    письмо   │             │
│  └─────────────┘ └─────────────┘             │
│                                              │
│  Последние заявки           Последние отправки│
│  ┌──────────────────┐ ┌────────────────────┐ │
│  │ Иван Петров      │ │ → anna@mail.com    │ │
│  │ MacBook Pro M4   │ │   MacBook Air      │ │
│  │ 5 мин назад  🔵  │ │   сегодня 14:30 ✅ │ │
│  │                  │ │                    │ │
│  │ Мария Коваленко  │ │ → sergey@gmail.com │ │
│  │ Dell XPS 15      │ │   ASUS ROG         │ │
│  │ 23 мин назад 🔵  │ │   вчера 18:45  ✅  │ │
│  └──────────────────┘ └────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Stat-карточки:** 4 в ряд на десктопе, 2x2 на планшете, 1 колонка на мобилке.

### 4.4 Страница Заявки `/emails`

```
┌──────────────────────────────────────────────┐
│  Входящие заявки           [🔄 Загрузить]    │
│                                              │
│  Фильтр: [Все ▾] [Новые] [Обработанные]     │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │ 🔵 Иван Петров         5 мин назад      ││
│  │    ivan@mail.com  •  +380991234567       ││
│  │    MacBook Pro M4 — laptop.guru/product  ││
│  │    [📝 Редактировать] [✉️ Отправить]     ││
│  ├──────────────────────────────────────────┤│
│  │ ⚫ Мария Коваленко     вчера             ││
│  │    maria@mail.com  •  +380997654321      ││
│  │    Dell XPS 15 — laptop.guru/dell-xps    ││
│  │    Обработана: Денис, вчера 18:45        ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Каждая заявка — карточка (не строка таблицы).** Легче читать, больше информации, удобнее на мобилке.

При клике на «Редактировать» — inline-форма или modal с полями: customerName, customerEmail, customerPhone, productUrl.

### 4.5 Страница Видеотека `/videos`

```
┌──────────────────────────────────────────────┐
│  Видеотека                [+ Добавить видео]  │
│                                              │
│  🔍 [Поиск по названию...]                   │
│                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ ▶ thumb │ │ ▶ thumb │ │ ▶ thumb │        │
│  │─────────│ │─────────│ │─────────│        │
│  │ MacBook │ │ Dell XPS│ │ ASUS ROG│        │
│  │ Pro M4  │ │ 15 2025 │ │ Strix   │        │
│  │ 12:34   │ │ 8:45    │ │ 15:20   │        │
│  │ TechCh  │ │ NotebCh │ │ GameCh  │        │
│  └─────────┘ └─────────┘ └─────────┘        │
└──────────────────────────────────────────────┘
```

**Grid layout:** 3 колонки на десктопе, 2 на планшете, 1 на мобилке.
**Карточка видео:** thumbnail (16:9), название (2 строки max), длительность, канал.
**Добавление:** Modal с полем YouTube URL → Loading → Превью карточки → «Сохранить».

### 4.6 Страница Отправки `/send` (главный рабочий экран)

```
┌──────────────────────────────────────────────┐
│  Отправить письмо                            │
│                                              │
│  Шаг 1: Выберите заявку                      │
│  ┌─────────────────────────────────────────┐ │
│  │ ○ Иван Петров — MacBook Pro M4          │ │
│  │ ● Мария Коваленко — Dell XPS 15   ✓    │ │
│  │ ○ Сергей Ковалев — ASUS ROG Strix      │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  Шаг 2: Выберите видео                       │
│  ┌──────┐ ┌──────┐ ┌──────┐                 │
│  │ ▶    │ │ ▶ ✓  │ │ ▶    │                 │
│  │ Mac  │ │ Dell │ │ ASUS │                 │
│  └──────┘ └──────┘ └──────┘                 │
│  💡 Рекомендовано: «Dell XPS 15 обзор»       │
│                                              │
│  Шаг 3: Персонализация (опц.)               │
│  ┌─────────────────────────────────────────┐ │
│  │ Добавьте заметку для клиента...         │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  Предпросмотр                                │
│  ┌──────────────────┐ ┌──────────────────┐   │
│  │   📱 Лендинг     │ │   ✉️ Email       │   │
│  │   ┌──────────┐   │ │   ┌──────────┐   │   │
│  │   │ ▶ Video  │   │ │   │ Здравств │   │   │
│  │   │          │   │ │   │ Для вас  │   │   │
│  │   │ [Купить] │   │ │   │ [Смотр.] │   │   │
│  │   └──────────┘   │ │   └──────────┘   │   │
│  └──────────────────┘ └──────────────────┘   │
│                                              │
│  Получатель: maria@mail.com                  │
│              [Отправить ✉️]                   │
│                                              │
└──────────────────────────────────────────────┘
```

**Ключевые UX-решения:**
- Один экран, scrollable — не wizard с шагами
- Автоподбор видео при выборе заявки (по product name)
- Превью лендинга и email рядом (side-by-side на десктопе, tabs на мобилке)
- Confirm dialog перед отправкой: «Отправить письмо на maria@mail.com? [Отмена] [Отправить]»
- После отправки: toast «Письмо отправлено» + автоматический переход к следующей необработанной заявке

---

## 5. Публичный лендинг `/l/[slug]` — Продающий дизайн

### 5.1 Структура

```
┌────────────────────────────────────────┐
│  ┌────────────────────────────────┐    │
│  │         laptop.guru            │    │  ← логотип/бренд
│  └────────────────────────────────┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │                                │    │
│  │         ▶ YouTube Video        │    │  ← 16:9 iframe, autoplay off
│  │           (responsive)         │    │
│  │                                │    │
│  └────────────────────────────────┘    │
│                                        │
│  ╔════════════════════════════════╗    │
│  ║  Видеообзор: Dell XPS 15 2025 ║    │  ← H1, название видео
│  ╚════════════════════════════════╝    │
│                                        │
│  Подготовили для вас подробный обзор   │  ← описательный текст
│  этого ноутбука. Посмотрите видео      │
│  и узнайте все преимущества!           │
│                                        │
│  ┌────────────────────────────────┐    │
│  │  ⭐ Почему стоит выбрать:      │    │  ← блок преимуществ
│  │                                │    │
│  │  ✓ Детальный обзор от эксперта │    │
│  │  ✓ Честное сравнение с аналог. │    │
│  │  ✓ Гарантия от laptop.guru     │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌════════════════════════════════┐    │
│  │                                │    │
│  │    🛒 КУПИТЬ СЕЙЧАС →          │    │  ← CTA-кнопка, большая
│  │                                │    │
│  └════════════════════════════════┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │  💬 Остались вопросы?          │    │  ← доп. блок доверия
│  │  Свяжитесь с нами:            │    │
│  │  📧 info@laptop.guru          │    │
│  └────────────────────────────────┘    │
│                                        │
│  ─────────────────────────────────     │
│  © laptop.guru • Ваш эксперт          │  ← footer
│  по ноутбукам                          │
└────────────────────────────────────────┘
```

### 5.2 Стилизация лендинга

```
Фон страницы:     bg-gradient-to-b from-white to-gray-50
Max width:        max-w-2xl mx-auto (640px) — узкий, фокус на контенте
Padding:          px-4 py-8 (мобилка), px-8 py-12 (десктоп)

Видео-контейнер:  aspect-video rounded-xl overflow-hidden shadow-lg
                  border border-gray-200

Заголовок:        text-2xl md:text-3xl font-bold text-gray-900
                  font-family: Lato (бренд laptopguru.pl)

Описание:         text-base text-gray-600 leading-relaxed

Блок преимуществ:  bg-orange-50 border border-orange-100 rounded-xl p-5

CTA кнопка:       bg-brand hover:bg-brand-hover text-white
                  text-lg font-semibold py-4 px-8 rounded-xl
                  w-full max-w-sm mx-auto
                  shadow-lg shadow-brand/25
                  transition-all hover:shadow-xl hover:scale-[1.02]
                  active:scale-[0.98]

Footer:           text-sm text-gray-400 border-t border-gray-200 pt-6 mt-12
```

### 5.3 Open Graph (превью в мессенджерах)

```html
<meta property="og:title" content="Видеообзор Dell XPS 15 — laptop.guru" />
<meta property="og:description" content="Посмотрите подробный видеообзор и купите с гарантией" />
<meta property="og:image" content="https://img.youtube.com/vi/{videoId}/maxresdefault.jpg" />
<meta property="og:type" content="video.other" />
```

---

## 6. HTML Email шаблон

### 6.1 Структура письма

```
┌──────────────────────────────────────┐
│           laptop.guru                │  ← логотип/текст, centered
│  ─────────────────────────────────── │
│                                      │
│  Здравствуйте, Мария!               │  ← персонализация
│                                      │
│  Специально для вас мы подготовили   │
│  видеообзор интересующего вас        │
│  ноутбука.                           │
│                                      │
│  {Персональная заметка сотрудника}   │  ← опциональный текст
│                                      │
│  ┌──────────────────────────────┐    │
│  │         ▶                    │    │  ← кликабельный thumbnail
│  │     [YouTube thumb]          │    │     ведёт на лендинг
│  │         12:34                │    │
│  └──────────────────────────────┘    │
│                                      │
│  Dell XPS 15 — подробный обзор       │  ← название видео
│                                      │
│  ┌══════════════════════════════┐    │
│  │    Смотреть видеообзор →     │    │  ← CTA-кнопка → короткая ссылка
│  └══════════════════════════════┘    │
│                                      │
│  ─────────────────────────────────── │
│  laptop.guru — ваш эксперт          │  ← footer
│  по ноутбукам                        │
│  Если у вас вопросы:                 │
│  info@laptop.guru                    │
└──────────────────────────────────────┘
```

### 6.2 Стилизация email

```
Max width:        600px (стандарт для email-клиентов)
Фон:              #ffffff
Текст:            #222222 (как на laptopguru.pl)
Подписи:          #666666
CTA-кнопка:       bg #fb7830, text white, border-radius 8px, padding 14px 32px
Thumbnail:        width 100%, border-radius 8px
Footer:           #999999, font-size 12px
Шрифт:            Lato, Arial, sans-serif (Lato не во всех клиентах, Arial как fallback)
```

**Требования совместимости:**
- Inline CSS (React Email компилирует автоматически)
- Table-based layout для Outlook
- Dark mode: `@media (prefers-color-scheme: dark)` — инвертировать фон/текст
- Тест в: Gmail (web + app), Outlook (desktop + web), Apple Mail

---

## 7. Адаптивность (Responsive)

### 7.1 Breakpoints

| Breakpoint | Tailwind | Описание |
|-----------|----------|----------|
| Mobile | `< 640px` | Одна колонка, hamburger-меню |
| Tablet | `sm: 640px` | 2 колонки для карточек |
| Desktop | `md: 768px` | Полный layout |
| Wide | `lg: 1024px` | Максимальная ширина контента |

### 7.2 Адаптация компонентов

| Компонент | Mobile | Desktop |
|-----------|--------|---------|
| Header nav | Hamburger → sheet | Горизонтальные табы |
| Stat-карточки | 1 колонка (scroll) | 4 в ряд |
| Видео-grid | 1 колонка | 3 колонки |
| Заявки-список | Компактные карточки | Полные карточки с деталями |
| `/send` превью | Табы (лендинг / email) | Side-by-side |
| Лендинг | Полная ширина, px-4 | max-w-2xl centered, px-8 |

### 7.3 Touch-оптимизация (mobile)

- Минимальный размер тапа: 44x44px
- Кнопки: py-3 на мобилке (вместо py-2.5)
- Swipe для переключения табов (лендинг ↔ email превью)
- Нет hover-only элементов — все доступны по тапу

---

## 8. Микроанимации

### 8.1 Общие принципы

- **Длительность:** 150ms для hover, 200ms для появления, 300ms для layout shifts
- **Easing:** `ease-out` для появления, `ease-in-out` для трансформаций
- **Правило:** Анимируем opacity, transform, colors. Никогда — layout properties (width, height, margin)

### 8.2 Конкретные анимации

| Элемент | Анимация |
|---------|----------|
| Кнопка hover | `transition-colors duration-150` |
| Карточка hover | `transition-all duration-200` — shadow + border-color |
| Modal появление | `scale-95 → scale-100 + opacity-0 → opacity-100` (150ms) |
| Toast появление | `translateY(16px) → translateY(0) + opacity` (200ms) |
| Toast исчезновение | `opacity → 0 + translateY(8px)` (150ms), авто через 4 сек |
| Загрузка (skeleton) | `animate-pulse` на placeholder-блоках |
| Отправка email | Spinner → Toast success (без page reload) |
| Tab switch | `transition-colors` на border + text |

---

## 9. Иконки

**Библиотека:** `lucide-react` — консистентный минималистичный стиль, хорошая tree-shakability.

| Контекст | Иконка |
|----------|--------|
| Заявки | `Mail` / `Inbox` |
| Видео | `Video` / `Play` |
| Ссылки | `Link2` / `ExternalLink` |
| Dashboard | `LayoutDashboard` |
| Отправить | `Send` |
| Загрузить почту | `RefreshCw` |
| Добавить | `Plus` |
| Копировать | `Copy` → `Check` (после копирования) |
| Удалить | `Trash2` |
| Редактировать | `Pencil` |
| Поиск | `Search` |
| Статус: новая | `Circle` (синий fill) |
| Статус: обработана | `CheckCircle2` (серый) |
| Статус: sent | `CheckCircle2` (зелёный) |
| Статус: failed | `XCircle` (красный) |

---

## 10. Пустые состояния (Empty States)

Каждый список должен иметь empty state — не просто пустая страница.

```
┌──────────────────────────────────────┐
│                                      │
│          📨                          │
│                                      │
│    Нет входящих заявок               │
│    Нажмите «Загрузить новые»,        │
│    чтобы проверить почту             │
│                                      │
│    [🔄 Загрузить новые]              │
│                                      │
└──────────────────────────────────────┘

Видеотека пустая:     «Добавьте первое видео из YouTube» + кнопка
Нет ссылок:           «Ссылки появятся после отправки первого письма»
Нет отправленных:     «Вы ещё не отправляли писем»
```

---

## 11. Состояния загрузки

### 11.1 Skeleton Loading

Для списков и карточек — skeleton-блоки, повторяющие форму контента:

```
Заявка-skeleton:
┌──────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓        ▓▓▓▓▓▓         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓               │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                    │
└──────────────────────────────────────┘
(animate-pulse, bg-gray-200 rounded)
```

### 11.2 Action Loading

- Кнопка «Загрузить новые»: текст → «Загрузка...» + spinner
- Кнопка «Отправить»: текст → «Отправка...» + spinner, disabled
- Добавление видео: modal → loading skeleton → результат

---

## 12. Accessibility

| Требование | Реализация |
|-----------|-----------|
| Контраст текста | Min 4.5:1 (WCAG AA). `#fb7830` на белом = 3.1:1 — использовать только для крупного текста/кнопок с белым текстом |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2` |
| Keyboard nav | Tab между элементами, Enter для действий, Escape для закрытия модалов |
| ARIA labels | Иконки-кнопки обязательно с `aria-label` |
| Screen reader | Статусы заявок: sr-only текст («Новая заявка», «Обработана») |

---

## 13. Страницы авторизации

### 13.1 Login / Register

```
┌────────────────────────────────────────┐
│                                        │
│         ┌──────────────────┐           │
│         │                  │           │
│         │  shorterLINK     │           │
│         │  by laptop.guru  │           │
│         │                  │           │
│         │  ┌────────────┐  │           │
│         │  │ Email      │  │           │
│         │  └────────────┘  │           │
│         │  ┌────────────┐  │           │
│         │  │ Пароль     │  │           │
│         │  └────────────┘  │           │
│         │                  │           │
│         │  [  Войти  ]     │           │
│         │                  │           │
│         │  Нет аккаунта?   │           │
│         │  Регистрация →   │           │
│         │                  │           │
│         └──────────────────┘           │
│                                        │
└────────────────────────────────────────┘
```

**Стиль:**
- Centered card (max-w-sm) на нейтральном фоне (bg-gray-50)
- Карточка: bg-white shadow-sm rounded-2xl p-8
- Логотип сверху — текстовый, не картинка
- Минимум элементов — только форма + ссылка на register/login

---

## 14. Резюме дизайн-решений

| Решение | Обоснование |
|---------|-------------|
| Без sidebar | 6 пунктов навигации — горизонтальный nav экономит место |
| Card-based lists | Лучше читаемость и мобильная адаптация чем таблицы |
| Одностраничный /send | Wizard с шагами замедляет — всё видно сразу |
| Оранжевый акцент (#fb7830) | Консистентность с laptopguru.pl |
| Inter (dashboard) + Lato (лендинг) | Inter оптимален для UI, Lato — бренд для клиентов |
| Продающий лендинг | Блок преимуществ + большая CTA = выше конверсия |
| Skeleton loading | Лучше UX чем спиннеры для списков |
| Toast вместо page alerts | Не блокирует workflow, информативен |
