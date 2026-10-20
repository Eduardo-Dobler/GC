import type { DemoDatabase } from '@gc/shared';
import { ApiError } from '../middleware/errors';

export function selectedParticipants(database: DemoDatabase, actorId: string, selectedIds: string[]): string[] {
  const others = [...new Set(selectedIds)].filter((id) => id !== actorId);
  if (!others.length) throw new ApiError(400, 'INVALID_PARTICIPANTS', 'Selecione pelo menos outra pessoa.');
  if (others.some((id) => !database.users.some((user) => user.id === id && user.memberStatus === 'active'))) {
    throw new ApiError(400, 'INVALID_PARTICIPANTS', 'Selecione apenas pessoas ativas da comunidade.');
  }
  return [actorId, ...others];
}
