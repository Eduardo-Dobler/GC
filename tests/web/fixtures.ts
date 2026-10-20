import type { MemberView, PublicUser, Role } from '@gc/shared';

export const ownerUser: PublicUser = {
  id: 'user-owner',
  name: 'Carlos Barbosa',
  email: 'carlos@gc.local',
  roleId: 'role-owner',
  bio: 'Responsável pela comunidade.',
  avatarColor: '#f97316',
  status: 'online',
  memberStatus: 'active',
  joinedAt: '2026-07-01T12:00:00.000Z',
  lastActiveAt: '2026-09-08T12:00:00.000Z',
  activity: [],
  role: {
    id: 'role-owner',
    name: 'Dono',
    color: '#f97316',
    rank: 100,
    system: true,
    permissions: ['VIEW_PRIVATE_CHANNELS', 'POST_ANNOUNCEMENTS', 'MODERATE_MESSAGES', 'CREATE_EVENTS', 'MANAGE_EVENTS', 'MANAGE_MEMBERS', 'MODERATE_MEMBERS', 'MANAGE_ROLES', 'CREATE_INVITES'],
  },
};

export function loginSuccessFixture(user = ownerUser) {
  return { data: { token: 'token-demo', user, permissions: user.role.permissions } };
}

export function meSuccessFixture(user = ownerUser) {
  return { data: { user, permissions: user.role.permissions } };
}

export const memberUser: PublicUser = {
  ...ownerUser,
  id: 'user-member',
  name: 'Pedro Santos',
  email: 'pedro@gc.local',
  roleId: 'role-member',
  avatarColor: '#64748b',
  role: { id: 'role-member', name: 'Membro', color: '#64748b', rank: 10, system: true, permissions: [] },
};

export const adminUser: PublicUser = {
  ...ownerUser,
  id: 'user-admin',
  name: 'Marina Costa',
  email: 'marina@gc.local',
  roleId: 'role-admin',
  avatarColor: '#2563eb',
  role: {
    id: 'role-admin',
    name: 'Administrador',
    color: '#2563eb',
    rank: 80,
    system: true,
    permissions: ['VIEW_PRIVATE_CHANNELS', 'POST_ANNOUNCEMENTS', 'MODERATE_MESSAGES', 'CREATE_EVENTS', 'MANAGE_EVENTS', 'MANAGE_MEMBERS', 'MODERATE_MEMBERS', 'MANAGE_ROLES', 'CREATE_INVITES'],
  },
};

export const roles: Role[] = [
  ownerUser.role,
  adminUser.role,
  { id: 'role-moderator', name: 'Moderador', color: '#7c3aed', rank: 60, system: true, permissions: ['VIEW_PRIVATE_CHANNELS', 'MODERATE_MESSAGES', 'MODERATE_MEMBERS'] },
  { id: 'role-organizer', name: 'Organizador de Eventos', color: '#0f766e', rank: 40, system: true, permissions: ['VIEW_PRIVATE_CHANNELS', 'CREATE_EVENTS', 'CREATE_INVITES'] },
  memberUser.role,
];

export function membersFixture() {
  const owner: MemberView = { ...ownerUser, capabilities: { canChangeRole: false, canModerate: false } };
  const member: MemberView = { ...memberUser, capabilities: { canChangeRole: true, canModerate: true } };
  return { data: [owner, { ...adminUser, capabilities: { canChangeRole: false, canModerate: false } }, member] };
}

export function rolesFixture() {
  return { data: roles };
}

export function invitesFixture() {
  return {
    data: [{
      id: 'invite-demo', code: 'SENAC1', link: 'http://localhost:3000/convite/SENAC1', createdBy: ownerUser.id,
      createdAt: '2026-09-08T10:00:00.000Z', expiresAt: '2026-10-08T10:00:00.000Z',
      maxUses: 10, uses: 2, revokedAt: null, status: 'active',
    }],
  };
}

export function resetSuccessFixture() {
  return { data: { restored: true } };
}

export const generalChannel = {
  id: 'channel-general',
  name: 'chat-geral',
  description: 'Conversa aberta entre todos os membros.',
  type: 'text' as const,
  order: 2,
  allowedRoleIds: [],
  messageCount: 2,
  canPost: true,
};

