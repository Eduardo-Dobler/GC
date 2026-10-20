# GC Offline Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a presentation-ready GC web demo with a React/TypeScript client, a Node/Express TypeScript API, persistent local JSON data, seeded role-based scenarios, and a precompiled offline release.

**Architecture:** One npm-workspace repository contains a shared contracts package, an Express API, and a Vite React single-page application. The API is the only layer allowed to read or mutate the JSON database; the development client proxies `/api`, while the release server serves the compiled client and API from `localhost:3000`.

**Tech Stack:** Node.js 20+, TypeScript, React, Vite, Express, Zod, Vitest, Supertest, React Testing Library, esbuild, npm workspaces, JSON persistence.

**Spec:** `docs/superpowers/specs/2026-09-04-gc-demo-offline-design.md`

## Global Constraints

- Persist all application data in a local JSON file; do not add SQL, Firebase, Supabase, cloud storage, or third-party APIs.
- Do not load fonts, images, scripts, styles, or other assets from the internet.
- The release must run from `http://localhost:3000` with only Node.js installed.
- Keep all product and application source code in TypeScript; Windows and POSIX launchers are the only shell-script exceptions.
- Use Portuguese (Brazil) for all visible copy and API error messages.
- Preserve the five approved roles: Dono, Administrador, Moderador, Organizador de Eventos, and Membro.
- Protect the Dono from demotion, removal, and banning by every other role.
- Include a confirmed reset action that restores the exact seed and invalidates sessions.
- Keep the interface simple and professional: navy navigation, light content surfaces, system fonts, no excessive gradients or glow.
- Treat the project as a local presentation demo, not an internet-facing production service.

---

## File Map

```text
package.json                              Root scripts and workspace dependencies
tsconfig.base.json                        Shared TypeScript compiler rules
vitest.config.ts                          API/shared test configuration
.gitignore                                Generated and mutable-file exclusions
packages/shared/src/types.ts              Domain and API response contracts
packages/shared/src/permissions.ts        Permission constants and pure authorization rules
packages/shared/src/schemas.ts            Zod input schemas
packages/shared/src/index.ts              Public package exports
data/seed.json                            Immutable presentation seed
apps/api/src/config.ts                    Runtime paths and port selection
apps/api/src/db/json-store.ts             Serialized and recoverable JSON persistence
apps/api/src/auth/password.ts             Node scrypt hashing and comparison
apps/api/src/auth/session-store.ts        In-memory opaque sessions
apps/api/src/middleware/auth.ts            Authentication and permission guards
apps/api/src/middleware/errors.ts          Stable Portuguese API failures
apps/api/src/routes/*.ts                   Feature-specific HTTP routes
apps/api/src/app.ts                        Express application composition
apps/api/src/server.ts                     Startup, static serving, and browser opening
apps/web/src/api/client.ts                 Typed fetch wrapper and session token handling
apps/web/src/auth/AuthProvider.tsx         Login/session state
apps/web/src/components/*                  Reusable UI, dialog, toast, badges, avatars
apps/web/src/layout/*                      Responsive shell, sidebar, top bar
apps/web/src/pages/*                       Login and feature screens
apps/web/src/styles/*                      Tokens, reset, components, and responsive layout
scripts/build-release.ts                   Deterministic release builder
tests/api/*                                API and persistence integration tests
tests/web/*                                Component and permission-visibility tests
iniciar-demo.bat                           Windows offline launcher
iniciar-demo.sh                            Linux/macOS offline launcher
README.md                                  Setup, presentation, accounts, API, and limits
```

---

### Task 1: Workspace foundation and shared contracts

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/permissions.ts`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/index.ts`
- Create: `tests/fixtures/database-fixture.ts`
- Test: `tests/shared/permissions.test.ts`

**Interfaces:**
- Produces: `DemoDatabase`, `PublicUser`, `Role`, `Channel`, `Message`, `DirectThread`, `DirectMessage`, `CommunityEvent`, `EventParticipant`, `Invite`, `AuditLog`, `Permission`, `ApiSuccess<T>`, and `ApiFailure`.
- Produces: `hasPermission(database, userId, permission): boolean`, `canModerateMember(database, actorId, targetId): boolean`, and `canManageEvent(database, actorId, event): boolean`.
- Produces: Zod schemas named `demoDatabaseSchema`, `loginInput`, `registerInput`, `messageInput`, `eventInput`, `attendanceInput`, `roleInput`, `memberRoleInput`, `moderationInput`, `inviteInput`, and `resetInput`.

- [ ] **Step 1: Create the workspace manifests and TypeScript configuration**

Use npm workspaces `apps/*` and `packages/*`. Root scripts must include `dev`, `test`, `test:watch`, `typecheck`, `build`, `build:release`, and `start:release`. Set `engines.node` to `>=20` and `type` to `module`.

```json
{
  "name": "gc-demo-offline",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "concurrently -n API,WEB -c blue,green \"npm:dev -w @gc/api\" \"npm:dev -w @gc/web\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "build": "npm run build -w @gc/web && npm run build:release",
    "build:release": "tsx scripts/build-release.ts",
    "start:release": "node release/server.cjs"
  }
}
```

Use these dependency versions so the source build is reproducible:

```text
Runtime: express@5.1.0, zod@3.25.76, react@19.1.1,
react-dom@19.1.1, react-router-dom@6.30.1, lucide-react@0.468.0

Development: @vitejs/plugin-react@4.3.4, vite@6.1.0,
typescript@5.7.3, tsx@4.19.2, esbuild@0.25.0, vitest@3.0.5,
supertest@7.0.0, jsdom@26.0.0, concurrently@9.1.2,
@testing-library/react@16.1.0, @testing-library/user-event@14.6.1,
@testing-library/jest-dom@6.6.3, @types/express@5.0.0,
@types/node@22.13.1, @types/react@19.0.8,
@types/react-dom@19.0.3, @types/supertest@6.0.2
```

