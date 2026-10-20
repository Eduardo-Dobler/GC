import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp, loginAs } from './test-app';

describe('canais e mensagens', () => {
  it('impede que um membro veja o canal privado da equipe', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const organizer = await loginAs(context.app, 'sofia@gc.local');

    const memberChannels = await request(context.app)
      .get('/api/channels')
      .auth(member, { type: 'bearer' })
      .expect(200);
    expect(memberChannels.body.data.some((item: { id: string }) => item.id === 'channel-team')).toBe(false);
    await request(context.app)
      .get('/api/channels/channel-team/messages')
      .auth(member, { type: 'bearer' })
      .expect(403);
    await request(context.app)
      .get('/api/channels/channel-team/messages')
      .auth(organizer, { type: 'bearer' })
      .expect(200);
  });

  it('persiste uma mensagem e deixa o moderador removê-la', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const moderator = await loginAs(context.app, 'lucas@gc.local');

    const sent = await request(context.app)
      .post('/api/channels/channel-general/messages')
      .auth(member, { type: 'bearer' })
      .send({ content: 'Mensagem persistida' })
      .expect(201);
    expect(context.store.snapshot().messages.some((message) => message.id === sent.body.data.id)).toBe(true);

    await request(context.app)
      .delete(`/api/messages/${sent.body.data.id}`)
      .auth(moderator, { type: 'bearer' })
      .expect(204);
    const removed = context.store.snapshot().messages.find((message) => message.id === sent.body.data.id);
    expect(removed?.content).toBe('Mensagem removida');
    expect(removed?.deletedAt).not.toBeNull();
  });

  it('bloqueia membro comum ao publicar no canal de avisos', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    await request(context.app)
      .post('/api/channels/channel-announcements/messages')
      .auth(member, { type: 'bearer' })
      .send({ content: 'Aviso sem permissão' })
      .expect(403);
  });
});

describe('mensagens diretas', () => {
  it('impede acesso a uma conversa alheia', async () => {
    const context = await createTestApp();
    const outsider = await loginAs(context.app, 'sofia@gc.local');
    await request(context.app)
      .get('/api/direct-threads/thread-owner-admin/messages')
      .auth(outsider, { type: 'bearer' })
      .expect(403);
  });

  it('lista apenas conversas próprias e salva uma nova mensagem direta', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const threads = await request(context.app)
      .get('/api/direct-threads')
      .auth(member, { type: 'bearer' })
      .expect(200);
    expect(threads.body.data).toHaveLength(1);
    expect(threads.body.data[0].id).toBe('thread-member-organizer');

    const sent = await request(context.app)
      .post('/api/direct-threads/thread-member-organizer/messages')
      .auth(member, { type: 'bearer' })
      .send({ content: 'Podemos conversar?' })
      .expect(201);
    expect(sent.body.data.content).toBe('Podemos conversar?');
    expect(context.store.snapshot().directMessages.at(-1)?.content).toBe('Podemos conversar?');
  });
});
