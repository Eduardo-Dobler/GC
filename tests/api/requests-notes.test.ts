import request from 'supertest';
import { expect, it } from 'vitest';
import { JsonStore } from '../../apps/api/src/db/json-store';
import { createTestApp, loginAs } from './test-app';

it('exige aceite do superior, bloqueia duplicadas ignoradas e libera novo pedido só após recusa', async () => {
  const { app } = await createTestApp();
  const member = await loginAs(app, 'pedro@gc.local'); const owner = await loginAs(app, 'carlos@gc.local');
  const ask = () => request(app).post('/api/direct-threads').auth(member, { type: 'bearer' }).send({ participantIds: ['user-owner'] });
  const first = await ask().expect(202); const id = first.body.data.requests[0].id;
  await ask().expect(409);
  await request(app).patch(`/api/requests/${id}`).auth(member, { type: 'bearer' }).send({ action: 'accept' }).expect(403);
  await request(app).patch(`/api/requests/${id}`).auth(owner, { type: 'bearer' }).send({ action: 'ignore' }).expect(200);
  await ask().expect(409);
  await request(app).patch(`/api/requests/${id}`).auth(owner, { type: 'bearer' }).send({ action: 'reject' }).expect(200);
  const again = await ask().expect(202);
  const accepted = await request(app).patch(`/api/requests/${again.body.data.requests[0].id}`).auth(owner, { type: 'bearer' }).send({ action: 'accept' }).expect(200);
  const threadId = accepted.body.data.targetId;
  await request(app).post(`/api/direct-threads/${threadId}/messages`).auth(member, { type: 'bearer' }).send({ content: 'Conversa autorizada.' }).expect(201);
  await ask().expect(200);
});

it('permite igual/inferior, mas superior só entra em grupo depois do aceite', async () => {
  const { app } = await createTestApp();
  const member = await loginAs(app, 'pedro@gc.local'); const owner = await loginAs(app, 'carlos@gc.local');
  const group = await request(app).post('/api/direct-threads').auth(member, { type: 'bearer' }).send({ name: 'Grupo misto', participantIds: ['user-diego', 'user-owner'] }).expect(201);
  expect(group.body.data.participantIds).not.toContain('user-owner');
  await request(app).get(`/api/direct-threads/${group.body.data.id}/messages`).auth(owner, { type: 'bearer' }).expect(403);
  const inbox = await request(app).get('/api/requests').auth(owner, { type: 'bearer' }).expect(200);
  const invitation = inbox.body.data.incoming.find((item: { targetId: string }) => item.targetId === group.body.data.id);
  await request(app).patch(`/api/requests/${invitation.id}`).auth(owner, { type: 'bearer' }).send({ action: 'accept' }).expect(200);
  await request(app).get(`/api/direct-threads/${group.body.data.id}/messages`).auth(owner, { type: 'bearer' }).expect(200);
});

it('não duplica solicitações simultâneas', async () => {
  const { app, store } = await createTestApp(); const member = await loginAs(app, 'pedro@gc.local');
  const responses = await Promise.all([1, 2].map(() => request(app).post('/api/direct-threads').auth(member, { type: 'bearer' }).send({ participantIds: ['user-owner'] })));
  expect(responses.map(r => r.status).sort()).toEqual([202, 409]);
  expect(store.snapshot().accessRequests).toHaveLength(1);
});

it('exige a permissão criar canais e aguarda aceite de um superior', async () => {
  const { app, store } = await createTestApp(); const member = await loginAs(app, 'pedro@gc.local'); const owner = await loginAs(app, 'carlos@gc.local');
  const create = () => request(app).post('/api/channels').auth(member, { type: 'bearer' }).send({ name: 'Canal por aceite', type: 'private', allowedUserIds: ['user-owner'] });
  await create().expect(403);
  await store.mutate(db => { db.roles.find(role => role.id === 'role-member')!.permissions.push('CREATE_CHANNELS'); });
  const channel = await create().expect(201);
  expect(channel.body.data.allowedUserIds).toEqual(['user-member']);
  await request(app).get(`/api/channels/${channel.body.data.id}/messages`).auth(owner, { type: 'bearer' }).expect(403);
  const inbox = await request(app).get('/api/requests').auth(owner, { type: 'bearer' }).expect(200);
  await request(app).patch(`/api/requests/${inbox.body.data.incoming[0].id}`).auth(owner, { type: 'bearer' }).send({ action: 'accept' }).expect(200);
  await request(app).get(`/api/channels/${channel.body.data.id}/messages`).auth(owner, { type: 'bearer' }).expect(200);
});

