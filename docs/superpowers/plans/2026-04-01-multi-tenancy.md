# Multi-Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert single-tenant CRM into multi-tenant SaaS with shared DB + companyId isolation, a SUPER_ADMIN role with company-switch capability, and a Prisma tenant middleware that auto-filters all queries.

**Architecture:** `Company` → owns all data. Every business model gets `companyId`. Prisma `$extends` intercepts all queries and injects `companyId` from `nestjs-cls` AsyncLocalStorage. `CompanyGuard` populates CLS from JWT on every request. SUPER_ADMIN can switch into any company via JWT swap with `tokenVersion` invalidation.

**Tech Stack:** NestJS, Prisma 7 + `$extends`, `nestjs-cls`, Next.js 15, NextAuth v5, PostgreSQL, bcryptjs

---

## File Map

### New files (API)
- `apps/api/src/common/guards/company.guard.ts` — populates CLS companyId from JWT
- `apps/api/src/common/guards/super-admin.guard.ts` — requires SUPER_ADMIN, clears CLS companyId
- `apps/api/src/modules/super-admin/super-admin.module.ts`
- `apps/api/src/modules/super-admin/companies/super-admin-companies.controller.ts`
- `apps/api/src/modules/super-admin/companies/super-admin-companies.service.ts`
- `apps/api/src/modules/super-admin/companies/dto/create-company.dto.ts`
- `apps/api/src/modules/super-admin/users/super-admin-users.controller.ts`
- `apps/api/src/modules/super-admin/users/super-admin-users.service.ts`
- `apps/api/src/modules/super-admin/dashboard/super-admin-dashboard.controller.ts`
- `apps/api/src/modules/super-admin/dashboard/super-admin-dashboard.service.ts`
- `prisma/seed.ts`

### Modified files (API)
- `prisma/schema.prisma` — Company model, Role enum, companyId on all models, AuditLog, tokenVersion
- `apps/api/src/prisma/prisma.service.ts` — tenant $extends, new getters
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` — tokenVersion check, new payload fields
- `apps/api/src/modules/auth/auth.service.ts` — include companyId in JWT
- `apps/api/src/modules/auth/dto/login.dto.ts` — no change
- `apps/api/src/app.module.ts` — ClsModule, SuperAdminModule, CompanyGuard global
- `apps/api/src/modules/admin/admin.service.ts` — scope user creation to company

### New files (Web)
- `apps/web/src/app/(super-admin)/layout.tsx`
- `apps/web/src/app/(super-admin)/super-admin/dashboard/page.tsx`
- `apps/web/src/app/(super-admin)/super-admin/companies/page.tsx`
- `apps/web/src/app/(super-admin)/super-admin/companies/[id]/page.tsx`
- `apps/web/src/app/(super-admin)/super-admin/users/page.tsx`
- `apps/web/src/components/dashboard/impersonation-banner.tsx`

### Modified files (Web)
- `apps/web/src/lib/auth.ts` — add companyId, tokenVersion to session
- `apps/web/src/lib/auth.config.ts` — add companyId to token/session callbacks, SUPER_ADMIN redirect
- `apps/web/src/app/(auth)/register/page.tsx` — redirect to /login
- `apps/web/src/app/(dashboard)/layout.tsx` — add ImpersonationBanner

---

## Task 1: Prisma Schema — Company model + Role enum + User

**Files:**
- Modify: `prisma/schema.prisma` (lines 15–49)

- [ ] **Step 1: Update Role enum and add SUPER_ADMIN**

Replace the Role enum at line 15:
```prisma
enum Role {
  SUPER_ADMIN
  ADMIN
  USER
}
```

- [ ] **Step 2: Add Company model** (insert after the Role enum, before `model User`):

```prisma
model Company {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
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
  sentEmails         SentEmail[]
  incomingEmails     IncomingEmail[]
  contacts           Contact[]
  channels           Channel[]
  conversations      Conversation[]
  messages           Message[]
  tags               Tag[]
  templates          Template[]
  msgQuickReplies    MsgQuickReply[]
  autoReplyRules     AutoReplyRule[]
  teams              Team[]
  businessHours      BusinessHoursSchedule[]
  notifications      Notification[]
  webhookEvents      WebhookEvent[]
  outboundJobs       OutboundJob[]
  analyticsMessages  AnalyticsMessageDaily[]
  analyticsConvos    AnalyticsConversationDaily[]
  analyticsResponse  AnalyticsResponseTime[]
  typingIndicators   TypingIndicator[]
  internalNotes      InternalNote[]
  auditLogs          AuditLog[]
}
```

- [ ] **Step 3: Update User model** — add `companyId` and `tokenVersion`:

Replace the User model:
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  role          Role      @default(USER)
  permissions   String[]  @default([])
  companyId     String?
  company       Company?  @relation(fields: [companyId], references: [id])
  tokenVersion  Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Legacy relations
  videos          Video[]
  landings        Landing[]
  sentEmails      SentEmail[]
  processedEmails IncomingEmail[]
  quickLinks      QuickLink[]

  // Messaging relations
  contactMerges              ContactMerge[]             @relation("ContactMerges")
  conversationAssignments    ConversationAssignment[]    @relation("ConversationAssignee")
  conversationAssigns        ConversationAssignment[]    @relation("ConversationAssigner")
  conversationTags           ConversationTag[]           @relation("TagAdder")
  msgSentMessages            Message[]                   @relation("MessageSender")
  internalNotes              InternalNote[]              @relation("NoteAuthor")
  notifications              Notification[]              @relation("UserNotifications")
  createdTemplates           Template[]                  @relation("TemplateCreator")
  createdQuickReplies        MsgQuickReply[]             @relation("QuickReplyCreator")
  createdAutoRules           AutoReplyRule[]             @relation("AutoReplyCreator")
  teamMemberships            TeamMember[]                @relation("TeamMembership")

  @@index([companyId])
}
```

- [ ] **Step 4: Commit**
```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add Company model, SUPER_ADMIN role, tokenVersion on User"
```

---

## Task 2: Prisma Schema — companyId on all tenant models + fix unique constraints

**Files:**
- Modify: `prisma/schema.prisma` (all tenant models)

- [ ] **Step 1: Add companyId to IncomingEmail** (after `channelId String?` line):
```prisma
  companyId     String?
  company       Company?  @relation(fields: [companyId], references: [id])
```
Add to indexes: `@@index([companyId])`

- [ ] **Step 2: Add companyId to Video** (after `userId String` line):
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add: `@@index([companyId])`

- [ ] **Step 3: Add companyId to Landing** — change `slug @unique` → part of compound unique:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Remove `slug String @unique`, replace with `slug String`.
Add at end of model:
```prisma
  @@unique([companyId, slug])
  @@index([companyId])
  @@index([companyId, createdAt])
```

- [ ] **Step 4: Add companyId to ShortLink** (keep code globally unique — nanoid ensures uniqueness):
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add: `@@index([companyId])`

