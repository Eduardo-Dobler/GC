import request from 'supertest';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { JsonStore } from '../../apps/api/src/db/json-store';
import { createTestApp, loginAs } from './test-app';

const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';

describe('foto de perfil e status personalizado', () => {
  it('salva, publica, persiste após reiniciar e permite remover sem alterar outro usuário', async () => {
    const { app, store, dataPath, seedPath } = await createTestApp();
    const token = await loginAs(app, 'pedro@gc.local');
    const ownerBefore = store.snapshot().users.find(user => user.id === 'user-owner');
    await request(app).patch('/api/settings').auth(token, { type: 'bearer' })
      .send({ profile: { avatarUrl: photo, statusMessage: '  Em aula 📚  ', status: 'away' } }).expect(200);
    const me = await request(app).get('/api/auth/me').auth(token, { type: 'bearer' }).expect(200);
    expect(me.body.data.user).toMatchObject({ avatarUrl: photo, statusMessage: 'Em aula 📚', status: 'away' });
    expect(me.body.data.user.passwordHash).toBeUndefined();
    expect(store.snapshot().users.find(user => user.id === 'user-owner')).toEqual(ownerBefore);
    const reopened = await JsonStore.create({ seedPath, dataPath });
    expect(reopened.snapshot().users.find(user => user.id === 'user-member')).toMatchObject({ avatarUrl: photo, statusMessage: 'Em aula 📚' });
    const members = await request(app).get('/api/members').auth(token, { type: 'bearer' }).expect(200);
    expect(members.body.data.find((user: { id: string }) => user.id === 'user-member')).toMatchObject({ avatarUrl: photo, statusMessage: 'Em aula 📚' });
    await request(app).patch('/api/settings').auth(token, { type: 'bearer' }).send({ profile: { avatarUrl: '', statusMessage: '' } }).expect(200);
    const disk = JSON.parse(await readFile(dataPath, 'utf8'));
    expect(disk.users.find((user: { id: string }) => user.id === 'user-member')).toMatchObject({ avatarUrl: '', statusMessage: '', status: 'away' });
  });
  it.each([
    { avatarUrl: 'https://example.com/avatar.jpg' },
    { avatarUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
    { avatarUrl: 'data:image/png;base64,not image!' },
    { avatarUrl: 'data:image/png;base64,' + 'A'.repeat(180000) },
    { statusMessage: 'x'.repeat(81) },
    { avatarUrl: photo, roleId: 'role-owner' },
  ])('rejeita foto ou perfil inválido sem modificar o JSON: %j', async profile => {
    const { app, store } = await createTestApp();
    const token = await loginAs(app, 'pedro@gc.local');
    const before = store.snapshot();
    await request(app).patch('/api/settings').auth(token, { type: 'bearer' }).send({ profile }).expect(400);
    expect(store.snapshot()).toEqual(before);
  });
  it('exige autenticação e continua abrindo perfis antigos', async () => {
    const { app } = await createTestApp();
    await request(app).patch('/api/settings').send({ profile: { avatarUrl: photo } }).expect(401);
    const token = await loginAs(app, 'pedro@gc.local');
    const response = await request(app).get('/api/settings').auth(token, { type: 'bearer' }).expect(200);
    expect(response.body.data.profile).toMatchObject({ avatarUrl: '', statusMessage: '' });
  });
});