- [ ] **Step 2: Write failing permission tests**

```ts
import { describe, expect, it } from 'vitest';
import { canManageEvent, canModerateMember, hasPermission } from '@gc/shared';
import { databaseFixture } from '../fixtures/database-fixture';

describe('regras de permissão', () => {
  it('permite que o moderador modere apenas membros comuns', () => {
    const db = databaseFixture();
    expect(canModerateMember(db, 'user-moderator', 'user-member')).toBe(true);
    expect(canModerateMember(db, 'user-moderator', 'user-organizer')).toBe(false);
    expect(canModerateMember(db, 'user-admin', 'user-owner')).toBe(false);
  });

  it('permite ao organizador alterar apenas o próprio evento', () => {
    const db = databaseFixture();
    const own = db.events.find((event) => event.id === 'event-organizer')!;
    const other = db.events.find((event) => event.id === 'event-admin')!;
    expect(canManageEvent(db, 'user-organizer', own)).toBe(true);
    expect(canManageEvent(db, 'user-organizer', other)).toBe(false);
  });

  it('reconhece uma permissão atribuída ao cargo', () => {
    expect(hasPermission(databaseFixture(), 'user-admin', 'MANAGE_ROLES')).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests and confirm the missing-module failure**

Run: `npm test -- tests/shared/permissions.test.ts`

Expected: FAIL because `@gc/shared` and `databaseFixture` do not exist.

- [ ] **Step 4: Implement domain contracts and pure permission rules**

Define `Permission` as this exact union:

```ts
export type Permission =
  | 'VIEW_PRIVATE_CHANNELS'
  | 'POST_ANNOUNCEMENTS'
  | 'MODERATE_MESSAGES'
  | 'CREATE_EVENTS'
  | 'MANAGE_EVENTS'
  | 'MANAGE_MEMBERS'
  | 'MODERATE_MEMBERS'
  | 'MANAGE_ROLES'
  | 'CREATE_INVITES';
```

Use role IDs `role-owner`, `role-admin`, `role-moderator`, `role-organizer`, and `role-member`. `canModerateMember` returns false for the owner; a moderator may target only `role-member`; an administrator may target every non-owner; and the owner may target every non-owner. `canManageEvent` returns true for `MANAGE_EVENTS` or when a user with `CREATE_EVENTS` owns the event.

Create `tests/fixtures/database-fixture.ts` with all five roles and users plus `event-organizer` and `event-admin`, using the same IDs defined above.

- [ ] **Step 5: Implement exact input validation schemas**

Use trimmed strings, lowercase email normalization, message lengths from 1 to 500 characters, event titles from 3 to 80 characters, event descriptions from 3 to 500 characters, invite use limits from 1 to 100, and `resetInput` equal to `{ confirmation: z.literal('RESTAURAR') }`.

- [ ] **Step 6: Run shared tests and type checking**

Run: `npm test -- tests/shared/permissions.test.ts && npm run typecheck -w @gc/shared`

Expected: PASS.

- [ ] **Step 7: Commit the foundation**

```bash
git add package.json tsconfig.base.json vitest.config.ts .gitignore packages tests/shared tests/fixtures
git commit -m "feat: add GC workspace and shared contracts"
```

---

### Task 2: Seed and serialized JSON repository

**Files:**
- Create: `data/seed.json`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/config.ts`
- Create: `apps/api/src/db/json-store.ts`
- Create: `apps/api/src/auth/password.ts`
- Test: `tests/api/json-store.test.ts`
- Test: `tests/api/password.test.ts`

**Interfaces:**
- Consumes: `DemoDatabase` from `@gc/shared`.
- Produces: `JsonStore.create({ seedPath, dataPath }): Promise<JsonStore>`, `store.snapshot(): DemoDatabase`, `store.mutate(mutator): Promise<DemoDatabase>`, and `store.reset(): Promise<DemoDatabase>`.
- Produces: `hashPassword(password): { passwordSalt: string; passwordHash: string }` and `verifyPassword(password, salt, hash): boolean`.

- [ ] **Step 1: Write failing repository and password tests**

```ts
it('persiste uma mutação e recarrega o mesmo estado', async () => {
  const paths = await copySeedToTemporaryDirectory();
  const first = await JsonStore.create(paths);
  await first.mutate((db) => {
    db.community.description = 'Descrição alterada';
  });
  const second = await JsonStore.create(paths);
  expect(second.snapshot().community.description).toBe('Descrição alterada');
});

it('restaura uma cópia exata do seed', async () => {
  const paths = await copySeedToTemporaryDirectory();
  const store = await JsonStore.create(paths);
  const original = store.snapshot();
  await store.mutate((db) => db.messages.splice(0));
  expect(await store.reset()).toEqual(original);
});

it('recusa JSON inválido sem sobrescrever o arquivo defeituoso', async () => {
  const paths = await copySeedToTemporaryDirectory();
  await writeFile(paths.dataPath, '{invalido', 'utf8');
  await expect(JsonStore.create(paths)).rejects.toThrow('O arquivo de dados está inválido');
  expect(await readFile(paths.dataPath, 'utf8')).toBe('{invalido');
});

it('valida a senha sem gravá-la em texto puro', () => {
  const credential = hashPassword('demo123');
  expect(credential.passwordHash).not.toContain('demo123');
  expect(verifyPassword('demo123', credential.passwordSalt, credential.passwordHash)).toBe(true);
  expect(verifyPassword('incorreta', credential.passwordSalt, credential.passwordHash)).toBe(false);
});
```

