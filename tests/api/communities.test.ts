import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { JsonStore } from '../../apps/api/src/db/json-store';
import { createTestApp, loginAs, validEventInput } from './test-app';

describe('comunidades independentes', () => {
  it('permite que um membro crie uma comunidade e seja dono somente dela', async () => {
    const context = await createTestApp();
    const token = await loginAs(context.app, 'pedro@gc.local');
    const created = await request(context.app).post('/api/communities').auth(token, { type: 'bearer' })
      .send({ name: 'Basquete entre amigos', description: 'Jogos e convivência aos sábados.', category: 'Esporte', memberIds: ['user-organizer'] }).expect(201);
    const id = created.body.data.community.id;
    expect(created.body.data.role.name).toBe('Dono');
    expect(created.body.data.memberCount).toBe(2);
    const session = await request(context.app).get(`/api/communities/${id}/session`).auth(token, { type: 'bearer' }).expect(200);
    expect(session.body.data.activeCommunity.id).toBe(id);
    expect(session.body.data.permissions).toContain('MANAGE_MEMBERS');
    await request(context.app).post('/api/events').set('X-Community-Id', id).auth(token, { type: 'bearer' }).send(validEventInput()).expect(201);
    await request(context.app).post('/api/events').auth(token, { type: 'bearer' }).send(validEventInput()).expect(403);
    const reloaded = await JsonStore.create({ seedPath: context.seedPath, dataPath: context.dataPath });
    expect(reloaded.snapshot().communitySpaces?.find((space) => space.community.id === id)?.events).toHaveLength(1);
  });

  it('isola canais, membros e leitura por ID entre comunidades', async () => {
    const context = await createTestApp();
    const token = await loginAs(context.app, 'pedro@gc.local');
    const created = await request(context.app).post('/api/communities').auth(token, { type: 'bearer' })
      .send({ name: 'Clube de leitura', description: 'Leituras compartilhadas.', category: 'Cultura', memberIds: [] }).expect(201);
    const id = created.body.data.community.id;
    const channels = await request(context.app).get('/api/channels').set('X-Community-Id', id).auth(token, { type: 'bearer' }).expect(200);
    expect(channels.body.data).toHaveLength(2);
    expect(channels.body.data.some((channel: { id: string }) => channel.id === 'channel-general')).toBe(false);
    const members = await request(context.app).get('/api/members').set('X-Community-Id', id).auth(token, { type: 'bearer' }).expect(200);
    expect(members.body.data.map((member: { id: string }) => member.id)).toEqual(['user-member']);
    await request(context.app).get('/api/channels/channel-general/messages').set('X-Community-Id', id).auth(token, { type: 'bearer' }).expect(404);
    const outsider = await loginAs(context.app, 'carlos@gc.local');
    await request(context.app).get('/api/channels').set('X-Community-Id', id).auth(outsider, { type: 'bearer' }).expect(403);
    await request(context.app).get(`/api/communities/${id}/session`).auth(outsider, { type: 'bearer' }).expect(403);
  });

  it('usa o cargo local sem promover globalmente um administrador convidado', async () => {
    const context = await createTestApp();
    const owner = await loginAs(context.app, 'pedro@gc.local');
    const admin = await loginAs(context.app, 'marina@gc.local');
    const created = await request(context.app).post('/api/communities').auth(owner, { type: 'bearer' })
      .send({ name: 'Trilhas entre amigos', description: 'Caminhadas e natureza.', category: 'Lazer', memberIds: ['user-admin'] }).expect(201);
    const id = created.body.data.community.id;
    const local = await request(context.app).get(`/api/communities/${id}/session`).auth(admin, { type: 'bearer' }).expect(200);
    expect(local.body.data.user.role.name).toBe('Membro');
    await request(context.app).post('/api/events').set('X-Community-Id', id).auth(admin, { type: 'bearer' }).send(validEventInput()).expect(403);
    await request(context.app).patch('/api/members/user-admin/role').set('X-Community-Id', id).auth(owner, { type: 'bearer' }).send({ roleId: 'role-organizer' }).expect(200);
    expect(context.store.snapshot().users.find((user) => user.id === 'user-admin')?.roleId).toBe('role-admin');
  });

  it('lista apenas comunidades próprias e conexões reais por pessoas em comum', async () => {
    const context = await createTestApp();
    const token = await loginAs(context.app, 'pedro@gc.local');
    await request(context.app).post('/api/communities').auth(token, { type: 'bearer' })
      .send({ name: 'Encontros de domingo', description: 'Conversas entre amigos.', category: 'Convívio', memberIds: ['user-organizer'] }).expect(201);
    const listing = await request(context.app).get('/api/communities').auth(token, { type: 'bearer' }).expect(200);
    expect(listing.body.data.communities).toHaveLength(2);
    expect(listing.body.data.connections[0].sharedMembers.length).toBe(2);
    expect(listing.body.data.people.find((person: { id: string }) => person.id === 'user-organizer').communities).toHaveLength(2);
  });

  it('não publica contas cadastradas no diretório de atalhos de demonstração', async () => {
    const context = await createTestApp();
    await context.store.mutate((draft) => { draft.demoAccountIds = ['user-owner']; });
    await request(context.app).post('/api/auth/register').send({ name: 'Conta particular', email: 'particular@example.test', password: 'senha123' }).expect(201);
    const response = await request(context.app).get('/api/demo/accounts').expect(200);
    expect(response.body.data.map((user: { email: string }) => user.email)).toEqual(['carlos@gc.local']);
    expect(response.body.data[0].memberships[0].roleDescription.length).toBeGreaterThan(10);
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|passwordSalt|senha123/);
  });
});


it('remover da comunidade original não bloqueia as outras comunidades da pessoa', async () => {
  const context = await createTestApp();
  const member = await loginAs(context.app, 'pedro@gc.local');
  const owner = await loginAs(context.app, 'carlos@gc.local');
  const created = await request(context.app).post('/api/communities').auth(member, { type: 'bearer' })
    .send({ name: 'Grupo independente', description: 'Espaço pessoal de convivência.', category: 'Convívio' }).expect(201);
  const id = created.body.data.community.id;
  await request(context.app).post('/api/members/user-member/moderation').auth(owner, { type: 'bearer' })
    .send({ action: 'remove', reason: 'Saiu apenas deste grupo' }).expect(200);
  await request(context.app).get('/api/channels').set('X-Community-Id', id).auth(member, { type: 'bearer' }).expect(200);
  await request(context.app).get('/api/communities').set('X-Community-Id', context.store.snapshot().community.id).auth(member, { type: 'bearer' }).expect(200);
  const login = await request(context.app).post('/api/auth/login').send({ email: 'pedro@gc.local', password: 'demo123' }).expect(200);
  expect(login.body.data.activeCommunity.id).toBe(id);
  expect(login.body.data.user.role.name).toBe('Dono');
  await request(context.app).get('/api/channels').set('X-Community-Id', id).auth(login.body.data.token, { type: 'bearer' }).expect(200);
  await request(context.app).get('/api/channels').set('X-Community-Id', context.store.snapshot().community.id).auth(login.body.data.token, { type: 'bearer' }).expect(403);
});
