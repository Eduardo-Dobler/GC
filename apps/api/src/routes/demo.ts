import { resetInput } from '@gc/shared';
import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { requireAuth } from '../middleware/auth';
import { parseInput } from '../middleware/errors';

export function demoRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.post('/demo/reset', requireAuth(store, sessions, false), async (request, response) => {
    parseInput(resetInput, request.body);
    await store.reset();
    sessions.clear();
    response.json({ data: { restored: true } });
  });
  return router;
}
