# Redesign: Send Page, Landing Page, Email Template

**Style:** Яркий / продающий — эмоциональный, с градиентами, бэджами и live-preview.

## Языки
- **Админка (dashboard):** Русский язык (все UI-тексты: кнопки, заголовки, подсказки, сообщения)
- **Email-шаблон и Лендинг:** Польский язык (клиенты — польские пользователи laptop.guru)
- Это также затрагивает все существующие страницы дашборда — перевести с украинского на русский

### Scope перевода дашборда
- `/src/app/(dashboard)/send/page.tsx` — все тексты на русском
- `/src/app/(dashboard)/emails/page.tsx` — все тексты на русском
- `/src/app/(dashboard)/videos/page.tsx` — все тексты на русском
- `/src/app/(dashboard)/sent/page.tsx` — все тексты на русском
- `/src/app/(dashboard)/links/page.tsx` — все тексты на русском
- `/src/app/(dashboard)/dashboard/page.tsx` — все тексты на русском
- `/src/components/dashboard/sidebar.tsx` — навигация на русском
- `/src/components/dashboard/edit-email-modal.tsx` — модалка на русском

---

## 1. Landing Page (`/src/app/l/[slug]/landing-client.tsx`)

### Data Flow
- `landing.title` содержит "Відеоогляд: {video.title}" — используется как есть
- `customerName` нужно добавить: в `/api/send/route.ts` при создании Landing сохранять `customerName` из incomingEmail
- Prisma schema: добавить поле `customerName String?` в модель Landing
- Server component `/src/app/l/[slug]/page.tsx`: передавать `customerName` в Props

### Props Interface (обновлённый)
```ts
interface Props {
  landing: {
    id: string;
    slug: string;
    title: string;
    productUrl: string;
    buyButtonText: string;
    personalNote: string | null;
    customerName: string | null; // NEW
  };
  video: {
    youtubeId: string;
    title: string;
  };
}
```

### Hero Section
- Gradient фон: `bg-gradient-to-br from-[#fb7830] to-[#fbbf24]`, высота ~250px
- Badge: "Osobista recenzja dla Ciebie" — `bg-white/20 text-white text-xs uppercase tracking-wider px-4 py-1.5 rounded-full`
- Heading: "Witamy, {customerName}!" (если нет имени — "Witamy!") — `text-3xl sm:text-4xl font-bold text-white text-center`
- Subheading: "Przygotowaliśmy recenzję wideo specjalnie dla Ciebie" — `text-lg text-white/90`

### Video Section
- max-w-3xl mx-auto, negative margin (-mt-12) чтобы заходило на gradient
- `rounded-2xl shadow-2xl overflow-hidden`
- YouTube iframe aspect-video
- Под видео: название видео `text-sm text-gray-600 mt-3 text-center`

### Personal Note (если есть)
- `bg-orange-50 border-l-4 border-[#fb7830] rounded-r-lg p-4 italic text-gray-700`
- Без заметки — не рендерится

### Benefits Cards (3 колонки)
- `grid grid-cols-1 sm:grid-cols-3 gap-6`
- Каждая: `bg-white rounded-xl shadow-md p-6 text-center`
- Иконка сверху: SVG inline icon, `text-[#fb7830] w-8 h-8 mx-auto mb-3`
- Заголовок: `font-semibold text-gray-900`
- Описание: `text-sm text-gray-600 mt-1`
- Карточки:
  1. "Recenzja eksperta" — "Nasi specjaliści szczegółowo sprawdzili ten produkt"
  2. "Uczciwe porównanie" — "Obiektywna ocena zalet i wad"
  3. "Najlepsza cena" — "Gwarantujemy najkorzystniejszą ofertę"