- [ ] **Step 5: Add companyId to SentEmail**:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add: `@@index([companyId])`

- [ ] **Step 6: Add companyId to QuickLink** — change `slug @unique` → compound:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Remove `slug String @unique`, replace with `slug String`.
Add at end:
```prisma
  @@unique([companyId, slug])
  @@index([companyId])
```

- [ ] **Step 7: Add companyId to LandingVisit and QuickLinkVisit** (direct, not via JOIN):

In `LandingVisit` after `landingId String`:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add index: `@@index([companyId])`

In `QuickLinkVisit` after `quickLinkId String`:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add index: `@@index([companyId])`

- [ ] **Step 8: Add companyId to Contact**:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add:
```prisma
  @@index([companyId])
  @@index([companyId, createdAt])
```

- [ ] **Step 9: Fix ContactChannel unique — scope to companyId**:

The current `@@unique([channelType, identifier])` becomes:
```prisma
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
```
Replace `@@unique([channelType, identifier])` with `@@unique([companyId, channelType, identifier])`.
Add: `@@index([companyId])`

- [ ] **Step 10: Add companyId to Channel**:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add: `@@index([companyId])`

- [ ] **Step 11: Add companyId to Conversation**:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add:
```prisma
  @@index([companyId])
  @@index([companyId, status])
  @@index([companyId, createdAt])
```

- [ ] **Step 12: Add companyId to Message**:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add: `@@index([companyId])`, `@@index([companyId, conversationId, createdAt])`

- [ ] **Step 13: Add companyId to InternalNote**:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add: `@@index([companyId])`

- [ ] **Step 14: Fix Tag — scope name unique to company**:
```prisma
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
```
Remove `name String @unique`, replace with `name String`.
Add: `@@unique([companyId, name])`, `@@index([companyId])`

- [ ] **Step 15: Add companyId to Template**:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add: `@@index([companyId])`

- [ ] **Step 16: Fix MsgQuickReply — scope shortcut unique to company**:
```prisma
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
```
Remove `shortcut String @unique`, replace with `shortcut String`.
Add: `@@unique([companyId, shortcut])`, `@@index([companyId])`

- [ ] **Step 17: Add companyId to AutoReplyRule**:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add: `@@index([companyId])`

- [ ] **Step 18: Fix Team — scope name unique to company**:
```prisma
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
```
Remove `name String @unique`, replace with `name String`.
Add: `@@unique([companyId, name])`, `@@index([companyId])`

- [ ] **Step 19: Fix BusinessHoursSchedule — scope name unique to company**:
```prisma
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
```
Remove `name String @unique`, replace with `name String`.
Add: `@@unique([companyId, name])`, `@@index([companyId])`

- [ ] **Step 20: Add companyId to Notification**:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
```
Add: `@@index([companyId])`

- [ ] **Step 21: Add companyId to WebhookEvent, OutboundJob, AnalyticsMessageDaily, AnalyticsConversationDaily, AnalyticsResponseTime, TypingIndicator**:

For each: add field + index:
```prisma
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id])
  @@index([companyId])
```

- [ ] **Step 22: Commit**
```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add companyId to all tenant models, fix unique constraints"
```

---

## Task 3: Prisma Schema — AuditLog model + final validation

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add AuditLog model** (before the closing of the file):

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  companyId String?
  company   Company? @relation(fields: [companyId], references: [id])
  action    String   // CREATE, UPDATE, DELETE, SWITCH, EXIT, DEACTIVATE
  entity    String   // Company, User, Channel, etc.
  entityId  String?
  payload   Json?    // { before, after }
  createdAt DateTime @default(now())

  @@index([companyId, createdAt])
  @@index([userId, createdAt])
}
```

- [ ] **Step 2: Verify schema compiles**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK
npx prisma validate
```
Expected: `The schema at prisma/schema.prisma is valid`

Fix any validation errors before continuing.

- [ ] **Step 3: Commit**
```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add AuditLog model"
```

---

## Task 4: Run migration + generate + update PrismaService getters

**Files:**
- Modify: `apps/api/src/prisma/prisma.service.ts`

- [ ] **Step 1: Reset database and apply new schema**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK
npx prisma migrate reset --force
```
Expected: `Database reset successful` then migrates fresh.

If no existing data matters (clean start per spec), this is safe.

- [ ] **Step 2: Generate Prisma clients**
```bash
npx prisma generate
```
Expected: `Generated Prisma Client for web`, `Generated Prisma Client for api`

- [ ] **Step 3: Add new getters to PrismaService**

Open `apps/api/src/prisma/prisma.service.ts`. After the existing getters (after `get typingIndicator()`), add:

```typescript
  get company() {
    return this.client.company;
  }

  get auditLog() {
    return this.client.auditLog;
  }

  // Raw client access for super-admin (bypasses tenant extension)
  get rawClient(): InstanceType<typeof PrismaClient> {
    return this.rawClient_;
  }
```

Also rename the private field from `client` to two fields — we'll do this properly in Task 6 when we wire the tenant extension. For now just add the getters pointing to `this.client`.

- [ ] **Step 4: Verify TypeScript compiles**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run type-check 2>&1 | head -50
```
Expected: 0 errors (or only errors about missing `nestjs-cls` which we install in Task 5).

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/prisma/prisma.service.ts
git commit -m "feat(prisma): add company, auditLog getters after migration"
```

---

## Task 5: Install nestjs-cls + wire ClsModule

**Files:**
- Modify: `apps/api/package.json` (via npm install)
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Install nestjs-cls in the API app**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm install nestjs-cls
```
Expected: `added 1 package`

- [ ] **Step 2: Update AppModule** — add ClsModule before PrismaModule:

Open `apps/api/src/app.module.ts`. Add import at top:
```typescript
import { ClsModule } from 'nestjs-cls';
```

In the `imports` array, add as the **first** entry:
```typescript
ClsModule.forRoot({
  global: true,
  middleware: { mount: true },
}),
```

- [ ] **Step 3: Verify app starts**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run build 2>&1 | tail -20
```
Expected: build succeeds.

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/app.module.ts apps/api/package.json apps/api/package-lock.json
git commit -m "feat(api): install nestjs-cls and configure ClsModule globally"
```

---

## Task 6: PrismaService — tenant isolation via $extends

**Files:**
- Modify: `apps/api/src/prisma/prisma.service.ts`

- [ ] **Step 1: Rewrite PrismaService to use $extends**

Replace the full content of `apps/api/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ClsService } from 'nestjs-cls';