- [ ] **Step 2: Run the repository tests and confirm failure**

Run: `npm test -- tests/api/json-store.test.ts tests/api/password.test.ts`

Expected: FAIL because the repository and password modules do not exist.

- [ ] **Step 3: Implement scrypt credentials**

Use Node `randomBytes(16)`, `scryptSync(password, salt, 64)`, hexadecimal encoding, equal-length buffers, and `timingSafeEqual`. Return false before comparison when hash lengths differ.

- [ ] **Step 4: Create the complete immutable seed**

Create schema version `1`, community `Comunidade SENAC Tech`, five system roles, the five approved quick-access users, five channels, at least twelve channel messages, two direct threads with six direct messages, four future-dated presentation events, attendance records for each event, two active invites, and audit entries. Use fixed IDs for stable tests. Store only `passwordSalt` and `passwordHash` for `demo123` in each user.

The exact initial channels are:

```json
[
  { "id": "channel-announcements", "name": "avisos", "type": "announcement", "order": 1 },
  { "id": "channel-general", "name": "chat-geral", "type": "text", "order": 2 },
  { "id": "channel-questions", "name": "duvidas", "type": "text", "order": 3 },
  { "id": "channel-events", "name": "eventos", "type": "text", "order": 4 },
  { "id": "channel-team", "name": "equipe", "type": "private", "order": 5 }
]
```

Give `channel-team` the four staff role IDs in `allowedRoleIds`; all other channels use an empty array to mean every active member.

Generate the five credential pairs with the implemented helper and copy only the resulting salt and hash strings into `data/seed.json`:

```bash
npx tsx -e "import { hashPassword } from './apps/api/src/auth/password.ts'; console.log(JSON.stringify(Array.from({ length: 5 }, () => hashPassword('demo123')), null, 2))"
```

- [ ] **Step 5: Implement serialized persistence**

`JsonStore.create` validates the seed and active file with the shared `demoDatabaseSchema`. If the active file is missing, copy the seed. `snapshot` returns `structuredClone(this.state)`. `mutate` chains operations on a private promise, clones the state, applies the mutator, validates it, writes `gc-demo.json.tmp`, renames it to `gc-demo.json`, then publishes the new state. `reset` copies and validates the seed through the same queue.

- [ ] **Step 6: Run repository tests**

Run: `npm test -- tests/api/json-store.test.ts tests/api/password.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit JSON persistence**

```bash
git add data apps/api tests/api/json-store.test.ts tests/api/password.test.ts
git commit -m "feat: add seeded JSON persistence"
```

---

### Task 3: Express composition, sessions, and authentication

**Files:**
- Create: `apps/api/src/auth/session-store.ts`
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/middleware/errors.ts`
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Test: `tests/api/auth.test.ts`
- Create: `tests/api/test-app.ts`

**Interfaces:**
- Consumes: `JsonStore`, password helpers, `loginInput`, and `registerInput`.
- Produces: `SessionStore.create(userId): string`, `get(token): Session | undefined`, `delete(token): void`, and `clear(): void`.
- Produces: `createApp({ store, sessions, staticDir? }): Express`.
- Produces: authenticated request property `request.userId: string`.
- Produces: test helpers `createTestApp()`, `loginAs(app, email)`, and `validEventInput()` from `tests/api/test-app.ts`.

- [ ] **Step 1: Write failing authentication integration tests**

```ts
it('entra, consulta a sessão e sai', async () => {
  const context = await createTestApp();
  const login = await request(context.app)
    .post('/api/auth/login')
    .send({ email: 'carlos@gc.local', password: 'demo123' })
    .expect(200);
  const token = login.body.data.token;
  expect(login.body.data.user.role.id).toBe('role-owner');
  await request(context.app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
  await request(context.app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);
  await request(context.app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
});

it('cadastra sempre como membro e rejeita e-mail repetido', async () => {
  const context = await createTestApp();
  const body = { name: 'Novo Membro', email: 'novo@gc.local', password: 'senha123' };
  const created = await request(context.app).post('/api/auth/register').send(body).expect(201);
  expect(created.body.data.user.role.id).toBe('role-member');
  await request(context.app).post('/api/auth/register').send(body).expect(409);
});
```

- [ ] **Step 2: Run auth tests and confirm route failures**

Run: `npm test -- tests/api/auth.test.ts`

Expected: FAIL because `createApp` and authentication routes do not exist.

- [ ] **Step 3: Implement opaque sessions and middleware**

Session records contain `token`, `userId`, and `expiresAt`; tokens expire after eight hours. Parse exactly `Authorization: Bearer <token>`. Return `401` with code `AUTH_REQUIRED` for missing or expired sessions, `403` with code `FORBIDDEN` for insufficient permission, and never return password fields from the API.

- [ ] **Step 4: Implement auth routes and error envelopes**

