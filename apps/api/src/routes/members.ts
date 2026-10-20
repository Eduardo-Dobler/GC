import { randomUUID } from 'node:crypto';
import {
  canModerateMember,
  hasPermission,
  memberRoleInput,
  moderationInput,
  type DemoDatabase,
  type MemberView,
  type User,
} from '@gc/shared';
import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';
import { toPublicUser } from '../services/public-user';
import { findCommunity, publicUserForCommunity } from '../services/communities';

function toMemberView(database: DemoDatabase, actorId: string, member: User, communityId?: string): MemberView {
  const community = findCommunity(database, communityId);
  return {
    ...publicUserForCommunity(database, member, community),
    capabilities: {
      canChangeRole: member.roleId !== 'role-owner' && member.id !== actorId && hasPermission(database, actorId, 'MANAGE_MEMBERS'),
      canModerate: canModerateMember(database, actorId, member.id),
    },
  };
}

export function membersRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use(requireAuth(store, sessions));

  router.get('/members', (request, response) => {
    const actorId = authenticatedUserId(request);
    const database = store.snapshot();
    const members = database.users
      .filter((member) => member.memberStatus !== 'removed' && findCommunity(database, request.communityId).memberIds.includes(member.id))
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
      .map((member) => toMemberView(database, actorId, member, request.communityId));
    response.json({ data: members });
  });

  router.get('/members/:memberId', (request, response) => {
    const actorId = authenticatedUserId(request);
    const database = store.snapshot();
    const member = database.users.find((candidate) => candidate.id === request.params.memberId);
    if (!member) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Membro não encontrado.');
    if (!findCommunity(database, request.communityId).memberIds.includes(member.id)) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Membro não encontrado nesta comunidade.');
    response.json({ data: toMemberView(database, actorId, member, request.communityId) });
  });

  router.patch('/members/:memberId/role', async (request, response) => {
    const actorId = authenticatedUserId(request);
    const input = parseInput(memberRoleInput, request.body);
    const memberId = request.params.memberId;
    const now = new Date().toISOString();
    const database = await store.mutate((draft) => {
      if (!hasPermission(draft, actorId, 'MANAGE_MEMBERS')) throw new ApiError(403, 'FORBIDDEN', 'Seu cargo não permite alterar cargos.');
      const target = draft.users.find((candidate) => candidate.id === memberId);
      if (!target) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Membro não encontrado.');
      if (target.roleId === 'role-owner') throw new ApiError(409, 'OWNER_PROTECTED', 'O cargo do Dono é protegido.');
      if (input.roleId === 'role-owner') throw new ApiError(409, 'OWNER_ROLE_UNIQUE', 'O cargo de Dono não pode ser atribuído a outro membro.');
      const role = draft.roles.find((candidate) => candidate.id === input.roleId);
      if (!role) throw new ApiError(404, 'ROLE_NOT_FOUND', 'Cargo não encontrado.');
      target.roleId = role.id;
      target.activity.unshift({ label: `Cargo alterado para ${role.name}`, date: now });
      draft.auditLogs.push({
        id: randomUUID(), actorId, action: 'MEMBER_ROLE_CHANGED', targetType: 'user', targetId: target.id,
        details: `${target.name} agora possui o cargo ${role.name}.`, createdAt: now,
      });
    });
    response.json({ data: toMemberView(database, actorId, database.users.find((candidate) => candidate.id === memberId)!, request.communityId) });
  });

  router.post('/members/:memberId/moderation', async (request, response) => {
    const actorId = authenticatedUserId(request);
    const input = parseInput(moderationInput, request.body);
    const memberId = request.params.memberId;
    const now = new Date().toISOString();
    const database = await store.mutate((draft) => {
      const target = draft.users.find((candidate) => candidate.id === memberId);
      if (!target) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Membro não encontrado.');
      if (!canModerateMember(draft, actorId, target.id)) throw new ApiError(403, 'FORBIDDEN', 'Você não pode moderar este membro.');
      target.memberStatus = input.action === 'ban' ? 'banned' : 'removed';
      target.status = 'offline';
      target.activity.unshift({ label: input.action === 'ban' ? 'Conta banida' : 'Removido da comunidade', date: now });
      draft.auditLogs.push({
        id: randomUUID(), actorId, action: input.action === 'ban' ? 'MEMBER_BANNED' : 'MEMBER_REMOVED',
        targetType: 'user', targetId: target.id, details: input.reason, createdAt: now,
      });
    });
    const member = database.users.find((candidate) => candidate.id === memberId)!;
    // A moderação afeta apenas o vínculo desta comunidade.
    response.json({ data: toMemberView(database, actorId, database.users.find((candidate) => candidate.id === member.id)!, request.communityId) });
  });

  return router;
}
