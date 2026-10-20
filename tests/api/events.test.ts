import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp, loginAs, validEventInput } from './test-app';

describe('eventos', () => {
  it('permite que a organizadora crie e edite o próprio evento', async () => {
    const context = await createTestApp();
    const token = await loginAs(context.app, 'sofia@gc.local');
    const created = await request(context.app)
      .post('/api/events')
      .auth(token, { type: 'bearer' })
      .send(validEventInput())
      .expect(201);

    const updated = await request(context.app)
      .patch(`/api/events/${created.body.data.id}`)
      .auth(token, { type: 'bearer' })
      .send({ title: 'Workshop de protótipos finais' })
      .expect(200);
    expect(updated.body.data.title).toBe('Workshop de protótipos finais');
  });

  it('impede membro de criar e organizadora de editar evento alheio', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const organizer = await loginAs(context.app, 'sofia@gc.local');
    await request(context.app)
      .post('/api/events')
      .auth(member, { type: 'bearer' })
      .send(validEventInput())
      .expect(403);
    await request(context.app)
      .patch('/api/events/event-admin')
      .auth(organizer, { type: 'bearer' })
      .send({ title: 'Alteração indevida' })
      .expect(403);
  });

  it('rejeita um evento que termina antes de começar', async () => {
    const context = await createTestApp();
    const owner = await loginAs(context.app, 'carlos@gc.local');
    await request(context.app)
      .post('/api/events')
      .auth(owner, { type: 'bearer' })
      .send({ ...validEventInput(), endsAt: '2026-10-20T17:00:00.000Z' })
      .expect(400);
  });

  it('atualiza presença sem duplicar a relação do mesmo membro', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    await request(context.app)
      .put('/api/events/event-admin/attendance')
      .auth(member, { type: 'bearer' })
      .send({ status: 'going' })
      .expect(200);
    const second = await request(context.app)
      .put('/api/events/event-admin/attendance')
      .auth(member, { type: 'bearer' })
      .send({ status: 'not_going' })
      .expect(200);

    expect(second.body.data.attendance.current).toBe('not_going');
    expect(context.store.snapshot().eventParticipants.filter((item) =>
      item.eventId === 'event-admin' && item.userId === 'user-member')).toHaveLength(1);
  });

  it('filtra eventos por categoria', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const response = await request(context.app)
      .get('/api/events?period=all&category=Workshop')
      .auth(member, { type: 'bearer' })
      .expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].category).toBe('Workshop');
  });
});
