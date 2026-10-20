// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { App } from '../../apps/web/src/App';
import { memberUser, meSuccessFixture } from './fixtures';

it('mostra solicitações recebidas e permite ignorar e depois recusar', async () => {
  localStorage.setItem('gc_demo_token', 'token');
  let status = 'pending';
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/auth/me') return new Response(JSON.stringify(meSuccessFixture(memberUser)));
    if (init?.method === 'PATCH') status = JSON.parse(String(init.body)).action === 'ignore' ? 'ignored' : 'rejected';
    const item = { id: 'r1', kind: 'direct', requesterName: 'Ana Silva', recipientName: 'Pedro Santos', title: 'Conversa direta', communityName: 'SENAC Tech', status, createdAt: '2026-09-22T12:00:00.000Z' };
    return new Response(JSON.stringify({ data: init?.method === 'PATCH' ? item : { incoming: [item], outgoing: [] } }));
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialPath="/solicitacoes" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Ignorar' }));
  expect(await screen.findByText('Ignorada')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Recusar' }));
  expect(await screen.findByText('Recusada')).toBeInTheDocument();
});

it('cria anotação pessoal com checklist e mostra o card salvo', async () => {
  localStorage.setItem('gc_demo_token', 'token');
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/auth/me') return new Response(JSON.stringify(meSuccessFixture(memberUser)));
    return new Response(JSON.stringify({ data: init?.method === 'POST' ? { ...JSON.parse(String(init.body)), id: 'n1', userId: memberUser.id, createdAt: '2026-09-22T12:00:00.000Z', updatedAt: '2026-09-22T12:00:00.000Z' } : [] }));
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialPath="/anotacoes" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Nova anotação' }));
  await userEvent.type(screen.getByLabelText('Título'), 'Ensaio da banca');
  await userEvent.type(screen.getByLabelText('Anotação'), '**Revisar** as comunidades');
  await userEvent.type(screen.getByLabelText('Checklist (um item por linha)'), 'Abrir o GC\nTestar as contas');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar anotação' }));
  expect(await screen.findByRole('heading', { name: 'Ensaio da banca' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Abrir o GC' })).toBeInTheDocument();
  expect(screen.getByText('Revisar').tagName).toBe('STRONG');
});
