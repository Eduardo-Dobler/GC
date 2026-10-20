import type { DemoDatabase, Permission } from '@gc/shared';
import { hasPermission } from '@gc/shared';
import type { RequestHandler } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { ApiError } from './errors';
import { findCommunity, isMember } from '../services/communities';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      sessionToken?: string;
      communityId?: string;
    }
  }
}

export function requireAuth(store: JsonStore, sessions: SessionStore, communityScoped = true): RequestHandler {
  return (request, _response, next) => {
    const header = request.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      next(new ApiError(401, 'AUTH_REQUIRED', 'Entre novamente para continuar.'));
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    const session = token ? sessions.get(token) : undefined;
    if (!session) {
      next(new ApiError(401, 'AUTH_REQUIRED', 'Sua sessão expirou. Entre novamente.'));
      return;
    }

    const database = store.snapshot();
    const user = database.users.find((candidate) => candidate.id === session.userId);
    if (!user || user.memberStatus !== 'active') {
      sessions.delete(token);
      next(new ApiError(401, 'AUTH_REQUIRED', 'Sua sessão não está mais ativa. Entre novamente.'));
      return;
    }

    request.userId = session.userId;
    request.sessionToken = token;
    if (!communityScoped) { next(); return; }
    const requestedCommunityId = request.header('X-Community-Id') || undefined;
    const community = findCommunity(database, requestedCommunityId);
    if (requestedCommunityId && community.community.id !== requestedCommunityId) {
      next(new ApiError(404, 'COMMUNITY_NOT_FOUND', 'Comunidade não encontrada.'));
      return;
    }
    if (!isMember(community, session.userId)) {
      next(new ApiError(403, 'COMMUNITY_ACCESS_DENIED', 'Você não participa desta comunidade.'));
      return;
    }
    request.communityId = community.community.id;
    next();
  };
}

export function requirePermission(store: JsonStore, permission: Permission): RequestHandler {
  return (request, _response, next) => {
    if (!request.userId || !hasPermission(store.snapshot(), request.userId, permission)) {
      next(new ApiError(403, 'FORBIDDEN', 'Seu cargo não permite esta ação.'));
      return;
    }
    next();
  };
}

export function authenticatedUserId(request: Express.Request): string {
  if (!request.userId) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre novamente para continuar.');
  return request.userId;
}

export function assertActiveMember(database: DemoDatabase, userId: string): void {
  const member = database.users.find((candidate) => candidate.id === userId);
  if (!member || member.memberStatus !== 'active') {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Sua sessão não está mais ativa. Entre novamente.');
  }
}