Implement `/login`, `/register`, `/logout`, and `/me`. Normalize emails before lookup. Use the shared Zod schemas and return validation failures as:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revise os dados informados.",
    "fields": { "email": "Informe um e-mail válido." }
  }
}
```

- [ ] **Step 5: Compose Express and health route**

Enable JSON bodies up to `100kb`, disable `x-powered-by`, mount `/api/health` and `/api/auth`, add a not-found handler for API paths, and finish with the error middleware. The health response is `{ data: { status: 'ok', mode: 'offline', schemaVersion: 1 } }`.

- [ ] **Step 6: Run authentication tests and type checking**

Run: `npm test -- tests/api/auth.test.ts && npm run typecheck -w @gc/api`

Expected: PASS.

- [ ] **Step 7: Commit authentication**

```bash
git add apps/api/src tests/api/auth.test.ts tests/api/test-app.ts
git commit -m "feat: add local authentication and sessions"
```

---

### Task 4: Channels, channel messages, and direct messages API

**Files:**
- Create: `apps/api/src/routes/channels.ts`
- Create: `apps/api/src/routes/direct-messages.ts`
- Create: `apps/api/src/services/channel-access.ts`
- Modify: `apps/api/src/app.ts`
- Test: `tests/api/communication.test.ts`

**Interfaces:**
- Consumes: authenticated `request.userId`, `JsonStore`, `messageInput`, `hasPermission`.
- Produces: channel and message routes listed in the spec.
- Produces: direct-thread and direct-message routes listed in the spec.
- Produces: `canViewChannel(db, userId, channel): boolean` and `canPostChannel(db, userId, channel): boolean`.

- [ ] **Step 1: Write failing communication tests**

```ts
it('oculta equipe do membro e permite acesso ao organizador', async () => {
  const context = await createTestApp();
  const member = await loginAs(context.app, 'pedro@gc.local');
  const organizer = await loginAs(context.app, 'sofia@gc.local');
  const memberChannels = await request(context.app).get('/api/channels').auth(member, { type: 'bearer' });
  expect(memberChannels.body.data.some((item: { id: string }) => item.id === 'channel-team')).toBe(false);
  await request(context.app).get('/api/channels/channel-team/messages').auth(member, { type: 'bearer' }).expect(403);
  await request(context.app).get('/api/channels/channel-team/messages').auth(organizer, { type: 'bearer' }).expect(200);
});

it('salva mensagem e aplica as regras de exclusão', async () => {
  const context = await createTestApp();
  const member = await loginAs(context.app, 'pedro@gc.local');
  const moderator = await loginAs(context.app, 'lucas@gc.local');
  const sent = await request(context.app).post('/api/channels/channel-general/messages')
    .auth(member, { type: 'bearer' }).send({ content: 'Mensagem persistida' }).expect(201);
  await request(context.app).delete(`/api/messages/${sent.body.data.id}`)
    .auth(moderator, { type: 'bearer' }).expect(204);
});

it('impede acesso a uma conversa direta alheia', async () => {
  const context = await createTestApp();
  const outsider = await loginAs(context.app, 'sofia@gc.local');
  await request(context.app).get('/api/direct-threads/thread-owner-admin/messages')
    .auth(outsider, { type: 'bearer' }).expect(403);
});
```

- [ ] **Step 2: Run the communication tests and confirm 404 failures**

Run: `npm test -- tests/api/communication.test.ts`

Expected: FAIL because the feature routes are not mounted.

- [ ] **Step 3: Implement channel access and channel message routes**

Public channels are visible to every non-banned user. Private channels require the user role in `allowedRoleIds`. Announcement posting requires `POST_ANNOUNCEMENTS`. Deletion is allowed for the author or `MODERATE_MESSAGES`; soft-delete by setting `deletedAt` and replacing content with `Mensagem removida`.

- [ ] **Step 4: Implement direct-message routes**

Return only threads containing the authenticated user. Include the other participant's public profile and latest message. Reject a thread read or write when `participantIds` does not contain the authenticated user. Sort messages ascending by `createdAt`.

- [ ] **Step 5: Run communication tests**

Run: `npm test -- tests/api/communication.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit communication API**

```bash
git add apps/api/src/routes apps/api/src/services apps/api/src/app.ts tests/api/communication.test.ts
git commit -m "feat: add channel and direct messaging API"
```

---

### Task 5: Events API

**Files:**
- Create: `apps/api/src/routes/events.ts`
- Modify: `apps/api/src/app.ts`
- Test: `tests/api/events.test.ts`

**Interfaces:**
- Consumes: `eventInput`, `attendanceInput`, `canManageEvent`, `CREATE_EVENTS`, and `JsonStore`.
- Produces: `GET/POST /api/events`, `PATCH/DELETE /api/events/:eventId`, and `PUT /api/events/:eventId/attendance`.

- [ ] **Step 1: Write failing event authorization tests**

```ts
it('permite que o organizador crie e edite o próprio evento', async () => {
  const context = await createTestApp();
  const token = await loginAs(context.app, 'sofia@gc.local');
  const created = await request(context.app).post('/api/events').auth(token, { type: 'bearer' }).send({
    title: 'Workshop de protótipos',
    description: 'Apresentação dos protótipos desenvolvidos pela comunidade.',
    startsAt: '2026-10-20T18:30:00.000Z',
    endsAt: '2026-10-20T20:00:00.000Z',
    category: 'Workshop',
    color: '#6D5DFB',
    recurring: false,
    invitedUserIds: ['user-member']
  }).expect(201);
  await request(context.app).patch(`/api/events/${created.body.data.id}`)
    .auth(token, { type: 'bearer' }).send({ title: 'Workshop de protótipos finais' }).expect(200);
});

it('bloqueia membro ao criar evento e organizador ao editar evento alheio', async () => {
  const context = await createTestApp();
  const member = await loginAs(context.app, 'pedro@gc.local');
  const organizer = await loginAs(context.app, 'sofia@gc.local');
  await request(context.app).post('/api/events').auth(member, { type: 'bearer' }).send(validEventInput()).expect(403);
  await request(context.app).patch('/api/events/event-admin').auth(organizer, { type: 'bearer' })
    .send({ title: 'Alteração indevida' }).expect(403);
});
```

- [ ] **Step 2: Run event tests and confirm failure**

Run: `npm test -- tests/api/events.test.ts`

Expected: FAIL because `/api/events` is missing.

