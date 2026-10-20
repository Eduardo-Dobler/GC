import { Router } from 'express';
import { requestActionInput, type AccessRequest, type DemoDatabase } from '@gc/shared';
import type { JsonStore } from '../db/json-store';
import type { SessionStore } from '../auth/session-store';
import { assertActiveMember, authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';
import { directory } from '../services/communities';
import { applyCommunity, projectCommunity } from '../services/community-space';

function view(db: DemoDatabase, item: AccessRequest) {
  return { ...item, requesterName: db.users.find(u => u.id === item.requesterId)?.name ?? 'Pessoa indisponível', recipientName: db.users.find(u => u.id === item.recipientId)?.name ?? 'Pessoa indisponível', communityName: directory(db).find(e => e.community.id === item.communityId)?.community.name ?? 'Conversa entre comunidades' };
}
export function requestsRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use('/requests', requireAuth(store, sessions, false));
  router.get('/requests', (request, response) => {
    const id = authenticatedUserId(request); const db = store.snapshot();
    const items = [...(db.accessRequests ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    response.json({ data: { incoming: items.filter(item => item.recipientId === id).map(item => view(db, item)), outgoing: items.filter(item => item.requesterId === id).map(item => view(db, item)) } });
  });
  router.patch('/requests/:id', async (request, response) => {
    const userId = authenticatedUserId(request); const { action } = parseInput(requestActionInput, request.body);
    const db = await store.mutate(draft => {
      assertActiveMember(draft, userId);
      const item = draft.accessRequests?.find(candidate => candidate.id === request.params.id);
      if (!item) throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Solicitação não encontrada.');
      if (item.recipientId !== userId) throw new ApiError(403, 'FORBIDDEN', 'Somente o destinatário pode responder.');
      if (item.status === 'accepted' || item.status === 'rejected') throw new ApiError(409, 'REQUEST_CLOSED', 'Esta solicitação já foi respondida.');
      if (action === 'accept') {
        assertActiveMember(draft, item.requesterId);
        if (item.kind === 'channel') {
          const local = projectCommunity(draft, item.communityId);
          for (const id of [item.requesterId, userId]) assertActiveMember(local, id);
          const channel = local.channels.find(c => c.id === item.targetId);
          if (!channel) throw new ApiError(404, 'CHANNEL_NOT_FOUND', 'O canal não está mais disponível.');
          channel.allowedUserIds = [...new Set([...(channel.allowedUserIds ?? []), userId])];
          applyCommunity(draft, local);
        } else {
          let thread = draft.directThreads.find(t => t.id === item.targetId);
          if (!thread) {
            const participantIds = [...new Set([...item.participantIds, userId])].filter(id => draft.users.some(u => u.id === id && u.memberStatus === 'active'));
            // Reutiliza uma conversa individual aceita por outro fluxo enquanto o pedido aguardava.
            const existing = draft.directThreads.find(t => t.participantIds.length === participantIds.length && participantIds.every(id => t.participantIds.includes(id)));
            if (existing) { thread = existing; item.targetId = existing.id; }
            else { thread = { id: item.targetId, name: item.title, participantIds, updatedAt: new Date().toISOString() }; draft.directThreads.push(thread); }
          } else thread.participantIds = [...new Set([...thread.participantIds, userId])];
          thread.updatedAt = new Date().toISOString();
        }
      }
      item.status = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'ignored';
      item.updatedAt = new Date().toISOString();
    });
    response.json({ data: view(db, db.accessRequests!.find(item => item.id === request.params.id)!) });
  });
  return router;
}
