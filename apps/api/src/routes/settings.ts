import { Router } from 'express';
import { settingsUpdateInput, userPreferencesSchema } from '@gc/shared';
import type { JsonStore } from '../db/json-store';
import type { SessionStore } from '../auth/session-store';
import { assertActiveMember, authenticatedUserId, requireAuth } from '../middleware/auth';
import { parseInput } from '../middleware/errors';
import { settingsView, userPreferences } from '../services/user-settings';

export function settingsRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use('/settings', requireAuth(store, sessions, false));

  router.get('/settings', (request, response) => {
    response.json({ data: settingsView(store.snapshot(), authenticatedUserId(request)) });
  });

  router.patch('/settings', async (request, response) => {
    const userId = authenticatedUserId(request);
    const input = parseInput(settingsUpdateInput, request.body);
    const database = await store.mutate(draft => {
      assertActiveMember(draft, userId);
      const user = draft.users.find(candidate => candidate.id === userId)!;
      if (input.profile) Object.assign(user, input.profile);
      if (input.preferences) {
        const current = userPreferences(draft, userId);
        const preferences = parseInput(userPreferencesSchema, {
          ...current, ...input.preferences,
          autoReply: { ...current.autoReply, ...input.preferences.autoReply },
        });
        const settings = draft.userSettings ??= [];
        const existing = settings.find(item => item.userId === userId);
        if (existing) existing.preferences = preferences;
        else settings.push({ userId, preferences });
      }
    });
    response.json({ data: settingsView(database, userId) });
  });
  return router;
}