- [ ] **Step 3: Implement event listing, filtering, and mutations**

Support query parameters `period=upcoming|past|all` and `category=<value>`. Join creator and attendance summary into each response. Require `endsAt > startsAt`. Owner and admin may edit/delete any event; organizer may edit/delete only events whose `createdBy` matches the session user.

- [ ] **Step 4: Implement idempotent attendance**

Upsert one `EventParticipant` per event/user pair with status `going` or `not_going`. Return the updated attendance counts and the authenticated user's response.

- [ ] **Step 5: Run event tests**

Run: `npm test -- tests/api/events.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit events API**

```bash
git add apps/api/src/routes/events.ts apps/api/src/app.ts tests/api/events.test.ts
git commit -m "feat: add role-aware events API"
```

---

### Task 6: Dashboard, members, roles, invites, and reset API

**Files:**
- Create: `apps/api/src/routes/dashboard.ts`
- Create: `apps/api/src/routes/members.ts`
- Create: `apps/api/src/routes/roles.ts`
- Create: `apps/api/src/routes/invites.ts`
- Create: `apps/api/src/routes/demo.ts`
- Modify: `apps/api/src/app.ts`
- Test: `tests/api/administration.test.ts`

**Interfaces:**
- Consumes: remaining shared input schemas, authorization rules, `JsonStore`, and `SessionStore`.
- Produces: dashboard, member, role, invite, and reset routes listed in the spec.
- Produces: each member response includes `capabilities: { canChangeRole: boolean; canModerate: boolean }` calculated for the authenticated actor.

- [ ] **Step 1: Write failing administration tests**

```ts
it('protege o dono de alteração e permite ao administrador alterar um membro', async () => {
  const context = await createTestApp();
  const admin = await loginAs(context.app, 'marina@gc.local');
  await request(context.app).patch('/api/members/user-owner/role').auth(admin, { type: 'bearer' })
    .send({ roleId: 'role-member' }).expect(409);
  await request(context.app).patch('/api/members/user-member/role').auth(admin, { type: 'bearer' })
    .send({ roleId: 'role-organizer' }).expect(200);
});

it('limita a moderação do moderador a membros comuns', async () => {
  const context = await createTestApp();
  const moderator = await loginAs(context.app, 'lucas@gc.local');
  await request(context.app).post('/api/members/user-member/moderation').auth(moderator, { type: 'bearer' })
    .send({ action: 'ban', reason: 'Teste da demonstração' }).expect(200);
  await request(context.app).post('/api/members/user-organizer/moderation').auth(moderator, { type: 'bearer' })
    .send({ action: 'ban', reason: 'Não permitido' }).expect(403);
});

it('restaura o seed e invalida a sessão atual', async () => {
  const context = await createTestApp();
  const owner = await loginAs(context.app, 'carlos@gc.local');
  await request(context.app).post('/api/invites').auth(owner, { type: 'bearer' })
    .send({ maxUses: 3, expiresInDays: 7 }).expect(201);
  await request(context.app).post('/api/demo/reset').auth(owner, { type: 'bearer' })
    .send({ confirmation: 'RESTAURAR' }).expect(200);
  await request(context.app).get('/api/auth/me').auth(owner, { type: 'bearer' }).expect(401);
});

it('impede editar o cargo de dono e revogar convite sem permissão', async () => {
  const context = await createTestApp();
  const admin = await loginAs(context.app, 'marina@gc.local');
  const member = await loginAs(context.app, 'pedro@gc.local');
  await request(context.app).patch('/api/roles/role-owner').auth(admin, { type: 'bearer' })
    .send({ name: 'Outro nome', color: '#111827', permissions: [] }).expect(409);
  await request(context.app).delete('/api/invites/invite-week').auth(member, { type: 'bearer' }).expect(403);
});
```

- [ ] **Step 2: Run administration tests and confirm route failures**

Run: `npm test -- tests/api/administration.test.ts`

Expected: FAIL because the routes are not implemented.

- [ ] **Step 3: Implement dashboard and member routes**

Dashboard returns the community, three latest announcement messages, three nearest upcoming events, visible channel shortcuts, and public profiles of users with `status === 'online'`. Member list and detail never expose credentials and calculate `canChangeRole` and `canModerate` for each target. Role changes require `MANAGE_MEMBERS`. Moderation calls `canModerateMember` and records an `auditLog`.

- [ ] **Step 4: Implement role and invite routes**

Only `MANAGE_ROLES` may create or edit roles. System role names and the owner role permissions are immutable; custom roles receive UUIDs and rank `20`. Invitation codes use six uppercase alphanumeric characters, avoid ambiguous `0/O/1/I`, and must be unique. The link format is `http://localhost:3000/convite/<CODE>`.

- [ ] **Step 5: Implement confirmed reset**

Require an authenticated user and `confirmation === 'RESTAURAR'`. Call `store.reset()`, then `sessions.clear()`, and return `{ data: { restored: true } }`.

- [ ] **Step 6: Run all API tests**

Run: `npm test -- tests/api`

Expected: PASS.

- [ ] **Step 7: Commit the remaining API**

```bash
git add apps/api/src/routes apps/api/src/app.ts tests/api/administration.test.ts
git commit -m "feat: complete GC administration API"
```

---

