import { describe, expect, it } from 'vitest';
import { canManageEvent, canModerateMember, hasPermission } from '@gc/shared';
import { databaseFixture } from '../fixtures/database-fixture';

describe('regras de permissão', () => {
  it('impede que uma mudança na hierarquia permita moderar cargos protegidos', () => {
    const db = databaseFixture();
    expect(canModerateMember(db, 'user-moderator', 'user-member')).toBe(true);
    expect(canModerateMember(db, 'user-moderator', 'user-organizer')).toBe(false);
    expect(canModerateMember(db, 'user-admin', 'user-owner')).toBe(false);
  });

  it('impede que o organizador altere evento criado por outra pessoa', () => {
    const db = databaseFixture();
    const own = db.events.find((event) => event.id === 'event-organizer')!;
    const other = db.events.find((event) => event.id === 'event-admin')!;
    expect(canManageEvent(db, 'user-organizer', own)).toBe(true);
    expect(canManageEvent(db, 'user-organizer', other)).toBe(false);
  });

  it('nega a ação quando a permissão não estiver atribuída ao cargo', () => {
    const db = databaseFixture();
    expect(hasPermission(db, 'user-admin', 'MANAGE_ROLES')).toBe(true);
    expect(hasPermission(db, 'user-member', 'MANAGE_ROLES')).toBe(false);
  });
});
