import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { noteInput } from '@gc/shared';
import type { JsonStore } from '../db/json-store';
import type { SessionStore } from '../auth/session-store';
import { assertActiveMember, authenticatedUserId, requireAuth } from '../middleware/auth';
import { ApiError, parseInput } from '../middleware/errors';

export function notesRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use('/notes', requireAuth(store, sessions, false));
  router.get('/notes', (request, response) => {
    const id = authenticatedUserId(request);
    response.json({ data: (store.snapshot().notes ?? []).filter(note => note.userId === id).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)) });
  });
  router.post('/notes', async (request, response) => {
    const userId = authenticatedUserId(request); const input = parseInput(noteInput, request.body); const id = randomUUID(); const now = new Date().toISOString();
    const db = await store.mutate(draft => { assertActiveMember(draft, userId); (draft.notes ??= []).push({ ...input, id, userId, createdAt: now, updatedAt: now }); });
    response.status(201).json({ data: db.notes!.find(note => note.id === id) });
  });
  router.patch('/notes/:id', async (request, response) => {
    const userId = authenticatedUserId(request); const input = parseInput(noteInput, request.body);
    const db = await store.mutate(draft => {
      assertActiveMember(draft, userId);
      const note = draft.notes?.find(item => item.id === request.params.id && item.userId === userId);
      if (!note) throw new ApiError(404, 'NOTE_NOT_FOUND', 'Anotação não encontrada.');
      Object.assign(note, input, { updatedAt: new Date().toISOString() });
    });
    response.json({ data: db.notes!.find(note => note.id === request.params.id) });
  });
  router.delete('/notes/:id', async (request, response) => {
    const userId = authenticatedUserId(request);
    await store.mutate(draft => {
      assertActiveMember(draft, userId);
      if (!draft.notes?.some(item => item.id === request.params.id && item.userId === userId)) throw new ApiError(404, 'NOTE_NOT_FOUND', 'Anotação não encontrada.');
      draft.notes = draft.notes.filter(item => item.id !== request.params.id);
    });
    response.status(204).end();
  });
  return router;
}