### Task 7: React foundation, authentication, and responsive application shell

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/auth/AuthProvider.tsx`
- Create: `apps/web/src/components/Avatar.tsx`
- Create: `apps/web/src/components/Badge.tsx`
- Create: `apps/web/src/components/Button.tsx`
- Create: `apps/web/src/components/Modal.tsx`
- Create: `apps/web/src/components/ToastProvider.tsx`
- Create: `apps/web/src/components/PermissionGate.tsx`
- Create: `apps/web/src/layout/AppShell.tsx`
- Create: `apps/web/src/layout/Sidebar.tsx`
- Create: `apps/web/src/layout/Topbar.tsx`
- Create: `apps/web/src/pages/LoginPage.tsx`
- Create: `apps/web/src/styles/global.css`
- Create: `tests/web/fetch-mock.ts`
- Create: `tests/web/fixtures.ts`
- Create: `tests/web/test-utils.tsx`
- Test: `tests/web/login.test.tsx`
- Test: `tests/web/permission-gate.test.tsx`
- Create: `tests/web/setup.ts`

**Interfaces:**
- Consumes: API envelopes and permission types from `@gc/shared`.
- Produces: `api.get/post/patch/put/delete`, `AuthProvider`, `useAuth`, `PermissionGate`, and the protected responsive shell.
- Produces: `AppProps` with optional `initialPath`, plus test helpers `mockFetchSequence`, `mockAuthenticatedApplication`, and the named API fixtures consumed by later web tests.

- [ ] **Step 1: Write failing login and permission-gate tests**

```tsx
it('entra por uma conta rápida', async () => {
  mockFetchSequence(loginSuccessFixture(), meSuccessFixture());
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /entrar como dono/i }));
  expect(await screen.findByText(/olá, carlos/i)).toBeInTheDocument();
});

