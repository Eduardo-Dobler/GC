import { z } from 'zod';
import { PERMISSIONS } from './permissions';
import { normalizeGoogleMapsEmbedUrl, normalizeGoogleMapsUrl } from './maps';

const isoDate = z.string().datetime({ offset: true });
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Informe uma cor hexadecimal válida.');
const permission = z.enum(PERMISSIONS as [typeof PERMISSIONS[number], ...typeof PERMISSIONS]);

const mapsUrl = z.string().trim().max(4096).transform((value, context) => {
  const normalized = normalizeGoogleMapsUrl(value);
  if (normalized !== null) return normalized;
  context.addIssue({ code: z.ZodIssueCode.custom, message: 'Cole um link HTTPS de localização do Google Maps.' });
  return z.NEVER;
});
const mapsEmbedUrl = z.string().trim().max(16000).transform((value, context) => {
  const normalized = normalizeGoogleMapsEmbedUrl(value);
  if (normalized !== null) return normalized;
  context.addIssue({ code: z.ZodIssueCode.custom, message: 'No Google Maps, copie o HTML em Compartilhar > Incorporar um mapa, ou cole a URL de incorporação.' });
  return z.NEVER;
});

const roleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color,
  rank: z.number().int(),
  system: z.boolean(),
  permissions: z.array(permission),
});

const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  roleId: z.string().min(1),
  bio: z.string(),
  avatarColor: color.optional(),
  status: z.enum(['online', 'away', 'offline']),
  memberStatus: z.enum(['active', 'banned', 'removed']),
  joinedAt: isoDate,
  lastActiveAt: isoDate,
  activity: z.array(z.object({ label: z.string(), date: isoDate })),
  passwordSalt: z.string().min(1),
  passwordHash: z.string().min(1),
});

const baseDatabaseSchema = z.object({
  schemaVersion: z.literal(1),
  community: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    createdAt: isoDate,
  }),
  users: z.array(userSchema),
  roles: z.array(roleSchema),
  channels: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    type: z.enum(['text', 'announcement', 'private']),
    order: z.number().int(),
    allowedRoleIds: z.array(z.string()),
    allowedUserIds: z.array(z.string()).default([]),
    createdBy: z.string().optional(),
  })),
  messages: z.array(z.object({
    id: z.string(), channelId: z.string(), authorId: z.string(), content: z.string(),
    createdAt: isoDate, updatedAt: isoDate.nullable(), deletedAt: isoDate.nullable(),
  })),
  directThreads: z.array(z.object({
    id: z.string(), name: z.string().optional(), participantIds: z.array(z.string()).min(2).max(100), updatedAt: isoDate,
  })),
  directMessages: z.array(z.object({
    id: z.string(), threadId: z.string(), authorId: z.string(), content: z.string(), createdAt: isoDate,
  })),
  events: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    startsAt: isoDate,
    locationDescription: z.string().default(''),
    googleMapsUrl: mapsUrl.default(''),
    googleMapsEmbedUrl: mapsEmbedUrl.default(''),
    endsAt: isoDate,
    category: z.string(),
    color,
    recurring: z.boolean(),
    recurrence: z.enum(['weekly', 'monthly']).nullable(),
    createdBy: z.string(),
    invitedUserIds: z.array(z.string()),
    createdAt: isoDate,
    updatedAt: isoDate,
  })),
  eventParticipants: z.array(z.object({
    id: z.string(), eventId: z.string(), userId: z.string(),
    status: z.enum(['going', 'not_going']), updatedAt: isoDate,
  })),
  invites: z.array(z.object({
    id: z.string(), code: z.string(), link: z.string(), createdBy: z.string(),
    createdAt: isoDate, expiresAt: isoDate, maxUses: z.number().int().positive(),
    uses: z.number().int().nonnegative(), revokedAt: isoDate.nullable(),
  })),
  auditLogs: z.array(z.object({
    id: z.string(), actorId: z.string(), action: z.string(), targetType: z.string(),
    targetId: z.string(), details: z.string(), createdAt: isoDate,
  })),
  communityDirectory: z.array(z.object({
    community: z.object({ id: z.string().min(1), name: z.string().min(1), description: z.string(), createdAt: isoDate }),
    category: z.string().min(1),
    accent: color,
    createdBy: z.string().min(1),
    memberIds: z.array(z.string().min(1)),
  })).optional(),
  demoAccountIds: z.array(z.string().min(1)).optional(),
});

