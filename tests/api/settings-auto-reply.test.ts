import request from 'supertest';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PREFERENCES } from '@gc/shared';
import { createApp } from '../../apps/api/src/app';
import { SessionStore } from '../../apps/api/src/auth/session-store';
import { JsonStore } from '../../apps/api/src/db/json-store';
import { createTestApp, loginAs } from './test-app';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-27T15:00:00.000Z')); });
afterEach(() => vi.useRealTimers());

async function scenario() {
  const context = await createTestApp();
  const owner = await loginAs(context.app, 'carlos@gc.local');
  const member = await loginAs(context.app, 'pedro@gc.local');
  const thread = await request(context.app).post('/api/direct-threads').auth(owner, { type: 'bearer' }).send({ participantIds: ['user-member'] }).expect(201);
  const path = `/api/direct-threads/${thread.body.data.id}/messages`;
  const send = (token = owner, content = 'Olá!') => request(context.app).post(path).auth(token, { type: 'bearer' }).send({ content });
  const configure = (token = member, message = 'Olá! Estou em aula e respondo no intervalo.') => request(context.app).patch('/api/settings').auth(token, { type: 'bearer' }).send({ preferences: { autoReply: { enabled: true, message } } }).expect(200);
  return { ...context, owner, member, path, send, configure };
}

describe('configurações pessoais', () => {
  it('mantém bancos anteriores compatíveis e retorna padrões sem expor credenciais', async () => {
    const { app, store } = await createTestApp();
    const member = await loginAs(app, 'pedro@gc.local');
    const response = await request(app).get('/api/settings').auth(member, { type: 'bearer' }).expect(200);
    expect(response.body.data.preferences).toEqual(DEFAULT_USER_PREFERENCES);
    expect(response.body.data.profile.id).toBe('user-member');
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|passwordSalt/);
    expect(store.snapshot().userSettings).toEqual([]);
    await request(app).get('/api/settings').expect(401);
  });

  it('salva apenas o próprio perfil e preferências, inclusive com outra comunidade selecionada', async () => {
    const s = await scenario();
    const group = await request(s.app).post('/api/communities').auth(s.member, { type: 'bearer' }).send({ name: 'Equipe teste', description: 'Um grupo de estudo', category: 'Estudo', memberIds: ['user-admin'] }).expect(201);
    const saved = await request(s.app).patch('/api/settings').set('X-Community-Id', group.body.data.community.id).auth(s.member, { type: 'bearer' }).send({ profile: { name: 'Pedro da equipe', bio: 'Minha descrição', status: 'away', avatarColor: '#123456' }, preferences: { sendOnEnter: true, compactSidebar: true } }).expect(200);
    expect(saved.body.data.profile).toMatchObject({ name: 'Pedro da equipe', status: 'away' });
    const me = await request(s.app).get('/api/auth/me').auth(s.member, { type: 'bearer' }).expect(200);
    expect(me.body.data.user.name).toBe('Pedro da equipe');
    expect(me.body.data.preferences.sendOnEnter).toBe(true);
    const other = await request(s.app).get('/api/settings').auth(s.owner, { type: 'bearer' }).expect(200);
    expect(other.body.data.preferences).toEqual(DEFAULT_USER_PREFERENCES);
    expect(other.body.data.profile.name).toBe('Carlos Barbosa');
    const publicPeople = await request(s.app).get('/api/people').auth(s.owner, { type: 'bearer' }).expect(200);
    expect(JSON.stringify(publicPeople.body)).not.toMatch(/autoReply|compactSidebar|sendOnEnter/);
  });

  it.each([
    { userId: 'user-owner', profile: { name: 'Outra pessoa' } },
    { profile: { roleId: 'role-owner' } },
    { profile: { memberStatus: 'active' } },
    { profile: { email: 'outra@gc.local' } },
    { preferences: { autoReply: { enabled: true, message: '   ' } } },
    { preferences: { autoReply: { timeZone: 'Fuso/inválido' } } },
    { preferences: { autoReply: { message: 'x'.repeat(501) } } },
  ])('rejeita alteração inválida ou campos protegidos: %j', async body => {
    const { app } = await createTestApp();
    const token = await loginAs(app, 'pedro@gc.local');
    await request(app).patch('/api/settings').auth(token, { type: 'bearer' }).send(body).expect(400);
  });

  it('não salva o perfil parcialmente quando as preferências são inválidas', async () => {
    const s = await scenario();
    await request(s.app).patch('/api/settings').auth(s.member, { type: 'bearer' }).send({ profile: { name: 'Não deve salvar' }, preferences: { autoReply: { enabled: true, message: '' } } }).expect(400);
    expect(s.store.snapshot().users.find(user => user.id === 'user-member')!.name).toBe('Pedro Santos');
  });
});