// Models excluded from automatic tenant filtering
const TENANT_EXCLUDED = [
  'User',
  'Company',
  'AuditLog',
];

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private rawClient_: PrismaClient;
  private client: PrismaClient;

  constructor(private readonly cls: ClsService) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    this.rawClient_ = new PrismaClient({ adapter });

    const getCompanyId = (): string | null =>
      this.cls.get<string | null>('companyId') ?? null;

    this.client = this.rawClient_.$extends({
      query: {
        $allModels: {
          async findMany({ args, query, model }) {
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return query(args);
            args.where = { ...args.where, companyId: cid };
            return query(args);
          },
          async findFirst({ args, query, model }) {
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return query(args);
            args.where = { ...args.where, companyId: cid };
            return query(args);
          },
          async findFirstOrThrow({ args, query, model }) {
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return query(args);
            args.where = { ...args.where, companyId: cid };
            return query(args);
          },
          // findUnique: can't add companyId to unique constraint WHERE,
          // so we fetch then validate ownership.
          async findUnique({ args, query, model }) {
            const result = await query(args);
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return result;
            if (result && 'companyId' in result) {
              if ((result as Record<string, unknown>).companyId !== cid) return null;
            }
            return result;
          },
          async create({ args, query, model }) {
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return query(args);
            (args.data as Record<string, unknown>).companyId ??= cid;
            return query(args);
          },
          async createMany({ args, query, model }) {
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return query(args);
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: Record<string, unknown>) => ({
                ...d,
                companyId: d.companyId ?? cid,
              }));
            }
            return query(args);
          },
          async update({ args, query, model }) {
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return query(args);
            args.where = { ...args.where, companyId: cid };
            return query(args);
          },
          async updateMany({ args, query, model }) {
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return query(args);
            args.where = { ...args.where, companyId: cid };
            return query(args);
          },
          async delete({ args, query, model }) {
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return query(args);
            args.where = { ...args.where, companyId: cid };
            return query(args);
          },
          async deleteMany({ args, query, model }) {
            const cid = getCompanyId();
            if (!cid || TENANT_EXCLUDED.includes(model)) return query(args);
            args.where = { ...args.where, companyId: cid };
            return query(args);
          },
        },
      },
    }) as unknown as PrismaClient;
  }

  async onModuleInit() {
    await this.rawClient_.$connect();
  }

  async onModuleDestroy() {
    await this.rawClient_.$disconnect();
  }

  // Bypass the tenant extension (for super-admin global queries)
  get raw(): PrismaClient {
    return this.rawClient_;
  }

  // All existing model getters
  get user() { return this.client.user; }
  get incomingEmail() { return this.client.incomingEmail; }
  get video() { return this.client.video; }
  get landing() { return this.client.landing; }
  get shortLink() { return this.client.shortLink; }
  get sentEmail() { return this.client.sentEmail; }
  get quickLink() { return this.client.quickLink; }
  get quickLinkVisit() { return this.client.quickLinkVisit; }
  get landingVisit() { return this.client.landingVisit; }
  get contact() { return this.client.contact; }
  get contactChannel() { return this.client.contactChannel; }
  get contactMerge() { return this.client.contactMerge; }
  get contactCustomField() { return this.client.contactCustomField; }
  get channel() { return this.client.channel; }
  get channelConfig() { return this.client.channelConfig; }
  get conversation() { return this.client.conversation; }
  get conversationTag() { return this.client.conversationTag; }
  get conversationAssignment() { return this.client.conversationAssignment; }
  get conversationSla() { return this.client.conversationSla; }
  get message() { return this.client.message; }
  get messageStatusEvent() { return this.client.messageStatusEvent; }
  get messageAttachment() { return this.client.messageAttachment; }
  get messageReaction() { return this.client.messageReaction; }
  get messageGeolocation() { return this.client.messageGeolocation; }
  get internalNote() { return this.client.internalNote; }
  get tag() { return this.client.tag; }
  get template() { return this.client.template; }
  get templateVariable() { return this.client.templateVariable; }
  get msgQuickReply() { return this.client.msgQuickReply; }
  get autoReplyRule() { return this.client.autoReplyRule; }
  get team() { return this.client.team; }
  get teamMember() { return this.client.teamMember; }
  get businessHoursSchedule() { return this.client.businessHoursSchedule; }
  get businessHoursSlot() { return this.client.businessHoursSlot; }
  get notification() { return this.client.notification; }
  get webhookEvent() { return this.client.webhookEvent; }
  get outboundJob() { return this.client.outboundJob; }
  get outboundJobLog() { return this.client.outboundJobLog; }
  get typingIndicator() { return this.client.typingIndicator; }
  get company() { return this.client.company; }
  get auditLog() { return this.client.auditLog; }

  async $queryRaw(query: TemplateStringsArray, ...values: unknown[]) {
    return this.rawClient_.$queryRaw(query, ...values);
  }

  async $transaction(fn: Parameters<typeof this.rawClient_.$transaction>[0]) {
    return this.rawClient_.$transaction(fn as never);
  }
}
```

- [ ] **Step 2: Update PrismaModule to inject ClsService**

Open `apps/api/src/prisma/prisma.module.ts`. Ensure `PrismaService` is in providers and exported. No changes needed if ClsModule is global (it is). Verify the file looks like:
```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Build to verify**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run build 2>&1 | tail -30
```
Expected: 0 errors.

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/prisma/prisma.service.ts apps/api/src/prisma/prisma.module.ts
git commit -m "feat(prisma): tenant isolation via $extends — auto-inject companyId from CLS"
```

---

## Task 7: Auth — JWT types + strategy + auth.service login

**Files:**
- Modify: `apps/api/src/common/decorators/current-user.decorator.ts`
- Modify: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Update JwtUser interface in current-user.decorator.ts**

Replace the full file:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  companyId: string | null;
  tokenVersion: number;
  impersonating?: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext): JwtUser | string | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;
    return data ? user[data] : user;
  },
);
```

- [ ] **Step 2: Update JwtStrategy — validate tokenVersion from DB**

Replace `apps/api/src/modules/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  companyId: string | null;
  tokenVersion: number;
  impersonating?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    // Validate tokenVersion to support JWT invalidation on switch/exit
    const user = await this.prisma.raw.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token invalidated');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role ?? 'USER',
      permissions: payload.permissions ?? [],
      companyId: payload.companyId ?? null,
      tokenVersion: payload.tokenVersion,
      impersonating: payload.impersonating ?? false,
    };
  }
}
```

Note: `prisma.raw.user` uses the raw client (bypasses tenant extension) since User is a global lookup.

- [ ] **Step 3: Update JwtStrategy's constructor in AuthModule** — inject PrismaService:

Open `apps/api/src/modules/auth/auth.module.ts`. If PrismaModule is not imported, add it:
```typescript
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
```

- [ ] **Step 4: Update AuthService.login to include companyId in JWT**

In `apps/api/src/modules/auth/auth.service.ts`, replace the `login` method:
```typescript
  async login(dto: LoginDto) {
    const user = await this.prisma.raw.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      companyId: user.companyId ?? null,
      tokenVersion: user.tokenVersion,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId ?? null,
      },
    };
  }
```

Note: use `this.prisma.raw.user` since User is excluded from tenant filter (no companyId in CLS context at login time anyway, but using raw is explicit and safe).

- [ ] **Step 5: Build and verify**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run build 2>&1 | tail -30
```

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/common/decorators/current-user.decorator.ts \
        apps/api/src/modules/auth/strategies/jwt.strategy.ts \
        apps/api/src/modules/auth/auth.service.ts \
        apps/api/src/modules/auth/auth.module.ts
