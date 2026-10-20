import type { CommunityEvent, DemoDatabase, Permission } from './types';

export const PERMISSIONS: Permission[] = [
  'VIEW_PRIVATE_CHANNELS',
  'POST_ANNOUNCEMENTS',
  'MODERATE_MESSAGES',
  'CREATE_EVENTS',
  'MANAGE_EVENTS',
  'MANAGE_MEMBERS',
  'MODERATE_MEMBERS',
  'MANAGE_ROLES',
  'CREATE_INVITES',
  'CREATE_CHANNELS',
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  VIEW_PRIVATE_CHANNELS: 'Acessar canais privados',
  POST_ANNOUNCEMENTS: 'Publicar avisos',
  MODERATE_MESSAGES: 'Moderar mensagens',
  CREATE_EVENTS: 'Criar eventos',
  MANAGE_EVENTS: 'Gerenciar todos os eventos',
  MANAGE_MEMBERS: 'Alterar cargos de membros',
  MODERATE_MEMBERS: 'Remover ou banir membros',
  MANAGE_ROLES: 'Criar e editar cargos',
  CREATE_INVITES: 'Criar convites',
  CREATE_CHANNELS: 'Criar canais',
};

export function hasPermission(
  database: DemoDatabase,
  userId: string,
  permission: Permission,
): boolean {
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!user || user.memberStatus !== 'active') return false;
  const role = database.roles.find((candidate) => candidate.id === user.roleId);
  return role?.permissions.includes(permission) ?? false;
}

export function canModerateMember(
  database: DemoDatabase,
  actorId: string,
  targetId: string,
): boolean {
  if (actorId === targetId) return false;

  const actor = database.users.find((candidate) => candidate.id === actorId);
  const target = database.users.find((candidate) => candidate.id === targetId);
  if (!actor || !target || target.roleId === 'role-owner') return false;
  if (!hasPermission(database, actorId, 'MODERATE_MEMBERS')) return false;

  if (actor.roleId === 'role-owner' || actor.roleId === 'role-admin') return true;
  return actor.roleId === 'role-moderator' && target.roleId === 'role-member';
}

export function canManageEvent(
  database: DemoDatabase,
  actorId: string,
  event: CommunityEvent,
): boolean {
  if (hasPermission(database, actorId, 'MANAGE_EVENTS')) return true;
  return event.createdBy === actorId && hasPermission(database, actorId, 'CREATE_EVENTS');
}
