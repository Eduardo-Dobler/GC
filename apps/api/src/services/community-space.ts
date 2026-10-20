import type { CommunityDirectoryEntry, CommunitySpace, DemoDatabase } from '@gc/shared';
import { ApiError } from '../middleware/errors';

export function emptySpace(database: DemoDatabase, entry: CommunityDirectoryEntry): CommunitySpace {
  const owner = entry.memberIds.includes(entry.createdBy) ? entry.createdBy : entry.memberIds[0];
  return {
    community: entry.community,
    memberships: entry.memberIds.map(userId => ({ userId, roleId: userId === owner ? 'role-owner' : 'role-member', memberStatus: 'active' })),
    roles: structuredClone(database.roles.filter(role => role.system)),
    channels: [
      { id: `${entry.community.id}-announcements`, name: 'avisos', description: 'Comunicados da comunidade.', type: 'announcement', order: 1, allowedRoleIds: [] },
      { id: `${entry.community.id}-general`, name: 'chat-geral', description: 'Um espaço para conversar e combinar os próximos encontros.', type: 'text', order: 2, allowedRoleIds: [] },
    ],
    messages: [], events: [], eventParticipants: [], invites: [], auditLogs: [],
  };
}

export function spaceFor(database: DemoDatabase, id: string): CommunitySpace {
  const existing = database.communitySpaces?.find(space => space.community.id === id);
  if (existing) return existing;
  const entry = database.communityDirectory?.find(item => item.community.id === id);
  if (!entry) throw new ApiError(404, 'COMMUNITY_NOT_FOUND', 'Comunidade não encontrada.');
  return emptySpace(database, entry);
}

export function projectCommunity(database: DemoDatabase, id: string): DemoDatabase {
  if (id === database.community.id) return { ...database, users: database.users.map(user => ({ ...user, memberStatus: user.memberStatus === 'active' ? database.primaryMemberStatuses?.[user.id] ?? 'active' : user.memberStatus })) };
  const space = spaceFor(database, id);
  const entry = database.communityDirectory!.find(item => item.community.id === id)!;
  return {
    ...database, ...space,
    users: database.users.filter(user => space.memberships.some(member => member.userId === user.id)).map(user => {
      const member = space.memberships.find(item => item.userId === user.id)!;
      return { ...user, roleId: member.roleId, memberStatus: user.memberStatus === 'active' ? member.memberStatus : user.memberStatus };
    }),
    communityDirectory: [{ ...entry, memberIds: space.memberships.filter(member => member.memberStatus === 'active').map(member => member.userId) }],
    communitySpaces: undefined,
    primaryMemberStatuses: undefined,
  };
}

export function applyCommunity(database: DemoDatabase, local: DemoDatabase): void {
  const id = local.community.id;
  if (id === database.community.id) {
    const statuses = { ...database.primaryMemberStatuses };
    const users = local.users.map(user => {
      statuses[user.id] = user.memberStatus;
      return { ...user, memberStatus: database.users.find(original => original.id === user.id)?.memberStatus ?? 'active' as const };
    });
    Object.assign(database, local, { users, primaryMemberStatuses: statuses });
    return;
  }
  database.accessRequests = local.accessRequests;
  const space: CommunitySpace = {
    community: local.community,
    memberships: local.users.map(user => ({ userId: user.id, roleId: user.roleId, memberStatus: user.memberStatus })),
    roles: local.roles, channels: local.channels, messages: local.messages, events: local.events,
    eventParticipants: local.eventParticipants, invites: local.invites, auditLogs: local.auditLogs,
  };
  database.communitySpaces = [...(database.communitySpaces ?? []).filter(item => item.community.id !== id), space];
  const entry = database.communityDirectory?.find(item => item.community.id === id);
  if (entry) entry.memberIds = space.memberships.filter(member => member.memberStatus === 'active').map(member => member.userId);
}