git commit -m "feat(auth): add companyId + tokenVersion to JWT payload, validate tokenVersion on each request"
```

---

## Task 8: CompanyGuard — populate CLS from JWT

**Files:**
- Create: `apps/api/src/common/guards/company.guard.ts`

- [ ] **Step 1: Create CompanyGuard**

```typescript
// apps/api/src/common/guards/company.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { JwtUser } from '../decorators/current-user.decorator';

@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request.user;

    // No user = public route, no CLS setup needed
    if (!user) return true;

    const { role, companyId, impersonating } = user;

    if (role === 'SUPER_ADMIN' && !impersonating) {
      // SUPER_ADMIN in native mode — no company context
      this.cls.set('companyId', null);
      return true;
    }

    if (!companyId) {
      // Non-super-admin without companyId = invalid state
      throw new ForbiddenException('No company assigned to this user');
    }

    this.cls.set('companyId', companyId);
    return true;
  }
}
```

- [ ] **Step 2: Register CompanyGuard globally in AppModule**

In `apps/api/src/app.module.ts`, add import:
```typescript
import { APP_GUARD } from '@nestjs/core';
import { CompanyGuard } from './common/guards/company.guard';
```

In `providers`:
```typescript
providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
  { provide: APP_GUARD, useClass: CompanyGuard },
],
```

Note: `CompanyGuard` runs after JwtAuthGuard. It reads `request.user` which Passport sets. For public routes (no JwtAuthGuard), `user` is undefined and the guard returns true.

- [ ] **Step 3: Build and verify**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/common/guards/company.guard.ts apps/api/src/app.module.ts
git commit -m "feat(auth): CompanyGuard — populate CLS companyId from JWT on every request"
```

---

## Task 9: SuperAdminGuard + AppModule complete wiring

**Files:**
- Create: `apps/api/src/common/guards/super-admin.guard.ts`

- [ ] **Step 1: Create SuperAdminGuard**

```typescript
// apps/api/src/common/guards/super-admin.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { JwtUser } from '../decorators/current-user.decorator';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: JwtUser }>();

    if (user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super-admin access required');
    }

    // Super-admin endpoints always bypass tenant filter
    // regardless of impersonation state
    this.cls.set('companyId', null);
    return true;
  }
}
```

- [ ] **Step 2: Verify build**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**
```bash
git add apps/api/src/common/guards/super-admin.guard.ts
git commit -m "feat(auth): SuperAdminGuard — requires SUPER_ADMIN, clears tenant CLS context"
```

---

## Task 10: Super-Admin Module — Company CRUD

**Files:**
- Create: `apps/api/src/modules/super-admin/super-admin.module.ts`
- Create: `apps/api/src/modules/super-admin/companies/dto/create-company.dto.ts`
- Create: `apps/api/src/modules/super-admin/companies/super-admin-companies.service.ts`
- Create: `apps/api/src/modules/super-admin/companies/super-admin-companies.controller.ts`

- [ ] **Step 1: Create CreateCompanyDto**

```typescript
// apps/api/src/modules/super-admin/companies/dto/create-company.dto.ts
import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  // Admin user to create together with the company
  @IsString()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;

  @IsOptional()
  @IsString()
  adminName?: string;
}
```

- [ ] **Step 2: Create SuperAdminCompaniesService**

```typescript
// apps/api/src/modules/super-admin/companies/super-admin-companies.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class SuperAdminCompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async create(dto: CreateCompanyDto) {
    const existingSlug = await this.prisma.raw.company.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) throw new ConflictException('Company slug already taken');

    const existingEmail = await this.prisma.raw.user.findUnique({
      where: { email: dto.adminEmail.toLowerCase().trim() },
    });
    if (existingEmail) throw new ConflictException('Admin email already registered');

    const passwordHash = await hash(dto.adminPassword, 12);

    const company = await this.prisma.raw.company.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        logo: dto.logo,
        users: {
          create: {
            email: dto.adminEmail.toLowerCase().trim(),
            name: dto.adminName?.trim() ?? null,
            passwordHash,
            role: 'ADMIN',
          },
        },
      },
      include: { users: { select: { id: true, email: true, role: true } } },
    });

    await this.prisma.raw.auditLog.create({
      data: {
        userId: company.users[0].id,
        companyId: company.id,
        action: 'CREATE',
        entity: 'Company',
        entityId: company.id,
        payload: { name: company.name, slug: company.slug },
      },
    });

    return company;
  }

  async findAll() {
    return this.prisma.raw.company.findMany({
      include: {
        _count: { select: { users: true, landings: true, contacts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.raw.company.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, email: true, name: true, role: true, createdAt: true },
        },
        _count: {
          select: { landings: true, contacts: true, conversations: true, channels: true },
        },
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: string, data: { name?: string; description?: string; logo?: string }) {
    const company = await this.prisma.raw.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.raw.company.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string, adminUserId: string) {
    const company = await this.prisma.raw.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    const updated = await this.prisma.raw.company.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.raw.auditLog.create({
      data: {
        userId: adminUserId,
        companyId: id,
        action: 'DEACTIVATE',
        entity: 'Company',
        entityId: id,
      },
    });

    return updated;
  }

  async switchToCompany(companyId: string, superAdminId: string) {
    const company = await this.prisma.raw.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');
    if (!company.isActive) throw new BadRequestException('Company is inactive');

    const admin = await this.prisma.raw.user.findUnique({
      where: { id: superAdminId },
      select: { id: true, email: true, permissions: true, tokenVersion: true },
    });
    if (!admin) throw new NotFoundException('User not found');

    // Increment tokenVersion to invalidate old tokens
    const newVersion = admin.tokenVersion + 1;
    await this.prisma.raw.user.update({
      where: { id: superAdminId },
      data: { tokenVersion: newVersion },
    });

    await this.prisma.raw.auditLog.create({
      data: {
        userId: superAdminId,
        companyId,
        action: 'SWITCH',
        entity: 'Company',
        entityId: companyId,
      },
    });

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: 'SUPER_ADMIN',
      permissions: admin.permissions,
      companyId,
      tokenVersion: newVersion,
      impersonating: true,
    };

    return { accessToken: this.jwtService.sign(payload) };
  }

  async exitCompany(superAdminId: string) {
    const admin = await this.prisma.raw.user.findUnique({
      where: { id: superAdminId },
      select: { id: true, email: true, permissions: true, tokenVersion: true },
    });
    if (!admin) throw new NotFoundException('User not found');

    // Increment tokenVersion to invalidate the impersonation token
    const newVersion = admin.tokenVersion + 1;
    await this.prisma.raw.user.update({
      where: { id: superAdminId },
      data: { tokenVersion: newVersion },
    });

    await this.prisma.raw.auditLog.create({
      data: {
        userId: superAdminId,
        action: 'EXIT',
        entity: 'Company',
      },
    });

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: 'SUPER_ADMIN',
      permissions: admin.permissions,
      companyId: null,
      tokenVersion: newVersion,
      impersonating: false,
    };

    return { accessToken: this.jwtService.sign(payload) };
  }
}
```

