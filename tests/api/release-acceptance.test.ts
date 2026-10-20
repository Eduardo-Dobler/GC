import { describe, expect, it } from 'vitest';
import { startReleaseOnRandomPort } from './release-helper';

interface RequestOptions { method?: string; token?: string; body?: unknown }

async function request<T>(url: string, path: string, options: RequestOptions = {}): Promise<{ status: number; data: T }> {
  const response = await fetch(`${url}/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = response.status === 204 ? { data: undefined } : await response.json() as { data: T; error?: { message: string } };
  if (!response.ok) throw Object.assign(new Error(payload.error?.message ?? `HTTP ${response.status}`), { status: response.status });
  return { status: response.status, data: payload.data as T };
}

async function login(url: string, email: string) {
  return (await request<{ token: string; user: { role: { name: string } } }>(url, '/auth/login', {
    method: 'POST', body: { email, password: 'demo123' },
  })).data;
}

describe('aceitação da release compilada', () => {
  it('executa os cenários dos cinco cargos, persiste e restaura o seed', async () => {
    let server = await startReleaseOnRandomPort({ cleanupOnStop: false });
    const accounts = [
      ['carlos@gc.local', 'Dono'], ['marina@gc.local', 'Administrador'],
      ['lucas@gc.local', 'Moderador'], ['sofia@gc.local', 'Organizador de Eventos'],
      ['pedro@gc.local', 'Membro'],
    ] as const;

    const sessions = new Map<string, string>();
    for (const [email, role] of accounts) {
      const authenticated = await login(server.url, email);
      expect(authenticated.user.role.name).toBe(role);
      sessions.set(email, authenticated.token);
    }

    const memberToken = sessions.get('pedro@gc.local')!;
    const memberChannels = (await request<Array<{ id: string }>>(server.url, '/channels', { token: memberToken })).data;
    expect(memberChannels.some((channel) => channel.id === 'channel-team')).toBe(false);

    const moderatorToken = sessions.get('lucas@gc.local')!;
    const conversation = (await request<{ messages: Array<{ id: string; deletedAt: string | null }> }>(server.url, '/channels/channel-general/messages', { token: moderatorToken })).data;
    const message = conversation.messages.find((item) => !item.deletedAt)!;
    expect((await request(server.url, `/messages/${message.id}`, { method: 'DELETE', token: moderatorToken })).status).toBe(204);

    const organizerToken = sessions.get('sofia@gc.local')!;
    const createdEvent = (await request<{ id: string }>(server.url, '/events', {
      method: 'POST', token: organizerToken, body: {
        title: 'Laboratório de comunidade', description: 'Evento criado no teste da release compilada.',
        startsAt: '2027-03-10T18:00:00.000Z', endsAt: '2027-03-10T20:00:00.000Z',
        category: 'Workshop', color: '#0f766e', recurring: false, recurrence: null, invitedUserIds: [],
      },
    })).data;
    const attendance = (await request<{ attendance: { current: string } }>(server.url, `/events/${createdEvent.id}/attendance`, { method: 'PUT', token: memberToken, body: { status: 'going' } })).data;
    expect(attendance.attendance.current).toBe('going');

    const adminToken = sessions.get('marina@gc.local')!;
    await request(server.url, '/members/user-member/role', { method: 'PATCH', token: adminToken, body: { roleId: 'role-moderator' } });
    const invite = (await request<{ code: string }>(server.url, '/invites', { method: 'POST', token: adminToken, body: { maxUses: 5, expiresInDays: 7 } })).data;
    expect(invite.code).toHaveLength(6);

    const runtimeRoot = server.runtimeRoot;
    await server.stop();
    server = await startReleaseOnRandomPort({ runtimeRoot, cleanupOnStop: true });
    try {
      const persistedMember = await login(server.url, 'pedro@gc.local');
      expect(persistedMember.user.role.name).toBe('Moderador');

      const owner = await login(server.url, 'carlos@gc.local');
      await expect(request(server.url, '/demo/reset', { method: 'POST', token: owner.token, body: { confirmation: 'restaurar' } })).rejects.toMatchObject({ status: 400 });
      await request(server.url, '/demo/reset', { method: 'POST', token: owner.token, body: { confirmation: 'RESTAURAR' } });
      await expect(request(server.url, '/auth/me', { token: persistedMember.token })).rejects.toMatchObject({ status: 401 });
      expect((await login(server.url, 'pedro@gc.local')).user.role.name).toBe('Membro');
    } finally {
      await server.stop();
    }
  }, 20_000);
});
