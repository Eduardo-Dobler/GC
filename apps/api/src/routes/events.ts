import { randomUUID } from 'node:crypto';
import {
  attendanceInput,
  canManageEvent,
  eventInput,
  eventPatchInput,
  hasPermission,
  type CommunityEvent,
  type DemoDatabase,
  type EventView,
} from '@gc/shared';
import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { assertActiveMember, authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';
import { toPublicUser } from '../services/public-user';

function toEventView(database: DemoDatabase, userId: string, event: CommunityEvent): EventView {
  const creator = database.users.find((candidate) => candidate.id === event.createdBy);
  if (!creator) throw new ApiError(500, 'INVALID_DATA', 'Criador do evento não encontrado.');
  const participants = database.eventParticipants.filter((item) => item.eventId === event.id);
  return {
    ...event,
    creator: toPublicUser(database, creator),
    attendance: {
      going: participants.filter((item) => item.status === 'going').length,
      notGoing: participants.filter((item) => item.status === 'not_going').length,
      current: participants.find((item) => item.userId === userId)?.status ?? null,
    },
  };
}

function assertChronology(startsAt: string, endsAt: string) {
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new ApiError(400, 'INVALID_EVENT_DATES', 'O término precisa ser posterior ao início.');
  }
}

export function eventsRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use(requireAuth(store, sessions));

  router.get('/events', (request, response) => {
    const userId = authenticatedUserId(request);
    const database = store.snapshot();
    const period = typeof request.query.period === 'string' ? request.query.period : 'upcoming';
    const category = typeof request.query.category === 'string' ? request.query.category.trim().toLowerCase() : '';
    const now = Date.now();

    let events = database.events.filter((event) => {
      if (period === 'past') return new Date(event.endsAt).getTime() < now;
      if (period === 'all') return true;
      return new Date(event.endsAt).getTime() >= now;
    });
    if (category) events = events.filter((event) => event.category.toLowerCase() === category);

    response.json({
      data: events
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
        .map((event) => toEventView(database, userId, event)),
    });
  });

  router.post('/events', async (request, response) => {
    const userId = authenticatedUserId(request);
    const input = parseInput(eventInput, request.body);
    assertChronology(input.startsAt, input.endsAt);
    const id = randomUUID();
    const now = new Date().toISOString();
    const database = await store.mutate((draft) => {
      if (!hasPermission(draft, userId, 'CREATE_EVENTS')) {
        throw new ApiError(403, 'FORBIDDEN', 'Seu cargo não permite criar eventos.');
      }
      draft.events.push({
        id,
        ...input,
        recurrence: input.recurring ? (input.recurrence ?? 'weekly') : null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });
    const event = database.events.find((candidate) => candidate.id === id)!;
    response.status(201).json({ data: toEventView(database, userId, event) });
  });

  router.patch('/events/:eventId', async (request, response) => {
    const userId = authenticatedUserId(request);
    const input = parseInput(eventPatchInput, request.body);
    const eventId = request.params.eventId;
    const database = await store.mutate((draft) => {
      const target = draft.events.find((candidate) => candidate.id === eventId);
      if (!target) throw new ApiError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
      if (!canManageEvent(draft, userId, target)) throw new ApiError(403, 'FORBIDDEN', 'Você não pode editar este evento.');
      const merged = parseInput(eventInput, { ...target, ...input });
      assertChronology(merged.startsAt, merged.endsAt);
      Object.assign(target, merged, {
        recurrence: merged.recurring ? (merged.recurrence ?? 'weekly') : null,
        updatedAt: new Date().toISOString(),
      });
    });
    response.json({ data: toEventView(database, userId, database.events.find((candidate) => candidate.id === eventId)!) });
  });

  router.delete('/events/:eventId', async (request, response) => {
    const userId = authenticatedUserId(request);
    await store.mutate((draft) => {
      const event = draft.events.find((candidate) => candidate.id === request.params.eventId);
      if (!event) throw new ApiError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
      if (!canManageEvent(draft, userId, event)) throw new ApiError(403, 'FORBIDDEN', 'Você não pode excluir este evento.');
      draft.events = draft.events.filter((candidate) => candidate.id !== event.id);
      draft.eventParticipants = draft.eventParticipants.filter((item) => item.eventId !== event.id);
    });
    response.status(204).end();
  });

  router.put('/events/:eventId/attendance', async (request, response) => {
    const userId = authenticatedUserId(request);
    const input = parseInput(attendanceInput, request.body);
    const eventId = request.params.eventId;
    const now = new Date().toISOString();
    const database = await store.mutate((draft) => {
      assertActiveMember(draft, userId);
      const event = draft.events.find((candidate) => candidate.id === eventId);
      if (!event) throw new ApiError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
      const existing = draft.eventParticipants.find((item) => item.eventId === event.id && item.userId === userId);
      if (existing) {
        existing.status = input.status;
        existing.updatedAt = now;
      } else {
        draft.eventParticipants.push({ id: randomUUID(), eventId: event.id, userId, status: input.status, updatedAt: now });
      }
    });
    response.json({ data: toEventView(database, userId, database.events.find((candidate) => candidate.id === eventId)!) });
  });

  return router;
}