- [ ] **Step 3: Create SuperAdminCompaniesController**

```typescript
// apps/api/src/modules/super-admin/companies/super-admin-companies.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../../common/decorators/current-user.decorator';
import { SuperAdminCompaniesService } from './super-admin-companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@ApiTags('Super Admin — Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('super-admin/companies')
export class SuperAdminCompaniesController {
  constructor(private readonly svc: SuperAdminCompaniesService) {}

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.svc.create(dto);
  }

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; logo?: string },
  ) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @HttpCode(200)
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.svc.deactivate(id, user.id);
  }

  @Post(':id/switch')
  @HttpCode(200)
  switchTo(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.svc.switchToCompany(id, user.id);
  }

  @Post('exit')
  @HttpCode(200)
  exit(@CurrentUser() user: JwtUser) {
    return this.svc.exitCompany(user.id);
  }
}
```

- [ ] **Step 4: Create SuperAdminModule**

```typescript
// apps/api/src/modules/super-admin/super-admin.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminCompaniesController } from './companies/super-admin-companies.controller';
import { SuperAdminCompaniesService } from './companies/super-admin-companies.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SuperAdminCompaniesController],
  providers: [SuperAdminCompaniesService],
})
export class SuperAdminModule {}
```

- [ ] **Step 5: Register SuperAdminModule in AppModule**

In `apps/api/src/app.module.ts`, add:
```typescript
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
// Add to imports array:
SuperAdminModule,
```

- [ ] **Step 6: Build and verify**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run build 2>&1 | tail -30
```

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/modules/super-admin/ apps/api/src/app.module.ts
git commit -m "feat(super-admin): Company CRUD + switch/exit with tokenVersion invalidation"
```

---

## Task 11: Super-Admin Module — Users + Dashboard

**Files:**
- Create: `apps/api/src/modules/super-admin/users/super-admin-users.service.ts`
- Create: `apps/api/src/modules/super-admin/users/super-admin-users.controller.ts`
- Create: `apps/api/src/modules/super-admin/users/dto/create-super-admin-user.dto.ts`
- Create: `apps/api/src/modules/super-admin/dashboard/super-admin-dashboard.service.ts`
- Create: `apps/api/src/modules/super-admin/dashboard/super-admin-dashboard.controller.ts`

- [ ] **Step 1: Create CreateSuperAdminUserDto**

```typescript
// apps/api/src/modules/super-admin/users/dto/create-super-admin-user.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength, IsIn } from 'class-validator';

export class CreateSuperAdminUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @IsIn(['SUPER_ADMIN', 'ADMIN', 'USER'])
  role: string;

  @IsOptional()
  @IsString()
  companyId?: string; // required for ADMIN/USER, null for SUPER_ADMIN
}
```

- [ ] **Step 2: Create SuperAdminUsersService**

```typescript
// apps/api/src/modules/super-admin/users/super-admin-users.service.ts
import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSuperAdminUserDto } from './dto/create-super-admin-user.dto';

@Injectable()
export class SuperAdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.raw.user.findMany({
      where: companyId ? { companyId } : {},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        company: { select: { name: true, slug: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateSuperAdminUserDto) {
    if (dto.role !== 'SUPER_ADMIN' && !dto.companyId) {
      throw new BadRequestException('companyId is required for ADMIN/USER roles');
    }

    if (dto.companyId) {
      const company = await this.prisma.raw.company.findUnique({
        where: { id: dto.companyId },
      });
      if (!company) throw new NotFoundException('Company not found');
    }

    const existing = await this.prisma.raw.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await hash(dto.password, 12);

    return this.prisma.raw.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name?.trim() ?? null,
        passwordHash,
        role: dto.role as 'SUPER_ADMIN' | 'ADMIN' | 'USER',
        companyId: dto.companyId ?? null,
      },
      select: { id: true, email: true, name: true, role: true, companyId: true, createdAt: true },
    });
  }
}
```

- [ ] **Step 3: Create SuperAdminUsersController**

```typescript
// apps/api/src/modules/super-admin/users/super-admin-users.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SuperAdminUsersService } from './super-admin-users.service';
import { CreateSuperAdminUserDto } from './dto/create-super-admin-user.dto';

@ApiTags('Super Admin — Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('super-admin/users')
export class SuperAdminUsersController {
  constructor(private readonly svc: SuperAdminUsersService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.svc.findAll(companyId);
  }

  @Post()
  create(@Body() dto: CreateSuperAdminUserDto) {
    return this.svc.create(dto);
  }
}
```

- [ ] **Step 4: Create SuperAdminDashboardService**

```typescript
// apps/api/src/modules/super-admin/dashboard/super-admin-dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SuperAdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalContacts,
      totalConversations,
      companies,
    ] = await Promise.all([
      this.prisma.raw.company.count(),
      this.prisma.raw.company.count({ where: { isActive: true } }),
      this.prisma.raw.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      this.prisma.raw.contact.count(),
      this.prisma.raw.conversation.count(),
      this.prisma.raw.company.findMany({
        include: {
          _count: {
            select: { users: true, contacts: true, conversations: true, landings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      totals: { totalCompanies, activeCompanies, totalUsers, totalContacts, totalConversations },
      companies,
    };
  }
}
```

- [ ] **Step 5: Create SuperAdminDashboardController**

```typescript
// apps/api/src/modules/super-admin/dashboard/super-admin-dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';

@ApiTags('Super Admin — Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('super-admin/dashboard')
export class SuperAdminDashboardController {
  constructor(private readonly svc: SuperAdminDashboardService) {}

  @Get()
  getStats() {
    return this.svc.getStats();
  }
}
```

- [ ] **Step 6: Update SuperAdminModule to include all controllers/services**

Replace `apps/api/src/modules/super-admin/super-admin.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminCompaniesController } from './companies/super-admin-companies.controller';
import { SuperAdminCompaniesService } from './companies/super-admin-companies.service';
import { SuperAdminUsersController } from './users/super-admin-users.controller';
import { SuperAdminUsersService } from './users/super-admin-users.service';
import { SuperAdminDashboardController } from './dashboard/super-admin-dashboard.controller';
import { SuperAdminDashboardService } from './dashboard/super-admin-dashboard.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    SuperAdminCompaniesController,
    SuperAdminUsersController,
    SuperAdminDashboardController,
  ],
  providers: [
    SuperAdminCompaniesService,
    SuperAdminUsersService,
    SuperAdminDashboardService,
  ],
})
export class SuperAdminModule {}
```

