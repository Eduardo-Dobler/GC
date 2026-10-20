import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoDatabaseSchema } from '@gc/shared';
import { verifyPassword } from '../../apps/api/src/auth/password';

describe('dados iniciais da demonstração', () => {
  it('mantém todos os cenários e contas rápidas necessários à apresentação', async () => {
    const raw = await readFile(resolve('data/seed.json'), 'utf8');
    const database = demoDatabaseSchema.parse(JSON.parse(raw));

    expect(database.community.name).toBe('Comunidade SENAC Tech');
    expect(database.roles.map((role) => role.name)).toEqual([
      'Dono',
      'Administrador',
      'Moderador',
      'Organizador de Eventos',
      'Membro',
    ]);
    expect(database.channels.map((channel) => channel.name)).toEqual([
      'avisos',
      'chat-geral',
      'duvidas',
      'eventos',
      'equipe',
      'equipe-senac-tech',
    ]);
    expect(database.users).toHaveLength(12);
    expect(database.communityDirectory).toHaveLength(6);
    expect(database.communitySpaces).toHaveLength(5);
    expect(database.communitySpaces?.every(space => space.events.length > 0 && space.channels.length >= 2)).toBe(true);
    expect(database.messages.length).toBeGreaterThanOrEqual(12);
    expect(database.directThreads).toHaveLength(3);
    expect(database.directMessages.length).toBeGreaterThanOrEqual(6);
    expect(database.events).toHaveLength(4);
    expect(database.events.every((event) => event.locationDescription?.includes('SENAC Caxias do Sul'))).toBe(true);
    expect(database.events.every((event) => event.googleMapsUrl?.includes('google.com/maps/search'))).toBe(true);
    expect(database.invites).toHaveLength(2);
    expect(database.notes).toHaveLength(3);
    expect(database.notes?.some(note => note.userId === 'user-owner' && note.table.length > 0 && note.checklist.length > 0)).toBe(true);
    expect(database.accessRequests).toHaveLength(3);
    expect(database.accessRequests?.some(item => item.kind === 'direct' && item.requesterId === 'user-member' && item.recipientId === 'user-owner' && item.status === 'pending')).toBe(true);
    expect(database.accessRequests?.some(item => item.kind === 'channel' && item.targetId === 'channel-demo-pending' && item.status === 'pending')).toBe(true);
    expect(database.accessRequests?.some(item => item.kind === 'direct' && item.status === 'accepted')).toBe(true);
    expect(database.channels.some(channel => channel.id === 'channel-demo-pending' && channel.type === 'private')).toBe(true);
    expect(database.roles.find(role => role.id === 'role-owner')?.permissions).toContain('CREATE_CHANNELS');
    expect(database.roles.find(role => role.id === 'role-member')?.permissions).not.toContain('CREATE_CHANNELS');
    expect(database.users.every((user) => verifyPassword('demo123', user.passwordSalt, user.passwordHash))).toBe(true);
  });
});
