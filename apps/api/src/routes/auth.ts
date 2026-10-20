import { randomUUID } from 'node:crypto';
import { loginInput, registerInput } from '@gc/shared';
import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import { hashPassword, verifyPassword } from '../auth/password';
import type { JsonStore } from '../db/json-store';
import { authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';
import { communitySummaries, findCommunity, publicUserForCommunity, userCommunities } from '../services/communities';

function sessionData(database: ReturnType<JsonStore['snapshot']>, userId: string, communityId?: string) {
  const user = database.users.find((candidate) => candidate.id === userId)!;
  const available = userCommunities(database, userId);
  const activeCommunity = available.find(entry => entry.community.id === communityId) ?? available[0];
  if (!activeCommunity) throw new ApiError(403, 'NO_COMMUNITY', 'Você não participa de uma comunidade ativa.');
  const activeUser = publicUserForCommunity(database, user, activeCommunity);
  return {
    user: activeUser,
    permissions: activeUser.role.permissions,
    activeCommunity: activeCommunity.community,
    communities: communitySummaries(database, userId).filter((entry) => entry.isMember),
  };
}

export function authRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();

  router.post('/login', async (request, response) => {
    const input = parseInput(loginInput, request.body);
    const database = store.snapshot();
    const user = database.users.find((candidate) => candidate.email.toLowerCase() === input.email);

    if (!user || !verifyPassword(input.password, user.passwordSalt, user.passwordHash)) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
    }
    if (user.memberStatus !== 'active') {
      throw new ApiError(403, 'ACCOUNT_BLOCKED', 'Esta conta não está ativa.');
    }

    const token = sessions.create(user.id);
    response.json({ data: { token, ...sessionData(database, user.id) } });
  });

  router.post('/register', async (request, response) => {
    const input = parseInput(registerInput, request.body);
    const credential = hashPassword(input.password);
    const now = new Date().toISOString();
    const userId = randomUUID();
    const database = await store.mutate((draft) => {
      if (draft.users.some((candidate) => candidate.email.toLowerCase() === input.email)) {
        throw new ApiError(409, 'EMAIL_IN_USE', 'Já existe uma conta com este e-mail.');
      }
      const primary = draft.communityDirectory?.find(entry => entry.community.id === draft.community.id);
      primary?.memberIds.push(userId);
      draft.users.push({
        id: userId,
        name: input.name,
        email: input.email,
        roleId: 'role-member',
        bio: 'Novo membro da comunidade.',
        avatarColor: '#64748b',
        status: 'online',
        memberStatus: 'active',
        joinedAt: now,
        lastActiveAt: now,
        activity: [{ label: 'Entrou na comunidade', date: now }],
        ...credential,
      });
    });
    const user = database.users.find((candidate) => candidate.id === userId)!;
    const token = sessions.create(userId);
    response.status(201).json({ data: { token, ...sessionData(database, userId) } });
  });

  router.get('/me', requireAuth(store, sessions, false), (request, response) => {
    const userId = authenticatedUserId(request);
    const database = store.snapshot();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!user || user.memberStatus !== 'active') throw new ApiError(401, 'AUTH_REQUIRED', 'Entre novamente para continuar.');
    response.json({ data: sessionData(database, userId, request.header('X-Community-Id')) });
  });

  router.post('/logout', requireAuth(store, sessions, false), (request, response) => {
    if (request.sessionToken) sessions.delete(request.sessionToken);
    response.status(204).end();
  });

  return router;
}
