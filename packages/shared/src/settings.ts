import type { UserPreferences } from './types';

export const AUTO_REPLY_TIME_ZONES = [
  'America/Sao_Paulo', 'America/Manaus', 'America/Rio_Branco', 'America/Noronha', 'Europe/Lisbon', 'UTC',
] as const;

export const DEFAULT_USER_PREFERENCES = {
  autoReply: {
    enabled: false,
    message: 'Olá! Recebi sua mensagem e respondo assim que puder.',
    timeZone: 'America/Sao_Paulo' as const,
  },
  sendOnEnter: false,
  compactSidebar: false,
} satisfies UserPreferences;
