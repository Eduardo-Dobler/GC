import { projectCommunity } from './community-space';
import type { CommunityDirectoryEntry, CommunitySummary, DemoAccountView, DemoDatabase, PublicUser, User } from '@gc/shared';
import { toPublicUser } from './public-user';

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  'role-owner': 'Dono e responsável pela comunidade',
  'role-admin': 'Administra membros, cargos e organização',
  'role-moderator': 'Mantém as conversas organizadas',
  'role-organizer': 'Planeja eventos e atividades',
  'role-member': 'Participa das conversas e atividades',
};

export function directory(database: DemoDatabase): CommunityDirectoryEntry[] {
  const entries = database.communityDirectory?.length ? database.communityDirectory : [{
    community: database.community,
    category: 'Tecnologia',
    accent: '#ff6a00',
    createdBy: database.users[0]?.id ?? '',
    memberIds: database.users.filter((user) => user.memberStatus === 'active').map((user) => user.id),
  }];
  return entries.map(entry => ({ ...entry, memberIds: entry.memberIds.filter(id => database.users.some(user => user.id === id && user.memberStatus === 'active') && (entry.community.id !== database.community.id || !database.primaryMemberStatuses?.[id] || database.primaryMemberStatuses[id] === 'active')) }));
}

export function findCommunity(database: DemoDatabase, communityId?: string): CommunityDirectoryEntry {
  const entries = directory(database);
  return entries.find((entry) => entry.community.id === communityId) ?? entries[0]!;
}

export function isMember(entry: CommunityDirectoryEntry, userId: string): boolean {
  return entry.memberIds.includes(userId);
}

export function userCommunities(database: DemoDatabase, userId: string): CommunityDirectoryEntry[] {
  return directory(database).filter((entry) => isMember(entry, userId));
}

export function communitySummaries(database: DemoDatabase, userId: string): CommunitySummary[] {
  const people = database.users.filter((user) => user.memberStatus === 'active');
  return directory(database).map((entry) => ({
    ...entry,
    role: entry.memberIds.includes(userId) ? publicUserForCommunity(database, database.users.find(user => user.id === userId)!, entry).role : undefined,
    memberCount: entry.memberIds.length,
    isMember: isMember(entry, userId),
    sharedMembers: entry.memberIds
      .filter((id) => id !== userId)
      .map((id) => people.find((user) => user.id === id))
      .filter((user): user is User => Boolean(user))
      .map((user) => toPublicUser(database, user)),
  }));
}

export function publicUserForCommunity(database: DemoDatabase, user: User, entry: CommunityDirectoryEntry): PublicUser {
  const local = projectCommunity(database, entry.community.id);
  return toPublicUser(local, local.users.find(candidate => candidate.id === user.id) ?? user);
}

export function demoAccounts(database: DemoDatabase): DemoAccountView[] {
  const ids = database.demoAccountIds ?? database.users.slice(0, 5).map((user) => user.id);
  return ids.map((id) => database.users.find((user) => user.id === id))
    .filter((user): user is User => Boolean(user))
    .map((user) => ({
      ...toPublicUser(database, user),
      memberships: userCommunities(database, user.id).map((entry) => ({
        community: entry.community,
        category: entry.category,
        role: publicUserForCommunity(database, user, entry).role,
        roleDescription: ROLE_DESCRIPTIONS[publicUserForCommunity(database, user, entry).role.id] ?? 'Participa das conversas e atividades',
      })),
    }));
}