export const noteInput = z.object({
  title: z.string().trim().min(1, 'Informe um título.').max(80),
  content: z.string().max(12000).default(''),
  color: color.default('#ff6a00'),
  pinned: z.boolean().default(false),
  checklist: z.array(z.object({ text: z.string().trim().min(1).max(200), done: z.boolean() })).max(100).default([]),
  table: z.array(z.array(z.string().max(300)).max(8)).max(20).default([]),
  locationDescription: z.string().trim().max(500).default(''),
  googleMapsUrl: mapsUrl.default(''),
});
export const requestActionInput = z.object({ action: z.enum(['accept', 'reject', 'ignore']) });

export const demoDatabaseSchema = baseDatabaseSchema.extend({
  accessPolicyVersion: z.literal(1).optional(),
  notes: z.array(noteInput.extend({ id: z.string(), userId: z.string(), createdAt: isoDate, updatedAt: isoDate })).default([]),
  accessRequests: z.array(z.object({
    id: z.string(), kind: z.enum(['direct', 'channel']), requesterId: z.string(), recipientId: z.string(),
    communityId: z.string(), targetId: z.string(), title: z.string(), participantIds: z.array(z.string()),
    status: z.enum(['pending', 'ignored', 'accepted', 'rejected']), createdAt: isoDate, updatedAt: isoDate,
  })).default([]),
  primaryMemberStatuses: z.record(z.enum(['active', 'banned', 'removed'])).optional(),
  communitySpaces: z.array(z.object({
    community: baseDatabaseSchema.shape.community,
    memberships: z.array(z.object({ userId: z.string(), roleId: z.string(), memberStatus: z.enum(['active', 'banned', 'removed']) })),
    roles: baseDatabaseSchema.shape.roles,
    channels: baseDatabaseSchema.shape.channels,
    messages: baseDatabaseSchema.shape.messages,
    events: baseDatabaseSchema.shape.events,
    eventParticipants: baseDatabaseSchema.shape.eventParticipants,
    invites: baseDatabaseSchema.shape.invites,
    auditLogs: baseDatabaseSchema.shape.auditLogs,
  })).optional(),
});

export const communityInput = z.object({
  name: z.string().trim().min(3, 'Informe um nome com pelo menos 3 caracteres.').max(70),
  description: z.string().trim().min(3, 'Descreva a comunidade.').max(240),
  category: z.string().trim().min(2).max(40),
  accent: color.default('#ff6a00'),
  memberIds: z.array(z.string().min(1)).max(99).default([]),
});

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

export const registerInput = z.object({
  name: z.string().trim().min(3, 'Informe pelo menos 3 caracteres.').max(60),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(72),
});

export const messageInput = z.object({
  content: z.string().trim().min(1, 'Digite uma mensagem.').max(500, 'Use até 500 caracteres.'),
});

export const directThreadInput = z.object({
  participantIds: z.array(z.string().min(1)).min(1, 'Selecione pelo menos uma pessoa.').max(99),
  name: z.string().trim().max(80).optional(),
});

export const channelInput = z.object({
  name: z.string().trim().min(2, 'Use pelo menos 2 caracteres no nome.').max(40),
  description: z.string().trim().max(200).default(''),
  type: z.enum(['text', 'private']),
  allowedUserIds: z.array(z.string().min(1)).max(99).default([]),
});

export const eventInput = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(3).max(500),
  locationDescription: z.string().trim().max(1000).default(''),
  googleMapsUrl: mapsUrl.default(''),
  googleMapsEmbedUrl: mapsEmbedUrl.default(''),
  startsAt: isoDate,
  endsAt: isoDate,
  category: z.string().trim().min(2).max(40),
  color,
  recurring: z.boolean(),
  recurrence: z.enum(['weekly', 'monthly']).nullable().optional(),
  invitedUserIds: z.array(z.string()).default([]),
});

export const eventPatchInput = eventInput.partial();

export const attendanceInput = z.object({
  status: z.enum(['going', 'not_going']),
});

export const roleInput = z.object({
  name: z.string().trim().min(2).max(40),
  color,
  permissions: z.array(permission),
});

export const memberRoleInput = z.object({ roleId: z.string().min(1) });

export const moderationInput = z.object({
  action: z.enum(['remove', 'ban']),
  reason: z.string().trim().min(3).max(200),
});

export const inviteInput = z.object({
  maxUses: z.number().int().min(1).max(100),
  expiresInDays: z.number().int().min(1).max(365),
});

export const resetInput = z.object({ confirmation: z.literal('RESTAURAR') });