it('mantém anotações privadas e persiste edição, checklist, tabela e localização', async () => {
  const context = await createTestApp(); const member = await loginAs(context.app, 'pedro@gc.local'); const owner = await loginAs(context.app, 'carlos@gc.local');
  const note = { title: 'Apresentação', content: '**Demonstrar** o projeto', color: '#ff6a00', pinned: true, checklist: [{ text: 'Testar login', done: false }], table: [['Tema', 'Status'], ['GC', 'Pronto']], locationDescription: 'SENAC', googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=SENAC+Caxias' };
  const created = await request(context.app).post('/api/notes').auth(member, { type: 'bearer' }).send(note).expect(201);
  const id = created.body.data.id;
  const others = await request(context.app).get('/api/notes').auth(owner, { type: 'bearer' }).expect(200); expect(others.body.data).toEqual([]);
  await request(context.app).patch(`/api/notes/${id}`).auth(owner, { type: 'bearer' }).send(note).expect(404);
  await request(context.app).delete(`/api/notes/${id}`).auth(owner, { type: 'bearer' }).expect(404);
  await request(context.app).patch(`/api/notes/${id}`).auth(member, { type: 'bearer' }).send({ ...note, checklist: [{ text: 'Testar login', done: true }] }).expect(200);
  const reloaded = await JsonStore.create({ seedPath: context.seedPath, dataPath: context.dataPath });
  expect(reloaded.snapshot().notes?.find(n => n.id === id)?.checklist[0].done).toBe(true);
  await request(context.app).delete(`/api/notes/${id}`).auth(member, { type: 'bearer' }).expect(204);
});

it('rejeita links inseguros nas anotações', async () => {
  const { app } = await createTestApp(); const token = await loginAs(app, 'pedro@gc.local');
  await request(app).post('/api/notes').auth(token, { type: 'bearer' }).send({ title: 'Link', content: '', googleMapsUrl: 'javascript:alert(1)' }).expect(400);
});

it('considera o cargo da comunidade ativa ao decidir se há solicitação', async () => {
  const { app } = await createTestApp();
  const pedro = await loginAs(app, 'pedro@gc.local');
  const created = await request(app).post('/api/communities').auth(pedro, { type: 'bearer' }).send({ name: 'Projeto Caxias', description: 'Estudo para a banca.', category: 'Tecnologia', memberIds: ['user-admin'] }).expect(201);
  const id = created.body.data.community.id;
  const fromSenac = await request(app).post('/api/direct-threads').auth(pedro, { type: 'bearer' }).send({ participantIds: ['user-admin'] }).expect(202);
  expect(fromSenac.body.data.requests).toHaveLength(1);
  // A solicitação anterior não promove Marina dentro do novo grupo.
  const fromProject = await request(app).post('/api/direct-threads').set('X-Community-Id', id).auth(pedro, { type: 'bearer' }).send({ participantIds: ['user-admin'] }).expect(201);
  expect(fromProject.body.data.participantIds).toEqual(['user-member', 'user-admin']);
});

it('aceita inclusão em canal privado de outra comunidade sem expor o canal original', async () => {
  const { app } = await createTestApp();
  const pedro = await loginAs(app, 'pedro@gc.local'); const marina = await loginAs(app, 'marina@gc.local');
  const created = await request(app).post('/api/communities').auth(pedro, { type: 'bearer' }).send({ name: 'Equipe externa', description: 'Grupo de estudo.', category: 'Tecnologia', memberIds: ['user-admin'] }).expect(201);
  const cid = created.body.data.community.id;
  const role = await request(app).get('/api/roles').set('X-Community-Id', cid).auth(pedro, { type: 'bearer' }).expect(200);
  expect(role.body.data.find((item: { id: string }) => item.id === 'role-owner').permissions).toContain('CREATE_CHANNELS');
  // Marina é membro e Pedro é dono nesta comunidade: convite direto, sem solicitação.
  const channel = await request(app).post('/api/channels').set('X-Community-Id', cid).auth(pedro, { type: 'bearer' }).send({ name: 'Planejamento', type: 'private', allowedUserIds: ['user-admin'] }).expect(201);
  await request(app).get(`/api/channels/${channel.body.data.id}/messages`).set('X-Community-Id', cid).auth(marina, { type: 'bearer' }).expect(200);
  await request(app).get(`/api/channels/${channel.body.data.id}/messages`).auth(marina, { type: 'bearer' }).expect(404);
});