- [ ] **Step 7: Build and verify**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run build 2>&1 | tail -30
```

- [ ] **Step 8: Commit**
```bash
git add apps/api/src/modules/super-admin/
git commit -m "feat(super-admin): users management + global dashboard stats"
```

---

## Task 12: Update admin module for multi-tenancy

**Files:**
- Modify: `apps/api/src/modules/admin/admin.service.ts`

The existing admin module manages users WITHIN a company (ADMIN creates users for their company). After multi-tenancy, `createUser` must scope the new user to the current company.

- [ ] **Step 1: Update createUser to use companyId from CLS**

The CompanyGuard already sets `companyId` in CLS. The AdminService needs access to it. Inject `ClsService`:

In `apps/api/src/modules/admin/admin.service.ts`, add to imports:
```typescript
import { ClsService } from 'nestjs-cls';
```

Update constructor:
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly cls: ClsService,
) {}
```

Update `createUser` — after existing email check, add companyId assignment:
```typescript
    const companyId = this.cls.get<string | null>('companyId');
    if (!companyId) {
      throw new BadRequestException('No company context');
    }

    const passwordHash = await hash(dto.password, 12);
    return this.prisma.raw.user.create({   // raw: User is excluded from tenant filter
      data: {
        email: normalizedEmail,
        name: typeof dto.name === 'string' ? dto.name.trim().slice(0, 255) : null,
        passwordHash,
        companyId,      // <-- bind to current company
      },
      select: { id: true, email: true, name: true, role: true, permissions: true, createdAt: true },
    });
```

- [ ] **Step 2: Update findAllUsers to scope to current company**

Replace `findAllUsers`:
```typescript
  async findAllUsers() {
    const companyId = this.cls.get<string | null>('companyId');
    return this.prisma.raw.user.findMany({
      where: companyId ? { companyId } : {},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
```

- [ ] **Step 3: Update updateUser to verify target user belongs to same company**

After `const targetUser = await this.prisma.user.findUnique({ where: { id } });`, add:
```typescript
    const companyId = this.cls.get<string | null>('companyId');
    if (companyId && targetUser.companyId !== companyId) {
      throw new NotFoundException('User not found');
    }
```

- [ ] **Step 4: Update seedEmailChannel to scope channel to company**

In `seedEmailChannel`, change `this.prisma.channel.findFirst` to `this.prisma.raw.channel.findFirst({ where: { type: 'EMAIL', companyId } })`, and add `companyId` to the `create` data. Get companyId from CLS:
```typescript
    const companyId = this.cls.get<string | null>('companyId');
    if (!companyId) throw new BadRequestException('No company context');

    const existing = await this.prisma.raw.channel.findFirst({
      where: { type: 'EMAIL', companyId },
    });
    // ...
    const channel = await this.prisma.raw.channel.create({
      data: {
        name: env.SMTP_FROM || 'Email',
        type: 'EMAIL',
        isActive: true,
        companyId,
        config: { create: [...] },
      },
    });
```

- [ ] **Step 5: Update admin.module.ts** to add ClsService (it's global, but verify AdminModule doesn't need explicit import):

Since ClsModule is global, ClsService is injectable everywhere without explicit module imports. No module.ts change needed.

- [ ] **Step 6: Build and verify**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run build 2>&1 | tail -30
```

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/modules/admin/admin.service.ts
git commit -m "feat(admin): scope user creation and listing to current company"
```

---

## Task 13: Public endpoint bypass — landing tracker + redirect routes

Public routes (`/landings/:slug/click`, `/landings/:slug/track`, `/go/`, `/r/`) do not have a JWT. The Prisma middleware already handles this correctly (returns early when `companyId` is null in CLS). However, `LandingVisit.create` now requires `companyId`. We need to fetch `companyId` from the landing record when creating a visit.

**Files:**
- Modify: `apps/api/src/modules/landings/landings.service.ts`

- [ ] **Step 1: Update createVisit to include companyId from landing**

In `landings.service.ts`, the `createVisit` method fetches the landing:
```typescript
    const landing = await this.prisma.landing.findUnique({
      where: { slug },
      select: { id: true },
    });
```

Since there's no companyId in CLS for public routes, `findUnique` is bypassed by the middleware (returns result without tenant check when companyId is null). But `slug` is now `@@unique([companyId, slug])` — **not globally unique**.

**Problem**: For a public URL like `/l/some-slug`, we don't know which company it belongs to.

**Solution**: Use the namespace URL pattern from the spec: `/c/[company-slug]/l/[page-slug]`. The API needs to accept the company slug:

Change the public track endpoint to accept `companySlug` as a query param or use a different route structure. For the plan, the simplest API-level fix is:

Change `POST /landings/:slug/track` to accept `companySlug` in body:
```typescript
    // In createVisit, resolve companyId from companySlug
    const companySlug = body.companySlug as string | undefined;

    let landing;
    if (companySlug) {
      const company = await this.prisma.raw.company.findUnique({ where: { slug: companySlug } });
      if (!company) throw new NotFoundException('Not found');
      landing = await this.prisma.raw.landing.findFirst({
        where: { slug, companyId: company.id },
        select: { id: true, companyId: true },
      });
    } else {
      // Fallback: global slug lookup (for backwards compat during transition)
      landing = await this.prisma.raw.landing.findFirst({
        where: { slug },
        select: { id: true, companyId: true },
      });
    }
    if (!landing) throw new NotFoundException('Not found');
```

Update `landingVisit.create` to include `companyId: landing.companyId`.

Do the same for `trackClick`.

- [ ] **Step 2: Update getAnalytics** — use raw client + scope by authenticated user's companyId:

The analytics endpoint is authenticated. CompanyGuard sets CLS companyId. So `this.prisma.landing.findUnique({ where: { slug } })` → with tenant middleware, this fetches the landing and validates it belongs to the current company. But `slug` is no longer globally unique — change to `findFirst`:

```typescript
    const landing = await this.prisma.landing.findFirst({
      where: { slug },
      include: { ... },
    });
```

The middleware will auto-add `companyId` to this `findFirst`, making it tenant-safe.

- [ ] **Step 3: Build and verify**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/api
npm run build 2>&1 | tail -30
```

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/modules/landings/landings.service.ts
git commit -m "fix(landings): update public visit tracking to resolve companyId from slug+company"
```

---

## Task 14: Remove public registration

**Files:**
- Modify: `apps/web/src/app/(auth)/register/page.tsx`
- Modify: `apps/api/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Redirect register page to login**

Replace the full content of `apps/web/src/app/(auth)/register/page.tsx`:
```typescript
import { redirect } from 'next/navigation';

export default function RegisterPage() {
  redirect('/login');
}
```

- [ ] **Step 2: Guard the register endpoint in API (return 404)**

In `apps/api/src/modules/auth/auth.service.ts`, update `register`:
```typescript
  async register(_dto: RegisterDto) {
    throw new NotFoundException('Registration is disabled');
  }
```

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/app/(auth)/register/page.tsx \
        apps/api/src/modules/auth/auth.service.ts
git commit -m "feat(auth): disable public registration — only super-admin creates accounts"
```

