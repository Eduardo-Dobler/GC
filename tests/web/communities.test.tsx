// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../apps/web/src/App';
import { dashboardFixture, memberUser, ownerUser } from './fixtures';

const primary = { id: 'community-senac-tech', name: 'SENAC Tech', description: 'Tecnologia e aprendizado', createdAt: '2026-09-15T11:00:00.000Z' };
const social = { ...primary, id: 'basket', name: 'Basquete de Sábado' };
const summaries = [primary, social].map(community => ({ community, category: 'Convívio', accent: '#ff6a00', memberIds: [memberUser.id], memberCount: 1, isMember: true, sharedMembers: [], role: memberUser.role }));
function response(data: unknown) { return new Response(JSON.stringify({ data }), { status: 200 }); }

describe('comunidades na interface', () => {
  it('troca o espaço e atualiza o cargo, o cabeçalho e o contexto das próximas consultas', async () => {
    localStorage.setItem('gc_demo_token', 'token');
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/auth/me') return response({ user: memberUser, permissions: [], activeCommunity: primary });
      if (url === '/api/communities') return response({ communities: summaries, people: [], connections: [] });
      if (url === '/api/communities/basket/session') return response({ user: { ...memberUser, role: ownerUser.role }, permissions: ownerUser.role.permissions, activeCommunity: social });
      if (url === '/api/dashboard') return response({ ...dashboardFixture().data, community: social });
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App initialPath="/comunidades" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir Basquete de Sábado' }));
    expect(await screen.findByText('Olá, Pedro')).toBeInTheDocument();
    expect(localStorage.getItem('gc_active_community')).toBe('basket');
    expect(document.querySelector('.user-menu__text')).toHaveTextContent('Dono');
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/dashboard') as unknown as [string, RequestInit];
    expect(new Headers(call[1].headers).get('X-Community-Id')).toBe('basket');
  });

  it('mostra descrições dos cargos e vínculos nos atalhos de login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response([{ ...memberUser, memberships: [{ community: social, role: memberUser.role, roleDescription: 'Participa das conversas e atividades', category: 'Esporte' }] }])));
    render(<App />);
    expect(await screen.findByText('Basquete de Sábado')).toBeInTheDocument();
    expect(screen.getByText('Participa das conversas e atividades')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar como Pedro Santos/i })).toBeInTheDocument();
  });

  it('cria comunidade com participantes escolhidos e abre o novo espaço', async () => {
    localStorage.setItem('gc_demo_token', 'token');
    const created = { ...social, id: 'new', name: 'Clube de cinema' };
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/api/auth/me') return response({ user: memberUser, permissions: [], activeCommunity: primary });
      if (url === '/api/communities' && options?.method === 'POST') return response({ community: created });
      if (url === '/api/communities') return response({ communities: summaries, people: [], connections: [] });
      if (url === '/api/people') return response([memberUser, ownerUser]);
      if (url === '/api/communities/new/session') return response({ user: { ...memberUser, role: ownerUser.role }, permissions: ownerUser.role.permissions, activeCommunity: created });
      if (url === '/api/dashboard') return response({ ...dashboardFixture().data, community: created });
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App initialPath="/comunidades" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Nova comunidade' }));
    await userEvent.type(screen.getByLabelText('Nome da comunidade'), 'Clube de cinema');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Encontros para conversar sobre filmes.');
    await userEvent.click(await screen.findByRole('checkbox', { name: /Carlos Barbosa/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Criar comunidade' }));
    await screen.findByText('Olá, Pedro');
    const call = fetchMock.mock.calls.find(([url, options]) => url === '/api/communities' && options?.method === 'POST');
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ name: 'Clube de cinema', memberIds: ['user-owner'] });
    await waitFor(() => expect(localStorage.getItem('gc_active_community')).toBe('new'));
  });
});
