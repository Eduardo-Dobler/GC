import { randomUUID } from 'node:crypto';
import type { AccessRequest, DemoDatabase } from '@gc/shared';
import { ApiError } from '../middleware/errors';
import { directory } from './communities';
import { projectCommunity } from './community-space';

export function needsConsent(database: DemoDatabase, actorId: string, recipientId: string, preferredId?: string): boolean {
  const entries = directory(database);
  const preferred = entries.find(entry => entry.community.id === preferredId && entry.memberIds.includes(actorId));
  const entry = preferred?.memberIds.includes(recipientId) ? preferred : entries.find(item => item.memberIds.includes(actorId) && item.memberIds.includes(recipientId));
  if (!entry) return true;
  const local = projectCommunity(database, entry.community.id);
  const rank = (id: string) => local.roles.find(role => role.id === local.users.find(user => user.id === id)?.roleId)?.rank ?? 0;
  return rank(recipientId) > rank(actorId);
}

export function addAccessRequest(database: DemoDatabase, values: Omit<AccessRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): AccessRequest {
  const requests = database.accessRequests ??= [];
  if (requests.some(item => item.kind === values.kind && item.requesterId === values.requesterId && item.recipientId === values.recipientId && (item.status === 'pending' || item.status === 'ignored') && (values.kind === 'direct' || item.targetId === values.targetId))) {
    throw new ApiError(409, 'REQUEST_PENDING', 'Já existe uma solicitação pendente para essa pessoa. Aguarde a resposta; só é possível solicitar novamente após uma recusa.');
  }
  const now = new Date().toISOString();
  const created: AccessRequest = { ...values, id: randomUUID(), status: 'pending', createdAt: now, updatedAt: now };
  requests.push(created);
  return created;
}
