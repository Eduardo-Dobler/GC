import { addAccessRequest, needsConsent } from '../services/access-requests';
import { randomUUID } from 'node:crypto';
import { directThreadInput, messageInput, type DemoDatabase, type DirectThread, type DirectThreadView } from '@gc/shared';
import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { assertActiveMember, authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';
import { toPublicUser } from '../services/public-user';
import { selectedParticipants } from '../services/participants';

function toThreadView(database: DemoDatabase, userId: string, thread: DirectThread): DirectThreadView {
  const participants = thread.participantIds.map((id) => {
    const user = database.users.find((candidate) => candidate.id === id);
    if (!user) throw new ApiError(500, 'INVALID_DATA', 'Participante da conversa não encontrado.');
    return toPublicUser(database, user);
  });
  const others = participants.filter((user) => user.id !== userId);
  const latestMessage = database.directMessages
    .filter((message) => message.threadId === thread.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
  const isGroup = participants.length > 2;
  return {
    ...thread, participants, otherParticipant: others[0]!, latestMessage, isGroup,
    title: (isGroup && thread.name) || others.map((user) => user.name).join(', '),
  };
}

export function directMessagesRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use(requireAuth(store, sessions, false));

  router.get('/direct-threads', (request, response) => {
    const userId = authenticatedUserId(request);
    const database = store.snapshot();
    const threads: DirectThreadView[] = database.directThreads
      .filter((thread) => thread.participantIds.includes(userId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((thread) => toThreadView(database, userId, thread));
    response.json({ data: threads });
  });

  router.post('/direct-threads', async (request, response) => {
    const userId = authenticatedUserId(request);
    const input = parseInput(directThreadInput, request.body);
    let id: string = randomUUID();
    let created = false;
    const requestIds: string[] = [];
    const database = await store.mutate((draft) => {
      assertActiveMember(draft, userId);
      const participantIds = selectedParticipants(draft, userId, input.participantIds);
      const existing = draft.directThreads.find((thread) => thread.participantIds.length === participantIds.length && participantIds.every((participant) => thread.participantIds.includes(participant)));
      if (existing) { id = existing.id; return; }
      const pending = participantIds.filter(recipientId => recipientId !== userId && needsConsent(draft, userId, recipientId, request.header('X-Community-Id')));
      const immediate = participantIds.filter(recipientId => !pending.includes(recipientId));
      for (const recipientId of pending) {
        requestIds.push(addAccessRequest(draft, { kind: 'direct', requesterId: userId, recipientId, communityId: request.header('X-Community-Id') ?? draft.community.id, targetId: id, title: input.name || 'Conversa direta', participantIds: immediate }).id);
      }
      if (immediate.length > 1) {
        draft.directThreads.push({ id, participantIds: immediate, name: input.name, updatedAt: new Date().toISOString() });
        created = true;
      }
    });
    const thread = database.directThreads.find(candidate => candidate.id === id);
    const requests = database.accessRequests?.filter(item => requestIds.includes(item.id)) ?? [];
    if (!thread) { response.status(202).json({ data: { pending: true, requests } }); return; }
    response.status(created ? 201 : 200).json({ data: { ...toThreadView(database, userId, thread), pendingRequests: requests.length } });
  });

  router.get('/direct-threads/:threadId/messages', (request, response) => {
    const userId = authenticatedUserId(request);
    const database = store.snapshot();
    const thread = database.directThreads.find((candidate) => candidate.id === request.params.threadId);
    if (!thread) throw new ApiError(404, 'THREAD_NOT_FOUND', 'Conversa não encontrada.');
    if (!thread.participantIds.includes(userId)) throw new ApiError(403, 'FORBIDDEN', 'Você não participa desta conversa.');

    const messages = database.directMessages
      .filter((message) => message.threadId === thread.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((message) => {
        const author = database.users.find((candidate) => candidate.id === message.authorId);
        if (!author) throw new ApiError(500, 'INVALID_DATA', 'Autor da mensagem não encontrado.');
        return { ...message, author: toPublicUser(database, author) };
      });
    response.json({ data: { thread: toThreadView(database, userId, thread), messages } });
  });

  router.post('/direct-threads/:threadId/messages', async (request, response) => {
    const userId = authenticatedUserId(request);
    const input = parseInput(messageInput, request.body);
    const id = randomUUID();
    const now = new Date().toISOString();
    const database = await store.mutate((draft) => {
      assertActiveMember(draft, userId);
      const thread = draft.directThreads.find((candidate) => candidate.id === request.params.threadId);
      if (!thread) throw new ApiError(404, 'THREAD_NOT_FOUND', 'Conversa não encontrada.');
      if (!thread.participantIds.includes(userId)) throw new ApiError(403, 'FORBIDDEN', 'Você não participa desta conversa.');
      draft.directMessages.push({ id, threadId: thread.id, authorId: userId, content: input.content, createdAt: now });
      thread.updatedAt = now;
    });
    const message = database.directMessages.find((candidate) => candidate.id === id)!;
    const author = database.users.find((candidate) => candidate.id === userId)!;
    response.status(201).json({ data: { ...message, author: toPublicUser(database, author) } });
  });

  return router;
}