---

## Task 15: Web — NextAuth session includes companyId + redirect logic

**Files:**
- Modify: `apps/web/src/lib/auth.ts`
- Modify: `apps/web/src/lib/auth.config.ts`

- [ ] **Step 1: Update auth.ts — return companyId from authorize**

In `apps/web/src/lib/auth.ts`, update the `authorize` return value:
```typescript
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          companyId: user.companyId ?? null,    // add this
          tokenVersion: user.tokenVersion,       // add this
        };
```

Also update the prisma query to select `companyId` and `tokenVersion`:
```typescript
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            permissions: true,
            companyId: true,
            tokenVersion: true,
          },
        });
```

- [ ] **Step 2: Update auth.config.ts — propagate companyId, add SUPER_ADMIN redirect**

In `apps/web/src/lib/auth.config.ts`, update callbacks:

```typescript
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as Record<string, unknown>).role as string ?? 'USER';
        token.permissions = (user as unknown as Record<string, unknown>).permissions as string[] ?? [];
        token.companyId = (user as unknown as Record<string, unknown>).companyId as string | null ?? null;
        token.tokenVersion = (user as unknown as Record<string, unknown>).tokenVersion as number ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        session.user.companyId = token.companyId as string | null;
      }
      return session;
    },
```

Add SUPER_ADMIN to `PROTECTED_PREFIXES`:
```typescript
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/emails",
  "/videos",
  "/send",
  "/sent",
  "/links",
  "/quicklinks",
  "/analytics",
  "/admin",
  "/super-admin",   // add this
];
```

Add SUPER_ADMIN redirect in `authorized` callback — after `if (!isLoggedIn) return false;`:
```typescript
      // Super-admin gets redirected to super-admin dashboard
      if (pathname === '/dashboard' || pathname === '/') {
        const role = (auth?.user as unknown as Record<string, unknown>)?.role as string;
        if (role === 'SUPER_ADMIN') {
          return Response.redirect(new URL('/super-admin/dashboard', request.nextUrl));
        }
      }

      // Block ADMIN/USER from super-admin routes
      if (pathname.startsWith('/super-admin')) {
        const role = (auth?.user as unknown as Record<string, unknown>)?.role as string;
        if (role !== 'SUPER_ADMIN') {
          return Response.redirect(new URL('/dashboard', request.nextUrl));
        }
      }
```

- [ ] **Step 3: Build web app**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/web
npm run build 2>&1 | tail -30
```

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/lib/auth.ts apps/web/src/lib/auth.config.ts
git commit -m "feat(web/auth): add companyId to session, redirect SUPER_ADMIN to super-admin dashboard"
```

---

## Task 16: Web — Impersonation banner + super-admin layout

