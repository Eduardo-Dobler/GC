import { randomUUID } from 'node:crypto';
import { hasPermission, roleInput } from '@gc/shared';
import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';

export function rolesRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use(requireAuth(store, sessions));

  router.get('/roles', (_request, response) => {
    response.json({ data: store.snapshot().roles.sort((left, right) => right.rank - left.rank) });
  });

  router.post('/roles', async (request, response) => {
    const actorId = authenticatedUserId(request);
    const input = parseInput(roleInput, request.body);
    const id = randomUUID();
    const database = await store.mutate((draft) => {
      if (!hasPermission(draft, actorId, 'MANAGE_ROLES')) throw new ApiError(403, 'FORBIDDEN', 'Seu cargo não permite criar cargos.');
      if (draft.roles.some((role) => role.name.toLowerCase() === input.name.toLowerCase())) {
        throw new ApiError(409, 'ROLE_NAME_IN_USE', 'Já existe um cargo com este nome.');
      }
      draft.roles.push({ id, ...input, rank: 20, system: false });
    });
    response.status(201).json({ data: database.roles.find((role) => role.id === id)! });
  });

  router.patch('/roles/:roleId', async (request, response) => {
    const actorId = authenticatedUserId(request);
    const input = parseInput(roleInput, request.body);
    const roleId = request.params.roleId;
    const database = await store.mutate((draft) => {
      if (!hasPermission(draft, actorId, 'MANAGE_ROLES')) throw new ApiError(403, 'FORBIDDEN', 'Seu cargo não permite editar cargos.');
      const target = draft.roles.find((candidate) => candidate.id === roleId);
      if (!target) throw new ApiError(404, 'ROLE_NOT_FOUND', 'Cargo não encontrado.');
      if (target.id === 'role-owner') throw new ApiError(409, 'OWNER_ROLE_PROTECTED', 'O cargo de Dono é protegido.');
      if (target.system && input.name !== target.name) throw new ApiError(409, 'SYSTEM_ROLE_NAME', 'O nome deste cargo padrão não pode ser alterado.');
      if (draft.roles.some((candidate) => candidate.id !== target.id && candidate.name.toLowerCase() === input.name.toLowerCase())) {
        throw new ApiError(409, 'ROLE_NAME_IN_USE', 'Já existe um cargo com este nome.');
      }
      target.name = input.name;
      target.color = input.color;
      target.permissions = input.permissions;
    });
    response.json({ data: database.roles.find((candidate) => candidate.id === roleId)! });
  });

  return router;
}
