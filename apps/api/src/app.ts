import { requestsRouter } from './routes/requests';
import { notesRouter } from './routes/notes';
import { requireAuth } from './middleware/auth';
import express, { type Express } from 'express';
import { resolve } from 'node:path';
import type { SessionStore } from './auth/session-store';
import type { JsonStore } from './db/json-store';
import { errorHandler, notFoundHandler } from './middleware/errors';
import { authRouter } from './routes/auth';
import { channelsRouter } from './routes/channels';
import { directMessagesRouter } from './routes/direct-messages';
import { eventsRouter } from './routes/events';
import { dashboardRouter } from './routes/dashboard';
import { demoRouter } from './routes/demo';
import { invitesRouter } from './routes/invites';
import { membersRouter } from './routes/members';
import { rolesRouter } from './routes/roles';
import { communitiesRouter } from './routes/communities';

export interface CreateAppOptions {
  store: JsonStore;
  sessions: SessionStore;
  staticDir?: string;
}

export function createApp({ store, sessions, staticDir }: CreateAppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ data: { status: 'ok', mode: 'offline', schemaVersion: 1 } });
  });
  app.use('/api/auth', authRouter(store, sessions));
  app.use('/api', communitiesRouter(store, sessions));
  app.use('/api', requestsRouter(store, sessions));
  app.use('/api', notesRouter(store, sessions));
  app.use('/api', directMessagesRouter(store, sessions));
  app.use('/api', demoRouter(store, sessions));
  app.use('/api', requireAuth(store, sessions), (request, _response, next) => store.withCommunity(request.communityId!, next));
  app.use('/api', channelsRouter(store, sessions));
  app.use('/api', eventsRouter(store, sessions));
  app.use('/api', dashboardRouter(store, sessions));
  app.use('/api', membersRouter(store, sessions));
  app.use('/api', rolesRouter(store, sessions));
  app.use('/api', invitesRouter(store, sessions));
  app.use('/api', notFoundHandler);

  if (staticDir) {
    app.use(express.static(staticDir));
    app.use((request, response, next) => {
      if (request.method !== 'GET') { next(); return; }
      response.sendFile(resolve(staticDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
