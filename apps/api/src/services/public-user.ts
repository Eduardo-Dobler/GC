import type { DemoDatabase, PublicUser, User } from '@gc/shared';

export function toPublicUser(database: DemoDatabase, user: User): PublicUser {
  const { passwordHash: _passwordHash, passwordSalt: _passwordSalt, ...safeUser } = user;
  const role = database.roles.find((candidate) => candidate.id === user.roleId);
  if (!role) throw new Error(`Cargo não encontrado para ${user.id}.`);
  return { ...safeUser, role };
}
