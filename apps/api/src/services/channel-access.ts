import type { Channel, DemoDatabase } from '@gc/shared';
import { hasPermission } from '@gc/shared';

export function canViewChannel(database: DemoDatabase, userId: string, channel: Channel): boolean {
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!user || user.memberStatus !== 'active') return false;
  if (channel.type !== 'private') return true;
  if (channel.allowedUserIds?.includes(userId)) return true;
  return channel.allowedRoleIds.includes(user.roleId) && hasPermission(database, userId, 'VIEW_PRIVATE_CHANNELS');
}

export function canPostChannel(database: DemoDatabase, userId: string, channel: Channel): boolean {
  if (!canViewChannel(database, userId, channel)) return false;
  return channel.type !== 'announcement' || hasPermission(database, userId, 'POST_ANNOUNCEMENTS');
}
