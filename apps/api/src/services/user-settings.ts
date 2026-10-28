import { DEFAULT_USER_PREFERENCES, type DemoDatabase, type SettingsView, type UserPreferences } from '@gc/shared';
import { ApiError } from '../middleware/errors';

export function userPreferences(database: DemoDatabase, userId: string): UserPreferences {
  return structuredClone(database.userSettings?.find(item => item.userId === userId)?.preferences ?? DEFAULT_USER_PREFERENCES);
}

export function settingsView(database: DemoDatabase, userId: string): SettingsView {
  const user = database.users.find(item => item.id === userId);
  if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre novamente para continuar.');
  const { id, name, email, bio, status, avatarColor } = user;
  return { profile: { id, name, email, bio, status, avatarColor }, preferences: userPreferences(database, userId) };
}
