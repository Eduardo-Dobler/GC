import { randomUUID } from 'node:crypto';
import { hasPermission, inviteInput } from '@gc/shared';
import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';

const CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = '';
    for (let index = 0; index < 6; index += 1) {
      code += CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)];
    }
    if (!existing.has(code)) return code;
  }
  throw new ApiError(500, 'INVITE_CODE_FAILED', 'Não foi possível gerar um código único.');
}

export function invitesRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use(requireAuth(store, sessions));

  router.get('/invites', (_request, response) => {
    const now = Date.now();
    const invites = store.snapshot().invites
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((invite) => ({
        ...invite,
        status: invite.revokedAt ? 'revoked' : new Date(invite.expiresAt).getTime() < now ? 'expired' : invite.uses >= invite.maxUses ? 'used' : 'active',
      }));
    response.json({ data: invites });
  });

  router.post('/invites', async (request, response) => {
    const actorId = authenticatedUserId(request);
    const input = parseInput(inviteInput, request.body);
    const id = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + input.expiresInDays * 86_400_000);
    const database = await store.mutate((draft) => {
      if (!hasPermission(draft, actorId, 'CREATE_INVITES')) throw new ApiError(403, 'FORBIDDEN', 'Seu cargo não permite criar convites.');
      const code = generateCode(new Set(draft.invites.map((invite) => invite.code)));
      draft.invites.push({
        id,
        code,
        link: `http://localhost:3000/convite/${code}`,
        createdBy: actorId,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        maxUses: input.maxUses,
        uses: 0,
        revokedAt: null,
      });
    });
    response.status(201).json({ data: database.invites.find((invite) => invite.id === id)! });
  });

  router.delete('/invites/:inviteId', async (request, response) => {
    const actorId = authenticatedUserId(request);
    await store.mutate((draft) => {
      if (!hasPermission(draft, actorId, 'CREATE_INVITES')) throw new ApiError(403, 'FORBIDDEN', 'Seu cargo não permite revogar convites.');
      const invite = draft.invites.find((candidate) => candidate.id === request.params.inviteId);
      if (!invite) throw new ApiError(404, 'INVITE_NOT_FOUND', 'Convite não encontrado.');
      invite.revokedAt = new Date().toISOString();
    });
    response.status(204).end();
  });

  return router;
}
