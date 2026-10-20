import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-app';

describe('autenticação local', () => {
  it('invalida o token depois que a pessoa encerra a sessão', async () => {
    const context = await createTestApp();
    const login = await request(context.app)
      .post('/api/auth/login')
      .send({ email: 'carlos@gc.local', password: 'demo123' })
      .expect(200);

    const token = login.body.data.token as string;
    expect(login.body.data.user.role.id).toBe('role-owner');
    expect(login.body.data.user.passwordHash).toBeUndefined();
    await request(context.app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    await request(context.app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);
    await request(context.app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('sempre cadastra uma conta nova como membro e impede e-mail repetido', async () => {
    const context = await createTestApp();
    const body = { name: 'Novo Membro', email: 'novo@gc.local', password: 'senha123' };
    const created = await request(context.app).post('/api/auth/register').send(body).expect(201);
    expect(created.body.data.user.role.id).toBe('role-member');
    expect(created.body.data.user.email).toBe('novo@gc.local');
    await request(context.app).post('/api/auth/register').send(body).expect(409);
  });

  it('protege rotas sem sessão e devolve erros de validação em português', async () => {
    const context = await createTestApp();
    const unauthorized = await request(context.app).get('/api/auth/me').expect(401);
    expect(unauthorized.body.error.code).toBe('AUTH_REQUIRED');

    const invalid = await request(context.app)
      .post('/api/auth/login')
      .send({ email: 'invalido', password: '' })
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    expect(invalid.body.error.fields.email).toBe('Informe um e-mail válido.');
  });

  it('trata um corpo JSON malformado como requisição inválida', async () => {
    const context = await createTestApp();
    const response = await request(context.app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(response.body.error).toEqual({
      code: 'INVALID_JSON',
      message: 'O corpo da requisição contém JSON inválido.',
    });
  });

  it('mantém o e-mail único quando dois cadastros chegam juntos', async () => {
    const context = await createTestApp();
    const account = { name: 'Cadastro Concorrente', email: 'concorrente@gc.local', password: 'senha123' };
    const responses = await Promise.all([
      request(context.app).post('/api/auth/register').send(account),
      request(context.app).post('/api/auth/register').send(account),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(context.store.snapshot().users.filter((user) => user.email === account.email)).toHaveLength(1);
  });

  it('expõe a identificação de saúde da API sem exigir sessão', async () => {
    const context = await createTestApp();
    const response = await request(context.app).get('/api/health').expect(200);
    expect(response.body).toEqual({ data: { status: 'ok', mode: 'offline', schemaVersion: 1 } });
  });
});
