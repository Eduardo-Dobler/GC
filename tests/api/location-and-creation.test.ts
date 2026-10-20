import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { JsonStore } from '../../apps/api/src/db/json-store';
import { createTestApp, loginAs, validEventInput } from './test-app';

describe('localização dos eventos', () => {
  it('salva o link, extrai apenas a URL do iframe e preserva o local ao editar outro campo', async () => {
    const context = await createTestApp();
    const admin = await loginAs(context.app, 'marina@gc.local');
    const embed = 'https://www.google.com/maps/embed?pb=local-do-evento';
    const created = await request(context.app).post('/api/events').auth(admin, { type: 'bearer' }).send({
      ...validEventInput(),
      locationDescription: 'Auditório do segundo andar. Entrada pela recepção.',
      googleMapsUrl: 'https://maps.app.goo.gl/LocalDoEvento',
      googleMapsEmbedUrl: `<iframe src="${embed}" width="600" onload="alert(1)"></iframe>`,
    }).expect(201);
    expect(created.body.data.googleMapsEmbedUrl).toBe(embed);
    expect(created.body.data.locationDescription).toBe('Auditório do segundo andar. Entrada pela recepção.');
    const id = created.body.data.id;
    const patched = await request(context.app).patch(`/api/events/${id}`).auth(admin, { type: 'bearer' }).send({ title: 'Workshop atualizado' }).expect(200);
    expect(patched.body.data.googleMapsUrl).toBe('https://maps.app.goo.gl/LocalDoEvento');
    expect(patched.body.data.googleMapsEmbedUrl).toBe(embed);
    const reopened = await JsonStore.create({ seedPath: context.seedPath, dataPath: context.dataPath });
    expect(reopened.snapshot().events.find((event) => event.id === id)).toMatchObject({ locationDescription: created.body.data.locationDescription, googleMapsEmbedUrl: embed });
    const cleared = await request(context.app).patch(`/api/events/${id}`).auth(admin, { type: 'bearer' }).send({ googleMapsUrl: '', googleMapsEmbedUrl: '', locationDescription: '' }).expect(200);
    expect(cleared.body.data.googleMapsEmbedUrl).toBe('');
  });

  it.each([
    'javascript:alert(1)',
    'https://www.google.com.evil.test/maps/embed?pb=x',
    'https://www.google.com/url?q=https://example.com',
    '<iframe src="https://example.com/map"></iframe>',
    '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>',
  ])('rejeita conteúdo de incorporação fora do Google Maps: %s', async (googleMapsEmbedUrl) => {
    const context = await createTestApp();
    const admin = await loginAs(context.app, 'marina@gc.local');
    await request(context.app).post('/api/events').auth(admin, { type: 'bearer' }).send({ ...validEventInput(), googleMapsEmbedUrl }).expect(400);
  });
});

