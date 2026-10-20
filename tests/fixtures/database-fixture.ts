import type { DemoDatabase } from '@gc/shared';

export function databaseFixture(): DemoDatabase {
  const now = '2026-09-08T12:00:00.000Z';
  return {
    schemaVersion: 1,
    community: {
      id: 'community-senac-tech',
      name: 'Comunidade SENAC Tech',
      description: 'Comunidade de demonstração.',
      createdAt: now,
    },
    roles: [
      {
        id: 'role-owner', name: 'Dono', color: '#f97316', rank: 100, system: true,
        permissions: ['VIEW_PRIVATE_CHANNELS', 'POST_ANNOUNCEMENTS', 'MODERATE_MESSAGES', 'CREATE_EVENTS', 'MANAGE_EVENTS', 'MANAGE_MEMBERS', 'MODERATE_MEMBERS', 'MANAGE_ROLES', 'CREATE_INVITES'],
      },
      {
        id: 'role-admin', name: 'Administrador', color: '#2563eb', rank: 80, system: true,
        permissions: ['VIEW_PRIVATE_CHANNELS', 'POST_ANNOUNCEMENTS', 'MODERATE_MESSAGES', 'CREATE_EVENTS', 'MANAGE_EVENTS', 'MANAGE_MEMBERS', 'MODERATE_MEMBERS', 'MANAGE_ROLES', 'CREATE_INVITES'],
      },
      {
        id: 'role-moderator', name: 'Moderador', color: '#7c3aed', rank: 60, system: true,
        permissions: ['VIEW_PRIVATE_CHANNELS', 'MODERATE_MESSAGES', 'MODERATE_MEMBERS', 'CREATE_INVITES'],
      },
      {
        id: 'role-organizer', name: 'Organizador de Eventos', color: '#0f766e', rank: 40, system: true,
        permissions: ['VIEW_PRIVATE_CHANNELS', 'CREATE_EVENTS', 'CREATE_INVITES'],
      },
      { id: 'role-member', name: 'Membro', color: '#64748b', rank: 10, system: true, permissions: [] },
    ],
    users: [
      { id: 'user-owner', name: 'Carlos Barbosa', email: 'carlos@gc.local', roleId: 'role-owner', bio: '', status: 'online', memberStatus: 'active', joinedAt: now, lastActiveAt: now, activity: [], passwordSalt: 'salt', passwordHash: 'hash' },
      { id: 'user-admin', name: 'Marina Costa', email: 'marina@gc.local', roleId: 'role-admin', bio: '', status: 'online', memberStatus: 'active', joinedAt: now, lastActiveAt: now, activity: [], passwordSalt: 'salt', passwordHash: 'hash' },
      { id: 'user-moderator', name: 'Lucas Martins', email: 'lucas@gc.local', roleId: 'role-moderator', bio: '', status: 'online', memberStatus: 'active', joinedAt: now, lastActiveAt: now, activity: [], passwordSalt: 'salt', passwordHash: 'hash' },
      { id: 'user-organizer', name: 'Sofia Almeida', email: 'sofia@gc.local', roleId: 'role-organizer', bio: '', status: 'online', memberStatus: 'active', joinedAt: now, lastActiveAt: now, activity: [], passwordSalt: 'salt', passwordHash: 'hash' },
      { id: 'user-member', name: 'Pedro Santos', email: 'pedro@gc.local', roleId: 'role-member', bio: '', status: 'offline', memberStatus: 'active', joinedAt: now, lastActiveAt: now, activity: [], passwordSalt: 'salt', passwordHash: 'hash' },
    ],
    channels: [],
    messages: [],
    directThreads: [],
    directMessages: [],
    events: [
      { id: 'event-organizer', title: 'Evento da Sofia', description: 'Evento criado pela organizadora.', startsAt: '2026-10-20T18:30:00.000Z', endsAt: '2026-10-20T20:00:00.000Z', category: 'Workshop', color: '#0f766e', recurring: false, recurrence: null, createdBy: 'user-organizer', invitedUserIds: [], createdAt: now, updatedAt: now },
      { id: 'event-admin', title: 'Evento da Marina', description: 'Evento criado pela administradora.', startsAt: '2026-11-10T18:30:00.000Z', endsAt: '2026-11-10T20:00:00.000Z', category: 'Encontro', color: '#2563eb', recurring: false, recurrence: null, createdBy: 'user-admin', invitedUserIds: [], createdAt: now, updatedAt: now },
    ],
    eventParticipants: [],
    invites: [],
    auditLogs: [],
  };
}