it('oculta uma ação sem permissão', () => {
  render(<PermissionGate permissions={[]} requires="MANAGE_ROLES"><button>Criar cargo</button></PermissionGate>);
  expect(screen.queryByRole('button', { name: 'Criar cargo' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run web tests and confirm missing-component failures**

Run: `npm test -- tests/web/login.test.tsx tests/web/permission-gate.test.tsx`

Expected: FAIL because the React application does not exist.

- [ ] **Step 3: Implement the typed API client and auth provider**

Store the token under `gc_demo_token`. Attach it as a bearer token. On `401`, clear it and dispatch a session-expired state. Expose `user`, `token`, `permissions`, `login`, `register`, `logout`, and `refreshUser`.

- [ ] **Step 4: Implement the login experience**

Create email/password and registration tabs. Add five quick-login cards with the approved names, roles, emails, and shared password `demo123`; each card submits through the same `/api/auth/login` route. Show “Demonstração 100% local” and never imply cloud connectivity.

- [ ] **Step 5: Implement the responsive shell and base components**

Desktop uses a `248px` navy sidebar and light main canvas. Below `820px`, replace it with a slide-in drawer and persistent menu button. The navigation labels are `Início`, `Canais`, `Mensagens`, `Eventos`, `Membros`, `Cargos`, and `Convites`. Topbar contains local search, `Offline`, current-user menu, and `Restaurar demo`.

- [ ] **Step 6: Run web tests and type checking**

Run: `npm test -- tests/web/login.test.tsx tests/web/permission-gate.test.tsx && npm run typecheck -w @gc/web`

Expected: PASS.

- [ ] **Step 7: Commit frontend foundation**

```bash
git add apps/web tests/web
git commit -m "feat: add GC authentication interface and shell"
```

---

### Task 8: Dashboard and channel-chat interface

**Files:**
- Create: `apps/web/src/pages/DashboardPage.tsx`
- Create: `apps/web/src/pages/ChannelsPage.tsx`
- Create: `apps/web/src/features/channels/ChannelList.tsx`
- Create: `apps/web/src/features/channels/MessageList.tsx`
- Create: `apps/web/src/features/channels/MessageComposer.tsx`
- Create: `apps/web/src/features/dashboard/StatCard.tsx`
- Create: `apps/web/src/features/dashboard/UpcomingEventCard.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/styles/global.css`
- Test: `tests/web/channels.test.tsx`

**Interfaces:**
- Consumes: `/api/dashboard`, `/api/channels`, and channel-message endpoints.
- Produces: navigable dashboard and channel conversation experience.

- [ ] **Step 1: Write failing channel-interface test**

```tsx
it('seleciona um canal, envia mensagem e a adiciona à conversa', async () => {
  mockAuthenticatedApplication({ role: 'role-member' });
  mockFetchSequence(channelsFixture(), messagesFixture(), createdMessageFixture('Olá, comunidade!'));
  render(<App initialPath="/canais/channel-general" />);
  await userEvent.type(await screen.findByLabelText('Mensagem para #chat-geral'), 'Olá, comunidade!');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  expect(await screen.findByText('Olá, comunidade!')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the channel test and confirm failure**

Run: `npm test -- tests/web/channels.test.tsx`

Expected: FAIL because dashboard and channel pages do not exist.

- [ ] **Step 3: Implement the dashboard cards**

Render community summary, total-member/channel/event cards, latest announcements, nearest events, online members, and channel shortcuts from `/api/dashboard`. Use empty and retry states for request failures.

- [ ] **Step 4: Implement channel navigation and conversation**

Select the first visible channel when no route ID is supplied. Render deleted messages with muted styling. Disable the composer in `avisos` when the user lacks `POST_ANNOUNCEMENTS`. Put delete controls on own messages and behind `PermissionGate` for third-party messages.

- [ ] **Step 5: Run channel tests**

Run: `npm test -- tests/web/channels.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit dashboard and channels UI**

```bash
git add apps/web/src tests/web/channels.test.tsx
git commit -m "feat: add dashboard and channel conversations"
```

---

### Task 9: Direct messages and events interface

**Files:**
- Create: `apps/web/src/pages/DirectMessagesPage.tsx`
- Create: `apps/web/src/pages/EventsPage.tsx`
- Create: `apps/web/src/features/messages/ThreadList.tsx`
- Create: `apps/web/src/features/messages/DirectConversation.tsx`
- Create: `apps/web/src/features/events/EventCard.tsx`
- Create: `apps/web/src/features/events/EventForm.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/styles/global.css`
- Test: `tests/web/events.test.tsx`

**Interfaces:**
- Consumes: direct-message and event API routes.
- Produces: direct conversations, event filtering, attendance, and permission-aware event management.

- [ ] **Step 1: Write failing event-interface tests**

```tsx
it('confirma presença e atualiza o total', async () => {
  mockAuthenticatedApplication({ role: 'role-member' });
  mockFetchSequence(eventsFixture({ going: 8 }), attendanceFixture({ going: 9, current: 'going' }));
  render(<App initialPath="/eventos" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Confirmar presença' }));
  expect(await screen.findByText('9 confirmados')).toBeInTheDocument();
});

it('mostra criação de evento apenas para cargo autorizado', async () => {
  mockAuthenticatedApplication({ role: 'role-member', permissions: [] });
  mockFetchSequence(eventsFixture({ going: 8 }));
  render(<App initialPath="/eventos" />);
  expect(await screen.findByText('Próximos eventos')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Criar evento' })).not.toBeInTheDocument();
});

it('envia uma mensagem direta e atualiza a conversa', async () => {
  mockAuthenticatedApplication({ role: 'role-member' });
  mockFetchSequence(threadsFixture(), directMessagesFixture(), createdDirectMessageFixture('Podemos conversar?'));
  render(<App initialPath="/mensagens/thread-member-organizer" />);
  await userEvent.type(await screen.findByLabelText('Mensagem direta'), 'Podemos conversar?');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  expect(await screen.findByText('Podemos conversar?')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run event-interface tests and confirm failure**

Run: `npm test -- tests/web/events.test.tsx`

Expected: FAIL because the pages are missing.

- [ ] **Step 3: Implement direct-message interface**

Use a two-column layout on desktop and list/detail navigation on mobile. Render only API-returned threads. Submit direct messages through the thread endpoint and update the visible last-message preview.

- [ ] **Step 4: Implement event cards, filters, attendance, and forms**

Provide period and category controls. Event cards show date, category color, recurrence, creator, attendance, and the current user's response. The modal form uses `datetime-local`, validates end after start, and supports create/edit. Destructive delete requires confirmation.

- [ ] **Step 5: Run event tests and web type checking**

Run: `npm test -- tests/web/events.test.tsx && npm run typecheck -w @gc/web`

Expected: PASS.

- [ ] **Step 6: Commit direct messages and events UI**

```bash
git add apps/web/src tests/web/events.test.tsx
git commit -m "feat: add direct messages and events interface"
```

---

### Task 10: Members, roles, invites, search, and reset interface

**Files:**
- Create: `apps/web/src/pages/MembersPage.tsx`
- Create: `apps/web/src/pages/RolesPage.tsx`
- Create: `apps/web/src/pages/InvitesPage.tsx`
- Create: `apps/web/src/features/members/MemberCard.tsx`
- Create: `apps/web/src/features/members/MemberProfileModal.tsx`
- Create: `apps/web/src/features/roles/PermissionMatrix.tsx`
- Create: `apps/web/src/features/roles/RoleForm.tsx`
- Create: `apps/web/src/features/invites/InviteForm.tsx`
- Create: `apps/web/src/features/search/LocalSearch.tsx`
- Create: `apps/web/src/features/demo/ResetDemoDialog.tsx`
- Modify: `apps/web/src/layout/Topbar.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/styles/global.css`
- Test: `tests/web/administration.test.tsx`

**Interfaces:**
- Consumes: member, role, invite, dashboard, event, channel, and reset API routes.
- Produces: all remaining spec screens plus local search and reset flow.

- [ ] **Step 1: Write failing visibility and reset tests**

```tsx
it('mostra alteração de cargo ao administrador e protege o dono', async () => {
  mockAuthenticatedApplication({ role: 'role-admin', permissions: ['MANAGE_MEMBERS'] });
  mockFetchSequence(membersFixture(), rolesFixture());
  render(<App initialPath="/membros" />);
  await userEvent.click(await screen.findByRole('button', { name: /ver carlos barbosa/i }));
  expect(screen.queryByLabelText('Alterar cargo')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /ver pedro santos/i }));
  expect(await screen.findByLabelText('Alterar cargo')).toBeInTheDocument();
});

it('exige a palavra RESTAURAR e volta ao login', async () => {
  mockAuthenticatedApplication({ role: 'role-owner' });
  mockFetchSequence(resetSuccessFixture());
  render(<App initialPath="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Restaurar demo' }));
  await userEvent.type(screen.getByLabelText('Digite RESTAURAR'), 'RESTAURAR');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar restauração' }));
  expect(await screen.findByRole('heading', { name: 'Entre no GC' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run administration-interface tests and confirm failure**

Run: `npm test -- tests/web/administration.test.tsx`

Expected: FAIL because administration features are missing.

- [ ] **Step 3: Implement members and profile management**

Render searchable member cards with initials, role color, status, bio, and activity. Profile modal shows history. Owner/admin role controls exclude owner as a target. Moderator actions appear only for common members when `canModerateMember` is true according to data returned by the API.

- [ ] **Step 4: Implement roles and permission matrix**

Show the nine permission rows and five system-role columns. Role form creates custom roles and edits allowed fields. Disable immutable owner controls and explain why in visible helper text.

- [ ] **Step 5: Implement invitations, clipboard fallback, and offline explanation**

Show code, local link, expiration, uses, maximum uses, and status. Attempt `navigator.clipboard.writeText`; when unavailable, select the value in a readonly input and display “Selecione e copie manualmente”. Display “Links funcionam somente nesta demonstração local”.

- [ ] **Step 6: Implement topbar search and reset**

Local search combines already fetched channels, members, and events, limits results to eight, and navigates to the corresponding page. Reset dialog keeps its confirmation button disabled until the exact word `RESTAURAR` is entered, calls the API, clears local session storage, and routes to login.

- [ ] **Step 7: Run web tests**

Run: `npm test -- tests/web`

Expected: PASS.

- [ ] **Step 8: Commit final application features**

```bash
git add apps/web/src tests/web/administration.test.tsx
git commit -m "feat: complete GC member and administration interface"
```

---

### Task 11: Offline release, launchers, documentation, and acceptance verification

**Files:**
- Create: `scripts/build-release.ts`
- Create: `iniciar-demo.bat`
- Create: `iniciar-demo.sh`
- Create: `README.md`
- Modify: `apps/api/src/server.ts`
- Modify: `.gitignore`
- Generate: `release/server.cjs`
- Generate: `release/public/**`
- Generate: `release/data/seed.json`
- Test: `tests/api/release-smoke.test.ts`
- Create: `tests/api/release-helper.ts`

**Interfaces:**
- Consumes: compiled Vite output, API entrypoint, and immutable seed.
- Produces: a relocatable `release` folder started by `node server.cjs`.
- Produces: `startReleaseOnRandomPort()` test helper that spawns the compiled server with `PORT=0`, parses its printed listening URL, and terminates the child process during cleanup.

- [ ] **Step 1: Write the failing release smoke test**

```ts
it('inicia a release e serve API e SPA sem recursos remotos', async () => {
  const server = await startReleaseOnRandomPort();
  const health = await fetch(`${server.url}/api/health`).then((response) => response.json());
  expect(health.data.mode).toBe('offline');
  const html = await fetch(server.url).then((response) => response.text());
  expect(html).toContain('<div id="root"></div>');
  expect(html).not.toMatch(/https?:\/\//);
  await server.stop();
});
```

- [ ] **Step 2: Run the release test and confirm missing-build failure**

Run: `npm test -- tests/api/release-smoke.test.ts`

Expected: FAIL because `release/server.cjs` does not exist.

- [ ] **Step 3: Implement deterministic release building**

Use Vite to build `apps/web/dist`. Use esbuild with `bundle: true`, `platform: 'node'`, `format: 'cjs'`, and target `node20` to generate `release/server.cjs`. Recreate only the explicit project-owned `release` directory, copy the web output to `release/public`, and copy the seed to `release/data/seed.json`. Do not copy an active `gc-demo.json` into the release.

- [ ] **Step 4: Finish production startup and browser opening**

When `staticDir` exists, serve it with `express.static` and return `index.html` for non-API GET requests. Resolve the release data directory relative to `__dirname`. When the process receives `--open`, use `spawn` with `cmd /c start` on Windows, `open` on macOS, or `xdg-open` on Linux after the listener reports ready.

- [ ] **Step 5: Add launchers**

`iniciar-demo.bat` changes to `%~dp0release` and runs `node server.cjs --open`; it prints a Portuguese explanation when Node is missing. `iniciar-demo.sh` resolves its own directory, changes to `release`, and executes `node server.cjs --open`. Mark the POSIX file executable.

- [ ] **Step 6: Write the README**

Document: project purpose, architecture, prerequisites, `npm install`, `npm run dev`, tests, release build, both launchers, `http://localhost:3000`, all five quick accounts and `demo123`, JSON locations, reset behavior, route summary, offline guarantees, presentation script, limitations, and troubleshooting for occupied port or missing Node.

- [ ] **Step 7: Build and run the automated suite**

Run: `npm run typecheck && npm test && npm run build`

Expected: every command exits `0` and `release/server.cjs`, `release/public/index.html`, and `release/data/seed.json` exist.

- [ ] **Step 8: Run the release smoke test**

Run: `npm test -- tests/api/release-smoke.test.ts`

Expected: PASS.

- [ ] **Step 9: Perform acceptance checks against the compiled release**

Start `node release/server.cjs` and verify in a desktop browser and a mobile-width viewport: all five logins, member exclusion from `equipe`, moderator deletion, organizer event creation, member attendance, admin role change, invite creation, persistence after restart, and exact reset. Confirm the browser network log contains no external requests.

- [ ] **Step 10: Package the deliverable**

Create `GC-Demo-Offline-TypeScript-Node.zip` containing source, tests, documentation, launchers, and the compiled release while excluding `.git`, `node_modules`, coverage, temporary data, and logs. Validate with `unzip -t GC-Demo-Offline-TypeScript-Node.zip`.

- [ ] **Step 11: Commit the release and documentation**

```bash
git add scripts iniciar-demo.bat iniciar-demo.sh README.md apps/api/src/server.ts tests/api/release-smoke.test.ts release
git commit -m "build: package GC offline presentation demo"
```

---

## Final Verification Checklist

- [ ] `npm run typecheck` exits successfully.
- [ ] `npm test` exits successfully with shared, API, frontend, and release tests.
- [ ] `npm run build` produces a complete `release` directory.
- [ ] `node release/server.cjs` serves the app and API on localhost.
- [ ] The five seeded accounts authenticate with `demo123`.
- [ ] The API enforces every role distinction documented in the permission matrix.
- [ ] JSON mutations persist across a server restart.
- [ ] Reset restores the seed and invalidates all tokens.
- [ ] Desktop and mobile layouts are visually usable.
- [ ] The compiled page makes no external network requests.
- [ ] The ZIP archive passes `unzip -t` and contains no `node_modules` or mutable demo data.
