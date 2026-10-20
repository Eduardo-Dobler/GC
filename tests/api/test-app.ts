import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { SessionStore } from '../../apps/api/src/auth/session-store';
import { createApp } from '../../apps/api/src/app';
import { JsonStore } from '../../apps/api/src/db/json-store';
import { databaseFixture } from '../fixtures/database-fixture';

export async function createTestApp() {
  const directory = await mkdtemp(join(tmpdir(), 'gc-api-'));
  const seedPath = join(directory, 'seed.json');
  const dataPath = join(directory, 'gc-demo.json');
  const seed = databaseFixture();

  const originalSeed = JSON.parse(await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('../../data/seed.json', import.meta.url), 'utf8')));
  seed.users = originalSeed.users;
  seed.channels = originalSeed.channels;
  seed.messages = originalSeed.messages;
  seed.directThreads = originalSeed.directThreads;
  seed.directMessages = originalSeed.directMessages;
  seed.eventParticipants = originalSeed.eventParticipants;
  seed.invites = originalSeed.invites;

  await writeFile(seedPath, JSON.stringify(seed), 'utf8');
  const store = await JsonStore.create({ seedPath, dataPath });
  const sessions = new SessionStore();
  const app = createApp({ store, sessions });
  return { app, store, sessions, seedPath, dataPath };
}

export async function loginAs(app: ReturnType<typeof createApp>, email: string): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'demo123' })
    .expect(200);
  return response.body.data.token as string;
}

export function validEventInput() {
  return {
    title: 'Workshop de protótipos',
    description: 'Apresentação dos protótipos desenvolvidos pela comunidade.',
    startsAt: '2026-10-20T18:30:00.000Z',
    endsAt: '2026-10-20T20:00:00.000Z',
    category: 'Workshop',
    color: '#6d5dfb',
    recurring: false,
    recurrence: null,
    invitedUserIds: ['user-member'],
  };
}
