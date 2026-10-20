import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createTestApp, loginAs } from './test-app';

describe('membros e cargos', () => {
  it('protege o Dono e permite ao administrador alterar um membro', async () => {
    const context = await createTestApp();
    const admin = await loginAs(context.app, 'marina@gc.local');
    await request(context.app)
      .patch('/api/members/user-owner/role')
      .auth(admin, { type: 'bearer' })
      .send({ roleId: 'role-member' })
      .expect(409);
    const changed = await request(context.app)
      .patch('/api/members/user-member/role')
      .auth(admin, { type: 'bearer' })
      .send({ roleId: 'role-organizer' })
      .expect(200);
    expect(changed.body.data.role.id).toBe('role-organizer');
  });

  it('limita a moderação do moderador a membros comuns', async () => {
    const context = await createTestApp();
    const moderator = await loginAs(context.app, 'lucas@gc.local');
    await request(context.app)
      .post('/api/members/user-member/moderation')
      .auth(moderator, { type: 'bearer' })
      .send({ action: 'ban', reason: 'Teste da demonstração' })
      .expect(200);
    await request(context.app)
      .post('/api/members/user-organizer/moderation')
      .auth(moderator, { type: 'bearer' })
      .send({ action: 'ban', reason: 'Não permitido' })
      .expect(403);
  });

  it('recusa imediatamente acesso à comunidade após banimento', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const moderator = await loginAs(context.app, 'lucas@gc.local');

    await request(context.app)
      .post('/api/members/user-member/moderation')
      .auth(moderator, { type: 'bearer' })
      .send({ action: 'ban', reason: 'Teste de invalidação da sessão' })
      .expect(200);

    await request(context.app)
      .get('/api/channels')
      .auth(member, { type: 'bearer' })
      .expect(403);
  });

  it('recusa uma sessão se o estado ativo do membro mudou fora da rota de moderação', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    await context.store.mutate((database) => {
      database.users.find((user) => user.id === 'user-member')!.memberStatus = 'banned';
    });
    await request(context.app)
      .get('/api/direct-threads')
      .auth(member, { type: 'bearer' })
      .expect(401);
  });

  it('impede alterar o cargo de Dono e permite criar cargo personalizado', async () => {
    const context = await createTestApp();
    const admin = await loginAs(context.app, 'marina@gc.local');
    await request(context.app)
      .patch('/api/roles/role-owner')
      .auth(admin, { type: 'bearer' })
      .send({ name: 'Outro nome', color: '#111827', permissions: [] })
      .expect(409);
    const created = await request(context.app)
      .post('/api/roles')
      .auth(admin, { type: 'bearer' })
      .send({ name: 'Mentor', color: '#0f766e', permissions: ['CREATE_EVENTS'] })
      .expect(201);
    expect(created.body.data.system).toBe(false);
    expect(created.body.data.rank).toBe(20);
  });

  it('mantém nomes de cargo únicos sob criação concorrente', async () => {
    const context = await createTestApp();
    const admin = await loginAs(context.app, 'marina@gc.local');
    const role = { name: 'Mentor Concorrente', color: '#0f766e', permissions: ['CREATE_EVENTS'] };
    const responses = await Promise.all([
      request(context.app).post('/api/roles').auth(admin, { type: 'bearer' }).send(role),
      request(context.app).post('/api/roles').auth(admin, { type: 'bearer' }).send(role),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(context.store.snapshot().roles.filter((item) => item.name === role.name)).toHaveLength(1);
  });
});

describe('convites, painel e restauração', () => {
  it('mostra no painel somente atalhos visíveis para o membro', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const dashboard = await request(context.app)
      .get('/api/dashboard')
      .auth(member, { type: 'bearer' })
      .expect(200);
    expect(dashboard.body.data.community.name).toBe('Comunidade SENAC Tech');
    expect(dashboard.body.data.channelShortcuts.some((channel: { id: string }) => channel.id === 'channel-team')).toBe(false);
    expect(dashboard.body.data.stats.members).toBe(12);
  });

  it('impede membro de revogar convite e deixa um organizador criar convite', async () => {
    const context = await createTestApp();
    const member = await loginAs(context.app, 'pedro@gc.local');
    const organizer = await loginAs(context.app, 'sofia@gc.local');
    await request(context.app)
      .delete('/api/invites/invite-week')
      .auth(member, { type: 'bearer' })
      .expect(403);
    const created = await request(context.app)
      .post('/api/invites')
      .auth(organizer, { type: 'bearer' })
      .send({ maxUses: 3, expiresInDays: 7 })
      .expect(201);
    expect(created.body.data.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(created.body.data.link).toContain(created.body.data.code);
  });

  it('não grava códigos duplicados em convites concorrentes', async () => {
    const context = await createTestApp();
    const admin = await loginAs(context.app, 'marina@gc.local');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const responses = await Promise.all([
        request(context.app).post('/api/invites').auth(admin, { type: 'bearer' }).send({ maxUses: 2, expiresInDays: 3 }),
        request(context.app).post('/api/invites').auth(admin, { type: 'bearer' }).send({ maxUses: 2, expiresInDays: 3 }),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([201, 500]);
      const codes = context.store.snapshot().invites.map((invite) => invite.code);
      expect(new Set(codes).size).toBe(codes.length);
    } finally {
      random.mockRestore();
    }
  });

  it('restaura o seed e invalida todas as sessões', async () => {
    const context = await createTestApp();
    const owner = await loginAs(context.app, 'carlos@gc.local');
    await request(context.app)
      .post('/api/invites')
      .auth(owner, { type: 'bearer' })
      .send({ maxUses: 3, expiresInDays: 7 })
      .expect(201);
    expect(context.store.snapshot().invites).toHaveLength(3);

    await request(context.app)
      .post('/api/demo/reset')
      .auth(owner, { type: 'bearer' })
      .send({ confirmation: 'RESTAURAR' })
      .expect(200);
    expect(context.store.snapshot().invites).toHaveLength(2);
    await request(context.app).get('/api/auth/me').auth(owner, { type: 'bearer' }).expect(401);
  });
});
