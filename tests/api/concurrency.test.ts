import request, { type Test } from 'supertest';
import { expect, it, vi } from 'vitest';
import type { JsonStore } from '../../apps/api/src/db/json-store';
import { createTestApp, loginAs } from './test-app';

// Observa a entrada das requisições na fila sem substituir a persistência real.
async function runInWriteOrder(store: JsonStore, first: Test, second: Test) {
  let unlock!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  const gate = new Promise<void>((resolve) => { unlock = resolve; });
  const held = store.mutate(async () => { started(); await gate; });
  await ready;

  let queued = 0;
  const mutate = store.mutate.bind(store);
  const observer = vi.spyOn(store, 'mutate').mockImplementation((mutator) => {
    queued += 1;
    return mutate(mutator);
  });
  try {
    const firstResponse = first.then((response) => response);
    await vi.waitFor(() => expect(queued).toBeGreaterThanOrEqual(1));
    const secondResponse = second.then((response) => response);
    await vi.waitFor(() => expect(queued).toBeGreaterThanOrEqual(2));
    unlock();
    return await Promise.all([firstResponse, secondResponse]);
  } finally {
    unlock();
    await held;
    observer.mockRestore();
  }
}

it('impede um administrador rebaixado de recuperar o cargo por uma alteração já na fila', async () => {
  const context = await createTestApp();
  const owner = await loginAs(context.app, 'carlos@gc.local');
  const admin = await loginAs(context.app, 'marina@gc.local');
  const [demotion, restoration] = await runInWriteOrder(context.store,
    request(context.app).patch('/api/members/user-admin/role').auth(owner, { type: 'bearer' }).send({ roleId: 'role-member' }),
    request(context.app).patch('/api/members/user-admin/role').auth(admin, { type: 'bearer' }).send({ roleId: 'role-admin' }),
  );
  expect(demotion.status).toBe(200);
  expect(restoration.status).toBe(403);
  expect(context.store.snapshot().users.find((user) => user.id === 'user-admin')?.roleId).toBe('role-member');
});

it('revalida a hierarquia se o alvo de uma moderação foi promovido antes da gravação', async () => {
  const context = await createTestApp();
  const owner = await loginAs(context.app, 'carlos@gc.local');
  const moderator = await loginAs(context.app, 'lucas@gc.local');
  const [promotion, moderation] = await runInWriteOrder(context.store,
    request(context.app).patch('/api/members/user-member/role').auth(owner, { type: 'bearer' }).send({ roleId: 'role-admin' }),
    request(context.app).post('/api/members/user-member/moderation').auth(moderator, { type: 'bearer' }).send({ action: 'ban', reason: 'Moderação em fila' }),
  );
  expect(promotion.status).toBe(200);
  expect(moderation.status).toBe(403);
  const member = context.store.snapshot().users.find((user) => user.id === 'user-member');
  expect(member?.roleId).toBe('role-admin');
  expect(member?.memberStatus).toBe('active');
});

it('preserva alterações independentes recebidas juntas no mesmo evento', async () => {
  const context = await createTestApp();
  const admin = await loginAs(context.app, 'marina@gc.local');
  const responses = await runInWriteOrder(context.store,
    request(context.app).patch('/api/events/event-organizer').auth(admin, { type: 'bearer' }).send({ title: 'Título atualizado' }),
    request(context.app).patch('/api/events/event-organizer').auth(admin, { type: 'bearer' }).send({ description: 'Descrição atualizada independente' }),
  );
  expect(responses.map((response) => response.status)).toEqual([200, 200]);
  const event = context.store.snapshot().events.find((item) => item.id === 'event-organizer');
  expect(event?.title).toBe('Título atualizado');
  expect(event?.description).toBe('Descrição atualizada independente');
});

it('recusa presença em um evento excluído enquanto a requisição aguardava a fila', async () => {
  const context = await createTestApp();
  const admin = await loginAs(context.app, 'marina@gc.local');
  const member = await loginAs(context.app, 'pedro@gc.local');
  const [deletion, attendance] = await runInWriteOrder(context.store,
    request(context.app).delete('/api/events/event-organizer').auth(admin, { type: 'bearer' }),
    request(context.app).put('/api/events/event-organizer/attendance').auth(member, { type: 'bearer' }).send({ status: 'going' }),
  );
  expect(deletion.status).toBe(204);
  expect(attendance.status).toBe(404);
  expect(context.store.snapshot().eventParticipants.some((item) => item.eventId === 'event-organizer')).toBe(false);
});

it.each([
  ['cargo', '/api/roles', { name: 'Cargo em fila', color: '#123456', permissions: [] }],
  ['convite', '/api/invites', { maxUses: 2, expiresInDays: 3 }],
  ['aviso', '/api/channels/channel-announcements/messages', { content: 'Aviso em fila' }],
] as const)('recusa criação de %s após a retirada da permissão', async (_name, endpoint, input) => {
  const context = await createTestApp();
  const owner = await loginAs(context.app, 'carlos@gc.local');
  const admin = await loginAs(context.app, 'marina@gc.local');
  const [demotion, creation] = await runInWriteOrder(context.store,
    request(context.app).patch('/api/members/user-admin/role').auth(owner, { type: 'bearer' }).send({ roleId: 'role-member' }),
    request(context.app).post(endpoint).auth(admin, { type: 'bearer' }).send(input),
  );
  expect(demotion.status).toBe(200);
  expect(creation.status).toBe(403);
});

it.each(['mensagem no canal', 'presença'] as const)('recusa %s pendente após o banimento do autor', async (action) => {
  const context = await createTestApp();
  const moderator = await loginAs(context.app, 'lucas@gc.local');
  const member = await loginAs(context.app, 'pedro@gc.local');
  const pending = action === 'mensagem no canal'
    ? request(context.app).post('/api/channels/channel-general/messages').auth(member, { type: 'bearer' }).send({ content: 'Mensagem após banimento' })
    : request(context.app).put('/api/events/event-organizer/attendance').auth(member, { type: 'bearer' }).send({ status: 'going' });
  const [ban, attempt] = await runInWriteOrder(context.store,
    request(context.app).post('/api/members/user-member/moderation').auth(moderator, { type: 'bearer' }).send({ action: 'ban', reason: 'Banimento em fila' }),
    pending,
  );
  expect(ban.status).toBe(200);
  expect(attempt.status).toBe(action === 'mensagem no canal' ? 403 : 401);
  expect(context.store.snapshot().messages.some((message) => message.content === 'Mensagem após banimento')).toBe(false);
});

it('impede que dois cargos sejam renomeados simultaneamente para o mesmo nome', async () => {
  const context = await createTestApp();
  const admin = await loginAs(context.app, 'marina@gc.local');
  const first = await request(context.app).post('/api/roles').auth(admin, { type: 'bearer' }).send({ name: 'Primeiro cargo', color: '#123456', permissions: [] }).expect(201);
  const second = await request(context.app).post('/api/roles').auth(admin, { type: 'bearer' }).send({ name: 'Segundo cargo', color: '#123456', permissions: [] }).expect(201);
  const renamed = { name: 'Mentoria', color: '#123456', permissions: [] };
  const responses = await runInWriteOrder(context.store,
    request(context.app).patch(`/api/roles/${first.body.data.id}`).auth(admin, { type: 'bearer' }).send(renamed),
    request(context.app).patch(`/api/roles/${second.body.data.id}`).auth(admin, { type: 'bearer' }).send(renamed),
  );
  expect(responses.map((response) => response.status)).toEqual([200, 409]);
  expect(context.store.snapshot().roles.filter((role) => role.name === 'Mentoria')).toHaveLength(1);
});