**Files:**
- Create: `apps/web/src/components/dashboard/impersonation-banner.tsx`
- Create: `apps/web/src/app/(super-admin)/layout.tsx`
- Create: `apps/web/src/app/(super-admin)/super-admin/dashboard/page.tsx`
- Create: `apps/web/src/app/(super-admin)/super-admin/companies/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create ImpersonationBanner component**

```typescript
// apps/web/src/components/dashboard/impersonation-banner.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function ImpersonationBanner() {
  const { data: session } = useSession();
  const router = useRouter();

  const user = session?.user as unknown as Record<string, unknown> | undefined;
  const isImpersonating = user?.impersonating as boolean;

  if (!isImpersonating) return null;

  async function handleExit() {
    const res = await fetch("/api/super-admin/exit", { method: "POST" });
    if (res.ok) {
      const { accessToken } = await res.json();
      // Update session token — sign out and redirect to super-admin
      await signOut({ redirect: false });
      // Store new token and redirect
      router.push(`/super-admin/dashboard?token=${accessToken}`);
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium">
      <span>Просмотр компании: {user?.companyId as string}</span>
      <button
        onClick={handleExit}
        className="bg-black text-white px-3 py-1 rounded text-xs hover:bg-gray-800"
      >
        Выйти из просмотра
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add ImpersonationBanner to dashboard layout**

In `apps/web/src/app/(dashboard)/layout.tsx`, import and add the banner:
```typescript
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <ImpersonationBanner />
      <Sidebar />
      <AutoSync />
      <main className="md:pl-60">
        <MessagingDetector>{children}</MessagingDetector>
      </main>
      <MessagingToastNotifications />
    </div>
  );
}
```

- [ ] **Step 3: Create Super-Admin layout**

```typescript
// apps/web/src/app/(super-admin)/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as unknown as Record<string, unknown>)?.role;

  if (role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-900 text-white px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg">⚙ Super Admin</span>
        <a href="/super-admin/dashboard" className="text-gray-300 hover:text-white text-sm">Dashboard</a>
        <a href="/super-admin/companies" className="text-gray-300 hover:text-white text-sm">Companies</a>
        <a href="/super-admin/users" className="text-gray-300 hover:text-white text-sm">Users</a>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create Super-Admin Dashboard page (stub)**

```typescript
// apps/web/src/app/(super-admin)/super-admin/dashboard/page.tsx
import { auth } from "@/lib/auth";

async function getStats() {
  const session = await auth();
  // Use the API token from session or server-side fetch
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/super-admin/dashboard`, {
    headers: { Authorization: `Bearer ${(session as unknown as Record<string, unknown>)?.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function SuperAdminDashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Global Dashboard</h1>
      {stats ? (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold">{stats.totals.totalCompanies}</div>
            <div className="text-gray-500 text-sm">Companies</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold">{stats.totals.totalUsers}</div>
            <div className="text-gray-500 text-sm">Users</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold">{stats.totals.totalContacts}</div>
            <div className="text-gray-500 text-sm">Contacts</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold">{stats.totals.totalConversations}</div>
            <div className="text-gray-500 text-sm">Conversations</div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">Failed to load stats</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create Super-Admin Companies page (stub)**

```typescript
// apps/web/src/app/(super-admin)/super-admin/companies/page.tsx
import { auth } from "@/lib/auth";
import Link from "next/link";

async function getCompanies() {
  const session = await auth();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/super-admin/companies`, {
    headers: { Authorization: `Bearer ${(session as unknown as Record<string, unknown>)?.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function SuperAdminCompaniesPage() {
  const companies = await getCompanies();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Link
          href="/super-admin/companies/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Company
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((c: Record<string, unknown>) => (
              <tr key={c.id as string}>
                <td className="px-4 py-3 font-medium">{c.name as string}</td>
                <td className="px-4 py-3 text-gray-500">{c.slug as string}</td>
                <td className="px-4 py-3">{(c._count as Record<string, unknown>)?.users as number}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/super-admin/companies/${c.id}`} className="text-blue-600 hover:underline text-xs mr-2">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Build web app**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK/apps/web
npm run build 2>&1 | tail -30
```

- [ ] **Step 7: Commit**
```bash
git add apps/web/src/components/dashboard/impersonation-banner.tsx \
        apps/web/src/app/(super-admin)/ \
        apps/web/src/app/(dashboard)/layout.tsx
git commit -m "feat(web): super-admin layout, dashboard + companies pages, impersonation banner"
```

---

## Task 17: Seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Create seed.ts**

```typescript
// prisma/seed.ts
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 1. SUPER_ADMIN (Denys)
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'denys@shorterlink.app';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'changeme123';

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  let superAdmin;
  if (!existingSuperAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        name: 'Denys',
        passwordHash: await hash(superAdminPassword, 12),
        role: 'SUPER_ADMIN',
        companyId: null,
      },
    });
    console.log(`✅ SUPER_ADMIN created: ${superAdminEmail}`);
  } else {
    superAdmin = existingSuperAdmin;
    console.log(`⚡ SUPER_ADMIN already exists: ${superAdminEmail}`);
  }

  // 2. Demo company
  let company = await prisma.company.findUnique({ where: { slug: 'demo' } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Demo Company',
        slug: 'demo',
        description: 'Демонстрационная компания',
        isActive: true,
      },
    });
    console.log(`✅ Demo company created`);
  }

  // 3. Demo ADMIN user
  const adminEmail = 'admin@demo.local';
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Demo Admin',
        passwordHash: await hash('admin12345', 12),
        role: 'ADMIN',
        companyId: company.id,
      },
    });
    console.log(`✅ Demo ADMIN created: ${adminEmail}`);
  }

  // 4. Demo email channel
  let channel = await prisma.channel.findFirst({
    where: { companyId: company.id, type: 'EMAIL' },
  });
  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        name: 'Email',
        type: 'EMAIL',
        isActive: true,
        companyId: company.id,
        config: {
          create: [
            { key: 'imap_host', value: process.env.IMAP_HOST || 'imap.example.com' },
            { key: 'smtp_host', value: process.env.SMTP_HOST || 'smtp.example.com' },
          ],
        },
      },
    });
    console.log(`✅ Demo email channel created`);
  }

  // 5. Demo contacts
  const contactsData = [
    { displayName: 'Jan Kowalski', firstName: 'Jan', lastName: 'Kowalski', company: 'ACME sp. z o.o.' },
    { displayName: 'Anna Nowak', firstName: 'Anna', lastName: 'Nowak' },
    { displayName: 'Piotr Wiśniewski', firstName: 'Piotr', lastName: 'Wiśniewski', company: 'Beta Sp. z o.o.' },
  ];

  for (const cd of contactsData) {
    const existing = await prisma.contact.findFirst({
      where: { displayName: cd.displayName, companyId: company.id },
    });
    if (!existing) {
      await prisma.contact.create({
        data: { ...cd, companyId: company.id },
      });
    }
  }
  console.log(`✅ Demo contacts seeded`);

  // 6. Demo conversations
  const contacts = await prisma.contact.findMany({ where: { companyId: company.id } });

  for (let i = 0; i < Math.min(2, contacts.length); i++) {
    const existing = await prisma.conversation.findFirst({
      where: { contactId: contacts[i].id, companyId: company.id },
    });
    if (!existing) {
      const conv = await prisma.conversation.create({
        data: {
          contactId: contacts[i].id,
          channelId: channel.id,
          companyId: company.id,
          subject: `Demo conversation ${i + 1}`,
          status: 'OPEN',
        },
      });
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          channelId: channel.id,
          companyId: company.id,
          direction: 'INBOUND',
          contentType: 'TEXT',
          body: `Dzień dobry, mam pytanie dotyczące zamówienia nr ${1000 + i}.`,
          contactId: contacts[i].id,
        },
      });
    }
  }
  console.log(`✅ Demo conversations seeded`);

  console.log('\n🎉 Seed complete!');
  console.log(`SUPER_ADMIN: ${superAdminEmail} / ${superAdminPassword}`);
  console.log(`Demo ADMIN:  ${adminEmail} / admin12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add seed script to root package.json**

In root `package.json`, add to `scripts`:
```json
"db:seed": "dotenv -e .env -- tsx prisma/seed.ts"
```

Check if `tsx` is available:
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK
which tsx || npm install -g tsx
```

- [ ] **Step 3: Run seed**
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK
npm run db:seed
```
Expected output:
```
🌱 Seeding database...
✅ SUPER_ADMIN created: denys@shorterlink.app
✅ Demo company created
✅ Demo ADMIN created: admin@demo.local
✅ Demo email channel created
✅ Demo contacts seeded
✅ Demo conversations seeded
🎉 Seed complete!
```

- [ ] **Step 4: Commit**
```bash
git add prisma/seed.ts package.json
git commit -m "feat(seed): full seed with SUPER_ADMIN + demo company + contacts + conversations"
```

---

## Self-Review Checklist

After writing the plan, checking against the spec:

| Spec requirement | Task covering it |
|-----------------|-----------------|
| Company model + slug @unique | Task 1 |
| SUPER_ADMIN role | Task 1 |
| tokenVersion on User | Task 1 |
| companyId on ALL business models | Task 2 |
| LandingVisit/QuickLinkVisit direct companyId | Task 2 |
| @@unique([companyId, slug]) for Landing/QuickLink | Task 2 |
| @@index([companyId]) everywhere | Task 2 |
| AuditLog model | Task 3 |
| prisma migrate reset | Task 4 |
| nestjs-cls setup | Task 5 |
| Prisma $extends tenant middleware | Task 6 |
| findUnique → ownership check | Task 6 |
| JWT payload + companyId | Task 7 |
| tokenVersion validation in strategy | Task 7 |
| CompanyGuard → populate CLS | Task 8 |
| SuperAdminGuard → clear CLS | Task 9 |
| Company CRUD (create, list, get, update) | Task 10 |
| Company soft-delete (deactivate) | Task 10 |
| Switch to company + tokenVersion increment | Task 10 |
| Exit company + tokenVersion increment | Task 10 |
| AuditLog writes for switch/exit/deactivate | Task 10 |
| Super-admin users list + create | Task 11 |
| Super-admin dashboard stats | Task 11 |
| Admin module scoped to company | Task 12 |
| seedEmailChannel scoped to company | Task 12 |
| Public landing tracker resolves company | Task 13 |
| Remove public registration | Task 14 |
| NextAuth session includes companyId | Task 15 |
| SUPER_ADMIN redirects to /super-admin | Task 15 |
| Impersonation banner | Task 16 |
| Super-admin layout + pages | Task 16 |
| Seed: SUPER_ADMIN + demo company + data | Task 17 |
| ALS doesn't leak between requests (nestjs-cls handles) | Task 5 |
| SUPER_ADMIN in impersonation mode read-only | ⚠ Not implemented — deferred as future enhancement |

**One gap:** The spec mentions SUPER_ADMIN in impersonation mode should have read-only access by default. This is deferred — it requires intercepting all write endpoints with an `impersonating` check, which is a separate task. Add a TODO in CompanyGuard as a reminder.