### CTA Block
- `bg-orange-50 rounded-2xl p-8 text-center`
- Кнопка: `bg-[#fb7830] hover:bg-[#e56a25] text-white px-10 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105`
- Анимация: `motion-safe:animate-pulse` на `ring` вокруг кнопки (ring-4 ring-[#fb7830]/20)
- Под кнопкой: "Darmowa dostawa · Gwarancja jakości" `text-sm text-gray-500 mt-3`

### Footer
- `bg-gray-900 text-white/60 py-8 text-center`
- Логотип laptop.guru `text-lg font-bold text-white/80`
- Копирайт `text-sm`

### Font
- Заменить `<link>` на `next/font/google` с Lato, weight 400/700, subsets ['latin', 'latin-ext']

### Responsive
- Mobile: padding px-4, text-2xl heading, 1-col benefits
- Desktop: padding px-6, text-4xl heading, 3-col benefits

---

## 2. Email Template (`/src/lib/email-template.ts`)

Table-based layout, inline CSS. Все стили inline для совместимости.

### Interface (без изменений)
```ts
interface EmailTemplateData {
  customerName: string;
  videoTitle: string;
  thumbnail: string;
  landingUrl: string;
  personalNote?: string;
}
```

### Header
- `background-color: #fb7830` (solid — градиенты ненадёжны в email клиентах)
- Логотип: "laptop.guru" — `color: #ffffff; font-size: 24px; font-weight: 700`
- Под логотипом: "Osobista recenzja wideo" — `color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 1px`
- `padding: 30px`

### Body
- `background: #ffffff; padding: 32px 24px`
- "Witamy, **{customerName}**!" — `font-size: 22px; font-weight: bold; color: #222`
- "Nasz ekspert przygotował recenzję wideo specjalnie dla Ciebie" — `font-size: 16px; color: #555; line-height: 1.6`

### Personal Note (если есть)
- `background: #fff8f0; border-left: 4px solid #fb7830; padding: 16px; font-style: italic; color: #555; border-radius: 0 8px 8px 0`

### Video Preview
- Thumbnail: `width: 100%; border-radius: 12px; display: block`
- Без play-button overlay (ненадёжно в email клиентах — просто кликабельный thumbnail)
- Под thumbnail: название видео `font-size: 14px; color: #666; font-weight: 600`
- Обёрнут в `<a href="{landingUrl}">`

### CTA Button
- `display: inline-block; background-color: #fb7830; color: #ffffff; font-size: 18px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 12px`
- Текст: "Obejrzyj recenzję"
- `text-align: center`

### Benefits Row
- Одна строка, 3 ячейки `<td>`, равной ширины (33%)
- На мобильных email клиентах может сжаться — это допустимо, контент достаточно компактный
- Контент каждой ячейки: emoji + текст в одну строку
  - "🎥 Recenzja eksperta"
  - "✅ Uczciwe porównanie"
  - "🚚 Darmowa dostawa"
- `font-size: 13px; color: #666; text-align: center; padding: 8px`

### Footer
- `background-color: #f5f5f5; padding: 24px; text-align: center; border-top: 1px solid #eee`
- "laptop.guru" `color: #999; font-size: 14px; font-weight: 600`
- Копирайт `font-size: 12px; color: #999`

---

## 3. Send Page (`/src/app/(dashboard)/send/page.tsx`)

### Layout
- `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Левая — конфигурация (стекируется вертикально)
- Правая — live-preview (sticky)
- Mobile: одна колонка, preview скрыт (показывается только на lg+)

### Left Column: Configuration

#### Email Selection Block
- Header: "Выберите заявку" `text-sm font-semibold` + badge с количеством `bg-brand text-white text-xs px-2 py-0.5 rounded-full ml-2`
- Scrollable: `max-h-[280px] overflow-y-auto`
- Карточки email:
  - `bg-white rounded-lg border p-3 cursor-pointer transition-colors`
  - Hover: `hover:border-gray-300`
  - Selected: `border-brand bg-brand-light ring-2 ring-brand/20`
  - Content: имя (`font-medium`), email (`text-gray-500 text-xs`), товар (`text-gray-400 text-xs truncate`), дата
  - Dot для необработанных: `w-2 h-2 rounded-full bg-brand` (используем `!processed`)

#### Video Selection Block
- Header: "Выберите видео" `text-sm font-semibold`
- Grid 2 columns: `grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto`
- Thumbnail карточки: `aspect-video rounded-lg overflow-hidden cursor-pointer`
- Selected: `ring-2 ring-brand`
- Duration badge на thumbnail
- Название под thumbnail: `text-xs line-clamp-1 mt-1`

#### Settings Block
- Показывается только при выбранных email + video
- "Персональная заметка" — textarea, 3 rows
- "Текст кнопки" — input, default "Купить"
- Кнопка отправки: `bg-brand w-full py-3 text-lg font-bold rounded-xl`, текст "Отправить"
- Disabled если нет email или видео

### Right Column: Live Preview

#### Container
- `sticky top-8` — следует при скролле
- `hidden lg:block` — скрыт на мобильных
- Header: "Предварительный просмотр" `text-xs text-gray-400 uppercase tracking-wider mb-2`

#### Browser Frame
- `rounded-xl border border-gray-200 shadow-lg overflow-hidden bg-white`
- Title bar: `bg-gray-100 h-8 flex items-center px-3 gap-1.5` с тремя точками (red/yellow/green, каждая w-2.5 h-2.5 rounded-full)
- Content area: рендерит упрощённый email-preview:
  - Header с оранжевым фоном и "laptop.guru"
  - Greeting: "Witamy, {name}!" (в превью — на польском, как в реальном письме)
  - Thumbnail выбранного видео (если выбрано)
  - Кнопка CTA
- Scale: `text-xs` для всего контента внутри preview (вместо CSS transform — избегаем размытого текста)

#### Placeholder State
- Если ничего не выбрано: `bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center`
- Иконка (envelope/video) + "Выберите заявку и видео для предварительного просмотра" `text-gray-400`

### Loading States
- При загрузке emails/videos: skeleton placeholders (`bg-gray-100 animate-pulse rounded-lg h-16`) по 3 штуки
- Preview: мгновенный ре-рендер (нет асинхронности)

### Success State
- Inline block (заменяет form, не modal)
- `bg-green-50 border border-green-200 rounded-xl p-6 max-w-lg`
- Green checkmark icon (`text-green-500 w-8 h-8`)
- "Успешно отправлено!" `text-lg font-bold text-green-800`
- Landing URL + Short URL — `CopyableLink` компонент (существующий)
- "Отправить ещё" — `bg-brand text-white w-full py-2.5 rounded-lg mt-4`

### Error State
- `bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4` (существующий паттерн)

---

## Schema Changes

### Prisma Migration
```prisma
model Landing {
  // ... existing fields ...
  customerName String?  // NEW: денормализация имени клиента для лендинга
}
```

### API Change (`/src/app/api/send/route.ts`)
- При создании Landing добавить: `customerName: incomingEmail.customerName || null`

### Server Component (`/src/app/l/[slug]/page.tsx`)
- Передавать `customerName` в Props

---

## Files to Modify

### Редизайн (основной scope)
1. `prisma/schema.prisma` — добавить `customerName` в Landing
2. `/src/app/api/send/route.ts` — передавать customerName при создании Landing, subject на польском
3. `/src/app/l/[slug]/page.tsx` — передавать customerName в Props
4. `/src/app/l/[slug]/landing-client.tsx` — полный редизайн лендинга (польский) + next/font
5. `/src/lib/email-template.ts` — полный редизайн email HTML шаблона (польский)
6. `/src/app/(dashboard)/send/page.tsx` — редизайн с live-preview (русский)

### Перевод дашборда на русский
7. `/src/app/(dashboard)/emails/page.tsx` — UI тексты на русском
8. `/src/app/(dashboard)/videos/page.tsx` — UI тексты на русском
9. `/src/app/(dashboard)/sent/page.tsx` — UI тексты на русском
10. `/src/app/(dashboard)/links/page.tsx` — UI тексты на русском
11. `/src/app/(dashboard)/dashboard/page.tsx` — UI тексты на русском
12. `/src/components/dashboard/sidebar.tsx` — навигация на русском
13. `/src/components/dashboard/edit-email-modal.tsx` — модалка на русском

---

## Verification

1. `npx prisma migrate dev` — применить миграцию
2. Запустить dev server
3. Открыть /send — проверить:
   - Скелетоны при загрузке
   - Выбор email + видео
   - Live-preview обновляется
   - Отправка работает
   - Success state с ссылками
4. Открыть лендинг /l/[slug] — проверить:
   - Градиент hero с именем
   - Видео, benefits, CTA
   - Responsive: mobile / tablet / desktop
   - `prefers-reduced-motion` — пульсация отключается
5. Проверить HTML email в почтовом клиенте (Gmail, Outlook)