export function channelsFixture() {
  return { data: [generalChannel, { ...generalChannel, id: 'channel-questions', name: 'duvidas', order: 3 }] };
}

export function messagesFixture() {
  return {
    data: {
      channel: generalChannel,
      messages: [{
        id: 'message-existing', channelId: generalChannel.id, authorId: ownerUser.id,
        content: 'Bem-vindos ao canal geral.', createdAt: '2026-09-08T10:00:00.000Z',
        updatedAt: null, deletedAt: null, author: ownerUser, canDelete: false,
      }],
    },
  };
}

export function createdMessageFixture(content: string) {
  return {
    data: {
      id: 'message-created', channelId: generalChannel.id, authorId: memberUser.id,
      content, createdAt: '2026-09-08T12:00:00.000Z', updatedAt: null, deletedAt: null,
      author: memberUser, canDelete: true,
    },
  };
}

export function dashboardFixture() {
  return {
    data: {
      community: { id: 'community-senac-tech', name: 'Comunidade SENAC Tech', description: 'Espaço profissional para organizar a comunidade.', createdAt: '2026-07-01T12:00:00.000Z' },
      stats: { members: 5, channels: 4, events: 4, online: 3 },
      announcements: [{ id: 'a1', content: 'Cronograma atualizado.', author: ownerUser, createdAt: '2026-09-08T10:00:00.000Z' }],
      upcomingEvents: [{ id: 'e1', title: 'Workshop de protótipos', startsAt: '2026-10-20T18:30:00.000Z', category: 'Workshop', color: '#0f766e', participantCount: 2 }],
      onlineMembers: [ownerUser],
      channelShortcuts: [generalChannel],
    },
  };
}

export const eventFixture = {
  id: 'event-workshop',
  title: 'Workshop de protótipos',
  description: 'Revisão coletiva dos protótipos.',
  startsAt: '2026-10-20T18:30:00.000Z',
  endsAt: '2026-10-20T20:00:00.000Z',
  category: 'Workshop',
  color: '#0f766e',
  recurring: false,
  recurrence: null,
  createdBy: ownerUser.id,
  invitedUserIds: [memberUser.id],
  createdAt: '2026-09-08T10:00:00.000Z',
  updatedAt: '2026-09-08T10:00:00.000Z',
  creator: ownerUser,
  attendance: { going: 8, notGoing: 1, current: null },
};

export function eventsFixture(going = 8) {
  return { data: [{ ...eventFixture, attendance: { ...eventFixture.attendance, going } }] };
}

export function attendanceFixture(going = 9) {
  return { data: { ...eventFixture, attendance: { going, notGoing: 1, current: 'going' as const } } };
}

export function threadsFixture() {
  return {
    data: [{
      id: 'thread-member-organizer',
      participantIds: [memberUser.id, 'user-organizer'],
      updatedAt: '2026-09-08T10:58:00.000Z',
      otherParticipant: { ...ownerUser, id: 'user-organizer', name: 'Sofia Almeida', email: 'sofia@gc.local', roleId: 'role-organizer', role: { ...ownerUser.role, id: 'role-organizer', name: 'Organizador de Eventos', color: '#0f766e', rank: 40, permissions: ['VIEW_PRIVATE_CHANNELS', 'CREATE_EVENTS', 'CREATE_INVITES'] } },
      latestMessage: { id: 'd1', threadId: 'thread-member-organizer', authorId: memberUser.id, content: 'Obrigado!', createdAt: '2026-09-08T10:58:00.000Z' },
    }],
  };
}

export function directMessagesFixture() {
  const sofia = threadsFixture().data[0].otherParticipant;
  return {
    data: {
      thread: threadsFixture().data[0],
      messages: [{ id: 'd1', threadId: 'thread-member-organizer', authorId: sofia.id, content: 'Pode confirmar pelo evento.', createdAt: '2026-09-08T10:48:00.000Z', author: sofia }],
    },
  };
}

export function createdDirectMessageFixture(content: string) {
  return { data: { id: 'd2', threadId: 'thread-member-organizer', authorId: memberUser.id, content, createdAt: '2026-09-08T11:00:00.000Z', author: memberUser } };
}
