import { emptySpace } from '../services/community-space';
import { randomUUID } from 'node:crypto';
import { communityInput, type CommunityDirectoryEntry } from '@gc/shared';
import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';
import { communitySummaries, demoAccounts, directory, findCommunity, isMember, publicUserForCommunity, userCommunities } from '../services/communities';
import { toPublicUser } from '../services/public-user';

export function communitiesRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();

  router.get('/demo/accounts', (_request, response) => {
    response.json({ data: demoAccounts(store.snapshot()) });
  });

  router.use(['/communities', '/people'], requireAuth(store, sessions, false));

  router.get('/people', (_request, response) => {
    const database = store.snapshot();
    response.json({ data: database.users.filter(user => user.memberStatus === 'active').map(user => toPublicUser(database, user)) });
  });

  router.get('/communities', (request, response) => {
    const userId = authenticatedUserId(request);
    const database = store.snapshot();
    const summaries = communitySummaries(database, userId);
    const people = database.users.filter((user) => user.memberStatus === 'active' && userCommunities(database, user.id).length > 1).map((user) => ({
      ...toPublicUser(database, user),
      communities: userCommunities(database, user.id).map((entry) => entry.community),
    }));
    const connections = summaries.filter((entry) => entry.isMember).flatMap((entry) => summaries
      .filter((other) => other.isMember && other.community.id > entry.community.id)
      .map((other) => ({ from: entry.community, to: other.community, sharedMembers: database.users.filter(person => person.memberStatus === 'active' && entry.memberIds.includes(person.id) && other.memberIds.includes(person.id)).map(person => toPublicUser(database, person)) })))
      .filter((connection) => connection.sharedMembers.length > 0);
    response.json({ data: { communities: summaries.filter((entry) => entry.isMember), discoverable: summaries.filter((entry) => !entry.isMember), people, connections } });
  });

  router.post('/communities', async (request, response) => {
    const userId = authenticatedUserId(request);
    const input = parseInput(communityInput, request.body);
    const id = `community-${randomUUID()}`;
    const now = new Date().toISOString();
    const database = await store.mutate((draft) => {
      const members = Array.from(new Set([userId, ...input.memberIds]));
      const knownIds = new Set(draft.users.filter((user) => user.memberStatus === 'active').map((user) => user.id));
      if (members.some((memberId) => !knownIds.has(memberId))) throw new ApiError(400, 'MEMBER_NOT_FOUND', 'Uma das pessoas escolhidas não está disponível.');
      const entry: CommunityDirectoryEntry = { community: { id, name: input.name, description: input.description, createdAt: now }, category: input.category, accent: input.accent, createdBy: userId, memberIds: members };
      draft.communityDirectory = [...directory(draft), entry];
      draft.communitySpaces = [...(draft.communitySpaces ?? []), emptySpace(draft, entry)];
      draft.auditLogs.push({ id: randomUUID(), actorId: userId, action: 'COMMUNITY_CREATED', targetType: 'community', targetId: id, details: `${input.name} criada.`, createdAt: now });
    });
    const created = communitySummaries(database, userId).find((entry) => entry.community.id === id)!;
    response.status(201).json({ data: created });
  });

  router.get('/communities/:communityId/session', (request, response) => {
    const userId = authenticatedUserId(request);
    const database = store.snapshot();
    const entry = findCommunity(database, request.params.communityId);
    if (entry.community.id !== request.params.communityId) throw new ApiError(404, 'COMMUNITY_NOT_FOUND', 'Comunidade não encontrada.');
    if (!isMember(entry, userId)) throw new ApiError(403, 'COMMUNITY_ACCESS_DENIED', 'Você não participa desta comunidade.');
    const user = database.users.find((candidate) => candidate.id === userId)!;
    response.json({ data: {
      activeCommunity: entry.community,
      user: publicUserForCommunity(database, user, entry),
      permissions: publicUserForCommunity(database, user, entry).role.permissions,
      communities: userCommunities(database, userId).map((candidate) => ({ ...candidate, memberCount: candidate.memberIds.length, isMember: true, sharedMembers: [] })),
    } });
  });

  return router;
}