describe('criação de conversas', () => {
  it('solicita aceite antes de iniciar conversa com o Dono e reutiliza a conversa aceita', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const owner = await loginAs(context.app, 'carlos@gc.local');
    const pending = await request(context.app).post('/api/direct-threads').auth(member, { type: 'bearer' }).send({ participantIds: ['user-owner'] }).expect(202);
    const requestId = pending.body.data.requests[0].id;
    expect(context.store.snapshot().directThreads.some(thread => thread.id === pending.body.data.requests[0].targetId)).toBe(false);
    const accepted = await request(context.app).patch(`/api/requests/${requestId}`).auth(owner, { type: 'bearer' }).send({ action: 'accept' }).expect(200);
    const threadId = accepted.body.data.targetId;
    const duplicate = await request(context.app).post('/api/direct-threads').auth(owner, { type: 'bearer' }).send({ participantIds: ['user-member'] }).expect(200);
    expect(duplicate.body.data.id).toBe(threadId);
    await request(context.app).post(`/api/direct-threads/${threadId}/messages`).auth(member, { type: 'bearer' }).send({ content: 'Olá, Carlos!' }).expect(201);
    const conversation = await request(context.app).get(`/api/direct-threads/${threadId}/messages`).auth(owner, { type: 'bearer' }).expect(200);
    expect(conversation.body.data.messages[0].content).toBe('Olá, Carlos!');
    expect(JSON.stringify(conversation.body)).not.toContain('passwordHash');
  });

  it('cria uma conversa em grupo com pessoas de cargos diferentes e impede acesso de terceiros', async () => {
    const context = await createTestApp();
    const owner = await loginAs(context.app, 'carlos@gc.local');
    const outsider = await loginAs(context.app, 'lucas@gc.local');
    const created = await request(context.app).post('/api/direct-threads').auth(owner, { type: 'bearer' }).send({ name: 'Apresentação do GC', participantIds: ['user-member', 'user-admin', 'user-member'] }).expect(201);
    expect(created.body.data.participantIds).toHaveLength(3);
    expect(created.body.data.title).toBe('Apresentação do GC');
    expect(created.body.data.isGroup).toBe(true);
    expect(created.body.data.participants).toHaveLength(3);
    await request(context.app).get(`/api/direct-threads/${created.body.data.id}/messages`).auth(outsider, { type: 'bearer' }).expect(403);
    const reopened = await JsonStore.create({ seedPath: context.seedPath, dataPath: context.dataPath });
    expect(reopened.snapshot().directThreads.find((thread) => thread.id === created.body.data.id)?.participantIds).toHaveLength(3);
  });

  it('não duplica conversas criadas ao mesmo tempo', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const responses = await Promise.all([1, 2].map(() => request(context.app).post('/api/direct-threads').auth(member, { type: 'bearer' }).send({ participantIds: ['user-owner'] })));
    expect(responses.map((response) => response.status).sort()).toEqual([202, 409]);
    expect(context.store.snapshot().accessRequests).toHaveLength(1);
  });

  it.each([[], ['user-member'], ['inexistente']])('rejeita destinatários inválidos: %j', async (participantIds) => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    await request(context.app).post('/api/direct-threads').auth(member, { type: 'bearer' }).send({ participantIds }).expect(400);
  });
});

describe('criação de canais', () => {
  it('permite ao cargo autorizado criar um canal público', async () => {
    const context = await createTestApp();
    const organizer = await loginAs(context.app, 'sofia@gc.local');
    const owner = await loginAs(context.app, 'carlos@gc.local');
    const created = await request(context.app).post('/api/channels').auth(organizer, { type: 'bearer' }).send({ name: 'Projetos da turma', description: 'Organização dos trabalhos.', type: 'text' }).expect(201);
    expect(created.body.data.canPost).toBe(true);
    expect(created.body.data.createdBy).toBe('user-organizer');
    const list = await request(context.app).get('/api/channels').auth(owner, { type: 'bearer' }).expect(200);
    expect(list.body.data.some((channel: { id: string }) => channel.id === created.body.data.id)).toBe(true);
  });

  it('dá acesso ao canal privado pelas pessoas selecionadas, sem exigir cargo, e protege contra terceiros', async () => {
    const context = await createTestApp();
    const organizer = await loginAs(context.app, 'sofia@gc.local');
    const member = await loginAs(context.app, 'pedro@gc.local');
    const admin = await loginAs(context.app, 'marina@gc.local');
    const created = await request(context.app).post('/api/channels').auth(organizer, { type: 'bearer' }).send({ name: 'Equipe do case', type: 'private', allowedUserIds: ['user-member'] }).expect(201);
    expect(created.body.data.allowedUserIds.sort()).toEqual(['user-member', 'user-organizer']);
    const id = created.body.data.id;
    await request(context.app).get(`/api/channels/${id}/messages`).auth(member, { type: 'bearer' }).expect(200);
    const message = await request(context.app).post(`/api/channels/${id}/messages`).auth(member, { type: 'bearer' }).send({ content: 'Pode contar comigo.' }).expect(201);
    await request(context.app).get(`/api/channels/${id}/messages`).auth(admin, { type: 'bearer' }).expect(403);
    await request(context.app).delete(`/api/messages/${message.body.data.id}`).auth(admin, { type: 'bearer' }).expect(403);
    const list = await request(context.app).get('/api/channels').auth(admin, { type: 'bearer' }).expect(200);
    expect(list.body.data.some((channel: { id: string }) => channel.id === id)).toBe(false);
  });

  it('recusa canal privado sem outras pessoas e nomes repetidos', async () => {
    const context = await createTestApp();
    const organizer = await loginAs(context.app, 'sofia@gc.local');
    await request(context.app).post('/api/channels').auth(organizer, { type: 'bearer' }).send({ name: 'Sozinho', type: 'private', allowedUserIds: [] }).expect(400);
    await request(context.app).post('/api/channels').auth(organizer, { type: 'bearer' }).send({ name: 'chat-geral', type: 'text' }).expect(409);
  });
});
