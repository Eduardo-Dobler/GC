import { addAccessRequest, needsConsent } from '../services/access-requests';
import { randomUUID } from 'node:crypto';
import { channelInput, hasPermission, messageInput, type MessageView } from '@gc/shared';
import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { assertActiveMember, authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';
import { canPostChannel, canViewChannel } from '../services/channel-access';
import { toPublicUser } from '../services/public-user';
import { selectedParticipants } from '../services/participants';

function messageView(database: ReturnType<JsonStore['snapshot']>, userId: string, messageId: string): MessageView {
  const message = database.messages.find((candidate) => candidate.id === messageId);
  if (!message) throw new ApiError(404, 'MESSAGE_NOT_FOUND', 'Mensagem não encontrada.');
  const author = database.users.find((candidate) => candidate.id === message.authorId);
  if (!author) throw new ApiError(500, 'INVALID_DATA', 'Autor da mensagem não encontrado.');
  return {
    ...message,
    author: toPublicUser(database, author),
    canDelete: message.authorId === userId || hasPermission(database, userId, 'MODERATE_MESSAGES'),
  };
}

export function channelsRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use(requireAuth(store, sessions));

  router.get('/channels', (request, response) => {
    const userId = authenticatedUserId(request);
    const database = store.snapshot();
    const channels = database.channels
      .filter((channel) => canViewChannel(database, userId, channel))
      .sort((left, right) => left.order - right.order)
      .map((channel) => ({
        ...channel,
        messageCount: database.messages.filter((message) => message.channelId === channel.id).length,
        canPost: canPostChannel(database, userId, channel),
      }));
    response.json({ data: channels });
  });

  router.post('/channels', async (request, response) => {
    const userId = authenticatedUserId(request);
    const input = parseInput(channelInput, request.body);
    const id = randomUUID();
    const database = await store.mutate((draft) => {
      assertActiveMember(draft, userId);
      if (!hasPermission(draft, userId, 'CREATE_CHANNELS')) throw new ApiError(403, 'FORBIDDEN', 'Seu cargo não permite criar canais.');
      const allowedUserIds = input.type === 'private' ? selectedParticipants(draft, userId, input.allowedUserIds) : [];
      if (draft.channels.some((channel) => channel.name.toLocaleLowerCase('pt-BR') === input.name.toLocaleLowerCase('pt-BR'))) {
        throw new ApiError(409, 'CHANNEL_EXISTS', 'Este nome de canal já está em uso. Escolha outro nome.');
      }
      const pending = allowedUserIds.filter(recipientId => recipientId !== userId && needsConsent(draft, userId, recipientId, draft.community.id));
      for (const recipientId of pending) addAccessRequest(draft, { kind: 'channel', requesterId: userId, recipientId, communityId: draft.community.id, targetId: id, title: input.name, participantIds: [] });
      draft.channels.push({
        ...input, id, allowedUserIds: allowedUserIds.filter(recipientId => !pending.includes(recipientId)), allowedRoleIds: [], createdBy: userId,
        order: Math.max(0, ...draft.channels.map((channel) => channel.order)) + 1,
      });
    });
    const channel = database.channels.find((candidate) => candidate.id === id)!;
    response.status(201).json({ data: { ...channel, messageCount: 0, canPost: canPostChannel(database, userId, channel) } });
  });

  router.get('/channels/:channelId/messages', (request, response) => {
    const userId = authenticatedUserId(request);
    const database = store.snapshot();
    const channel = database.channels.find((candidate) => candidate.id === request.params.channelId);
    if (!channel) throw new ApiError(404, 'CHANNEL_NOT_FOUND', 'Canal não encontrado.');
    if (!canViewChannel(database, userId, channel)) throw new ApiError(403, 'FORBIDDEN', 'Você não tem acesso a este canal.');

    const messages = database.messages
      .filter((message) => message.channelId === channel.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((message) => messageView(database, userId, message.id));
    response.json({ data: { channel: { ...channel, canPost: canPostChannel(database, userId, channel) }, messages } });
  });

  router.post('/channels/:channelId/messages', async (request, response) => {
    const userId = authenticatedUserId(request);
    const input = parseInput(messageInput, request.body);
    const id = randomUUID();
    const now = new Date().toISOString();
    const database = await store.mutate((draft) => {
      const channel = draft.channels.find((candidate) => candidate.id === request.params.channelId);
      if (!channel) throw new ApiError(404, 'CHANNEL_NOT_FOUND', 'Canal não encontrado.');
      if (!canPostChannel(draft, userId, channel)) throw new ApiError(403, 'FORBIDDEN', 'Você não pode publicar neste canal.');
      draft.messages.push({
        id,
        channelId: channel.id,
        authorId: userId,
        content: input.content,
        createdAt: now,
        updatedAt: null,
        deletedAt: null,
      });
    });
    response.status(201).json({ data: messageView(database, userId, id) });
  });

  router.delete('/messages/:messageId', async (request, response) => {
    const userId = authenticatedUserId(request);
    await store.mutate((draft) => {
      assertActiveMember(draft, userId);
      const target = draft.messages.find((candidate) => candidate.id === request.params.messageId);
      if (!target) throw new ApiError(404, 'MESSAGE_NOT_FOUND', 'Mensagem não encontrada.');
      const channel = draft.channels.find((candidate) => candidate.id === target.channelId);
      if (!channel || !canViewChannel(draft, userId, channel)) throw new ApiError(403, 'FORBIDDEN', 'Você não tem acesso a este canal.');
      if (target.authorId !== userId && !hasPermission(draft, userId, 'MODERATE_MESSAGES')) {
        throw new ApiError(403, 'FORBIDDEN', 'Você não pode remover esta mensagem.');
      }
      target.content = 'Mensagem removida';
      target.deletedAt = new Date().toISOString();
    });
    response.status(204).end();
  });

  return router;
}
