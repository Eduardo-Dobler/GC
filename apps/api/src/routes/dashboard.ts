import { Router } from 'express';
import type { SessionStore } from '../auth/session-store';
import type { JsonStore } from '../db/json-store';
import { authenticatedUserId, requireAuth } from '../middleware/auth';
import { canViewChannel } from '../services/channel-access';
import { toPublicUser } from '../services/public-user';
import { findCommunity } from '../services/communities';

export function dashboardRouter(store: JsonStore, sessions: SessionStore): Router {
  const router = Router();
  router.use(requireAuth(store, sessions));

  router.get('/dashboard', (request, response) => {
    const userId = authenticatedUserId(request);
    const database = store.snapshot();
    const activeCommunity = findCommunity(database, request.communityId);
    const announcements = database.messages
      .filter((message) => database.channels.some(channel => channel.id === message.channelId && channel.type === 'announcement') && !message.deletedAt)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 3)
      .map((message) => ({
        ...message,
        author: toPublicUser(database, database.users.find((user) => user.id === message.authorId)!),
      }));
    const upcomingEvents = database.events
      .filter((event) => new Date(event.endsAt).getTime() >= Date.now())
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
      .slice(0, 3)
      .map((event) => ({
        ...event,
        participantCount: database.eventParticipants.filter((item) => item.eventId === event.id && item.status === 'going').length,
      }));
    const onlineMembers = database.users
      .filter((user) => user.memberStatus === 'active' && user.status !== 'offline' && activeCommunity.memberIds.includes(user.id))
      .map((user) => toPublicUser(database, user));
    const channelShortcuts = database.channels
      .filter((channel) => canViewChannel(database, userId, channel))
      .sort((left, right) => left.order - right.order);

    response.json({
      data: {
        community: activeCommunity.community,
        stats: {
          members: activeCommunity.memberIds.length,
          channels: channelShortcuts.length,
          events: database.events.filter((event) => new Date(event.endsAt).getTime() >= Date.now()).length,
          online: onlineMembers.length,
        },
        announcements,
        upcomingEvents,
        onlineMembers,
        channelShortcuts,
      },
    });
  });

  return router;
}