describe('resposta automática diária', () => {
  it('envia a mensagem personalizada uma vez e identifica o autor e o envio automático', async () => {
    const s = await scenario();
    await s.configure();
    const first = await s.send().expect(201);
    expect(first.body.data.author.id).toBe('user-owner');
    expect(first.body.data.automaticReplies).toHaveLength(1);
    expect(first.body.data.automaticReplies[0]).toMatchObject({ content: 'Olá! Estou em aula e respondo no intervalo.', isAutomatic: true, authorId: 'user-member', author: { id: 'user-member' } });
    expect(JSON.stringify(first.body)).not.toMatch(/passwordHash|passwordSalt|preferences/);
    const threads = await request(s.app).get('/api/direct-threads').auth(s.owner, { type: 'bearer' }).expect(200);
    expect(threads.body.data.find((thread: { id: string }) => thread.id === first.body.data.threadId).latestMessage.isAutomatic).toBe(true);
    const second = await s.send(s.owner, 'Outra mensagem hoje').expect(201);
    expect(second.body.data.automaticReplies).toEqual([]);
    const history = await request(s.app).get(s.path).auth(s.owner, { type: 'bearer' }).expect(200);
    expect(history.body.data.messages).toHaveLength(3);
    expect(history.body.data.messages.map((m: { isAutomatic?: boolean }) => Boolean(m.isAutomatic))).toEqual([false, true, false]);
  });

  it('não envia duplicatas em requisições simultâneas', async () => {
    const s = await scenario(); await s.configure();
    const responses = await Promise.all(Array.from({ length: 5 }, () => s.send()));
    expect(responses.every(item => item.status === 201)).toBe(true);
    expect(responses.reduce((total, item) => total + item.body.data.automaticReplies.length, 0)).toBe(1);
    expect(s.store.snapshot().directMessages.filter(item => item.threadId === s.path.split('/')[3] && item.isAutomatic)).toHaveLength(1);
  });

  it('libera nova resposta à meia-noite no fuso do destinatário, não à meia-noite UTC', async () => {
    vi.setSystemTime(new Date('2026-10-28T01:00:00.000Z'));
    const s = await scenario(); await s.configure();
    expect((await s.send()).body.data.automaticReplies).toHaveLength(1);
    vi.setSystemTime(new Date('2026-10-28T02:59:59.000Z'));
    expect((await s.send()).body.data.automaticReplies).toHaveLength(0);
    vi.setSystemTime(new Date('2026-10-28T03:00:00.000Z'));
    expect((await s.send()).body.data.automaticReplies).toHaveLength(1);
  });

  it('usa o fuso personalizado ao determinar a próxima data', async () => {
    vi.setSystemTime(new Date('2026-10-27T23:59:59.000Z'));
    const s = await scenario(); await s.configure();
    await request(s.app).patch('/api/settings').auth(s.member, { type: 'bearer' }).send({ preferences: { autoReply: { timeZone: 'UTC' } } }).expect(200);
    expect((await s.send()).body.data.automaticReplies).toHaveLength(1);
    vi.setSystemTime(new Date('2026-10-28T00:00:00.000Z'));
    expect((await s.send()).body.data.automaticReplies).toHaveLength(1);
  });

  it('mantém o limite diário e as preferências após reabrir o banco JSON', async () => {
    const s = await scenario(); await s.configure(); await s.send().expect(201);
    const reloaded = await JsonStore.create({ seedPath: s.seedPath, dataPath: s.dataPath });
    const app = createApp({ store: reloaded, sessions: new SessionStore() });
    const token = await loginAs(app, 'carlos@gc.local');
    const again = await request(app).post(s.path).auth(token, { type: 'bearer' }).send({ content: 'Depois de reiniciar' }).expect(201);
    expect(again.body.data.automaticReplies).toEqual([]);
    const saved = JSON.parse(await readFile(s.dataPath, 'utf8'));
    expect(saved.userSettings[0].preferences.autoReply.enabled).toBe(true);
    expect(saved.directMessages.filter((m: { isAutomatic?: boolean }) => m.isAutomatic)).toHaveLength(1);
  });

  it('trata cada remetente separadamente e não responde em grupos ou canais', async () => {
    const s = await scenario(); await s.configure();
    const admin = await loginAs(s.app, 'marina@gc.local');
    const group = await request(s.app).post('/api/direct-threads').auth(s.owner, { type: 'bearer' }).send({ participantIds: ['user-member', 'user-admin'] }).expect(201);
    const groupMessage = await request(s.app).post(`/api/direct-threads/${group.body.data.id}/messages`).auth(s.owner, { type: 'bearer' }).send({ content: 'Mensagem para o grupo' }).expect(201);
    expect(groupMessage.body.data.automaticReplies).toEqual([]);
    expect((await s.send()).body.data.automaticReplies).toHaveLength(1);
    const another = await request(s.app).post('/api/direct-threads').auth(admin, { type: 'bearer' }).send({ participantIds: ['user-member'] }).expect(201);
    const message = await request(s.app).post(`/api/direct-threads/${another.body.data.id}/messages`).auth(admin, { type: 'bearer' }).send({ content: 'Outra pessoa' }).expect(201);
    expect(message.body.data.automaticReplies).toHaveLength(1);
    const automaticCount = s.store.snapshot().directMessages.filter(m => m.isAutomatic).length;
    await request(s.app).post('/api/channels/channel-general/messages').auth(s.owner, { type: 'bearer' }).send({ content: 'Olá no canal' }).expect(201);
    expect(s.store.snapshot().directMessages.filter(m => m.isAutomatic)).toHaveLength(automaticCount);
  });

  it('não cria ciclos quando as duas pessoas ativam a resposta e não conta robôs como contato humano', async () => {
    const s = await scenario(); await s.configure(); await s.configure(s.owner, 'Carlos responderá em breve.');
    expect((await s.send()).body.data.automaticReplies).toHaveLength(1);
    const manualReply = await s.send(s.member, 'Oi, Carlos!').expect(201);
    expect(manualReply.body.data.automaticReplies).toHaveLength(1);
    expect(manualReply.body.data.automaticReplies[0].content).toBe('Carlos responderá em breve.');
    expect((await s.send(s.member)).body.data.automaticReplies).toHaveLength(0);
    expect(s.store.snapshot().directMessages.filter(item => item.isAutomatic)).toHaveLength(2);
  });

  it('não reenvia ao editar ou reativar a configuração no mesmo dia', async () => {
    const s = await scenario(); await s.configure(); await s.send().expect(201);
    await request(s.app).patch('/api/settings').auth(s.member, { type: 'bearer' }).send({ preferences: { autoReply: { enabled: false } } }).expect(200);
    expect((await s.send()).body.data.automaticReplies).toHaveLength(0);
    await s.configure(s.member, 'Novo texto');
    expect((await s.send()).body.data.automaticReplies).toHaveLength(0);
  });

  it('aguarda o próximo dia se o contato já tinha ocorrido antes da ativação', async () => {
    const s = await scenario();
    expect((await s.send()).body.data.automaticReplies).toHaveLength(0);
    await s.configure();
    expect((await s.send()).body.data.automaticReplies).toHaveLength(0);
  });

  it('funciona com destinatário offline e não permite acesso de terceiros à conversa', async () => {
    const s = await scenario(); await s.configure();
    await request(s.app).patch('/api/settings').auth(s.member, { type: 'bearer' }).send({ profile: { status: 'offline' } }).expect(200);
    const outsider = await loginAs(s.app, 'sofia@gc.local');
    await s.send(outsider).expect(403);
    expect((await s.send()).body.data.automaticReplies).toHaveLength(1);
  });

  it('restaura as preferências e o histórico junto da demonstração', async () => {
    const s = await scenario(); await s.configure(); await s.send().expect(201);
    await request(s.app).post('/api/demo/reset').auth(s.owner, { type: 'bearer' }).send({ confirmation: 'RESTAURAR' }).expect(200);
    expect(s.store.snapshot().userSettings).toEqual([]);
    expect(s.store.snapshot().directMessages.some(item => item.isAutomatic)).toBe(false);
  });
});
