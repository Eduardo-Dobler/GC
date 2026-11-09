// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PREFERENCES, type DirectThreadView, type UserPreferences } from '@gc/shared';
import { App } from '../../apps/web/src/App';
import { DirectConversation } from '../../apps/web/src/features/messages/DirectConversation';
import { memberUser, ownerUser } from './fixtures';

afterEach(() => { vi.unstubAllGlobals(); document.body.style.overflow = ''; });

function settingsMock(failSave = false) {
  const state = { user: structuredClone(memberUser), preferences: structuredClone(DEFAULT_USER_PREFERENCES) as UserPreferences };
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/auth/me') return Response.json({ data: { user: state.user, permissions: state.user.role.permissions, preferences: state.preferences } });
    if (url === '/api/settings' && init?.method === 'PATCH') {
      if (failSave) return Response.json({ error: { code: 'SAVE_FAILED', message: 'Não foi possível gravar agora.' } }, { status: 500 });
      const input = JSON.parse(String(init.body));
      state.user = { ...state.user, ...input.profile };
      state.preferences = { ...state.preferences, ...input.preferences, autoReply: { ...state.preferences.autoReply, ...input.preferences?.autoReply } };
      return Response.json({ data: { profile: state.user, preferences: state.preferences } });
    }
    return Response.json({ data: [] });
  });
  localStorage.setItem('gc_demo_token', 'token');
  vi.stubGlobal('fetch', fetchMock);
  return { state, fetchMock };
}

it('salva mensagem automática personalizada, perfil e preferências pela página Configurações', async () => {
  const { fetchMock, state } = settingsMock();
  render(<App initialPath="/configuracoes" />);
  expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: /Ativar resposta automática/ }));
  const message = screen.getByLabelText('Sua mensagem automática');
  await userEvent.clear(message); await userEvent.type(message, 'Estou na aula. Respondo no intervalo!');
  const name = screen.getByLabelText('Nome de exibição');
  await userEvent.clear(name); await userEvent.type(name, 'Pedro da turma');
  await userEvent.type(screen.getByLabelText('Status personalizado'), 'Em aula 📚');
  await userEvent.selectOptions(screen.getByLabelText('Status'), 'away');
  await userEvent.click(screen.getByRole('checkbox', { name: /Enviar mensagens com Enter/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
  expect(await screen.findByText('Configurações salvas.')).toBeInTheDocument();
  const save = fetchMock.mock.calls.find(([url, init]) => url === '/api/settings' && init?.method === 'PATCH')!;
  expect(JSON.parse(String(save[1]!.body))).toMatchObject({ profile: { name: 'Pedro da turma', status: 'away', statusMessage: 'Em aula 📚' }, preferences: { autoReply: { enabled: true, message: 'Estou na aula. Respondo no intervalo!' }, sendOnEnter: true } });
  expect(state.preferences.sendOnEnter).toBe(true);
  expect(screen.getByLabelText('Nome de exibição')).toHaveValue('Pedro da turma');
});

it('exibe falha de gravação e mantém o rascunho para nova tentativa', async () => {
  settingsMock(true);
  render(<App initialPath="/configuracoes" />);
  const message = await screen.findByLabelText('Sua mensagem automática');
  await userEvent.clear(message); await userEvent.type(message, 'Não perder este texto');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível gravar agora.');
  expect(message).toHaveValue('Não perder este texto');
  expect(screen.getByRole('button', { name: 'Salvar configurações' })).toBeEnabled();
});

it('aplica o tema imediatamente e descarta apenas as alterações ainda não salvas', async () => {
  settingsMock();
  render(<App initialPath="/configuracoes" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Escuro' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('gc_theme')).toBe('dark');
  await userEvent.click(screen.getByRole('checkbox', { name: /Ativar resposta automática/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Descartar alterações' }));
  expect(screen.getByRole('checkbox', { name: /Ativar resposta automática/ })).not.toBeChecked();
  expect(document.documentElement.dataset.theme).toBe('dark');
});

it('abre o menu móvel, fecha com Escape e devolve o foco ao botão', async () => {
  settingsMock();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  render(<App initialPath="/anotacoes" />);
  const open = await screen.findByRole('button', { name: 'Abrir menu' });
  expect(screen.queryByRole('link', { name: 'Configurações' })).not.toBeInTheDocument();
  await userEvent.click(open);
  expect(screen.getByRole('dialog', { name: 'Menu principal' })).toHaveAttribute('aria-modal', 'true');
  expect(document.body.style.overflow).toBe('hidden');
  expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveFocus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  expect(screen.getByRole('link', { name: 'Configurações' })).toHaveFocus();
  await userEvent.keyboard('{Tab}');
  expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog', { name: 'Menu principal' })).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
  expect(open).toHaveFocus();
  await userEvent.click(open);
  await userEvent.click(screen.getByRole('link', { name: 'Configurações' }));
  expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('recolhe e expande a barra lateral e mantém a opção de Configurações sincronizada', async () => {
  const { state } = settingsMock();
  render(<App initialPath="/configuracoes" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Recolher barra lateral' }));
  expect(await screen.findByRole('button', { name: 'Expandir barra lateral' })).toHaveAttribute('aria-expanded', 'false');
  expect(state.preferences.compactSidebar).toBe(true);
  expect(screen.getByRole('checkbox', { name: /Barra lateral compacta/ })).toBeChecked();
  await userEvent.click(screen.getByRole('button', { name: 'Expandir barra lateral' }));
  expect(await screen.findByRole('button', { name: 'Recolher barra lateral' })).toHaveAttribute('aria-expanded', 'true');
  expect(state.preferences.compactSidebar).toBe(false);
});

const thread: DirectThreadView = { id: 'thread-ui', participantIds: ['user-owner', 'user-member'], updatedAt: '2026-10-27T15:00:00.000Z', otherParticipant: memberUser, latestMessage: null };

it('respeita Enter, Shift+Enter e a composição de texto no envio de mensagens', async () => {
  const send = vi.fn().mockResolvedValue(undefined);
  render(<DirectConversation thread={thread} messages={[]} onSend={send} sendOnEnter />);
  const input = screen.getByLabelText('Mensagem direta');
  await userEvent.type(input, 'Linha 1{shift>}{enter}{/shift}Linha 2');
  expect(send).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
  expect(send).not.toHaveBeenCalled();
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(send).toHaveBeenCalledWith('Linha 1\nLinha 2'));
  expect(input).toHaveValue('');
});

it('mantém Enter como quebra de linha por padrão e oferece Ctrl+Enter para enviar', async () => {
  const send = vi.fn().mockResolvedValue(undefined);
  render(<DirectConversation thread={thread} messages={[]} onSend={send} />);
  const input = screen.getByLabelText('Mensagem direta');
  await userEvent.type(input, 'Primeira{enter}Segunda');
  expect(send).not.toHaveBeenCalled();
  await userEvent.keyboard('{Control>}{Enter}{/Control}');
  expect(send).toHaveBeenCalledWith('Primeira\nSegunda');
});

it('mostra a resposta automática imediatamente após enviar, sem recarregar a conversa', async () => {
  localStorage.setItem('gc_demo_token', 'token');
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/auth/me') return Response.json({ data: { user: ownerUser, permissions: ownerUser.role.permissions } });
    if (url === '/api/direct-threads') return Response.json({ data: [thread] });
    if (init?.method === 'POST') {
      const base = { threadId: thread.id, createdAt: '2026-10-27T15:00:00.000Z' };
      return Response.json({ data: { ...base, id: 'human', authorId: ownerUser.id, author: ownerUser, content: 'Olá, Pedro!', automaticReplies: [{ ...base, id: 'auto', authorId: memberUser.id, author: memberUser, content: 'Estou em aula e respondo depois.', isAutomatic: true }] } });
    }
    return Response.json({ data: { thread, messages: [] } });
  }));
  render(<App initialPath="/mensagens/thread-ui" />);
  await userEvent.type(await screen.findByLabelText('Mensagem direta'), 'Olá, Pedro!');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  expect(await screen.findByText('Resposta automática')).toBeInTheDocument();
  expect(screen.getByText('Estou em aula e respondo depois.', { selector: 'p' })).toBeInTheDocument();
});

it('abre a conversa mesmo quando a lista de chats chega depois do histórico', async () => {
  localStorage.setItem('gc_demo_token', 'token');
  let resolveThreads!: (response: Response) => void;
  const threadsResponse = new Promise<Response>((resolve) => { resolveThreads = resolve; });
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/auth/me') return Response.json({ data: { user: ownerUser, permissions: ownerUser.role.permissions } });
    if (url === '/api/direct-threads') return threadsResponse;
    return Response.json({ data: { thread, messages: [] } });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialPath="/mensagens/thread-ui" />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/direct-threads/thread-ui/messages', expect.anything()));
  await act(async () => { resolveThreads(Response.json({ data: [thread] })); });
  expect(await screen.findByLabelText('Mensagem direta')).toBeInTheDocument();
});

it('aguarda o histórico de uma conversa nova antes de aceitar um rascunho', async () => {
  localStorage.setItem('gc_demo_token', 'token');
  const created = { ...thread, id: 'thread-created' };
  let resolveMessages!: (response: Response) => void;
  const messagesResponse = new Promise<Response>((resolve) => { resolveMessages = resolve; });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/auth/me') return Response.json({ data: { user: ownerUser, permissions: ownerUser.role.permissions } });
    if (url === '/api/people') return Response.json({ data: [memberUser] });
    if (url === '/api/direct-threads') return Response.json({ data: init?.method === 'POST' ? created : [] });
    if (url === '/api/direct-threads/thread-created/messages') return messagesResponse;
    return Response.json({ data: [] });
  }));
  render(<App initialPath="/mensagens" />);
  await screen.findByText('Nenhuma conversa');
  await userEvent.click(screen.getByRole('button', { name: 'Nova conversa' }));
  await userEvent.click(await screen.findByRole('checkbox', { name: /Pedro Santos/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Criar conversa' }));
  expect(screen.queryByLabelText('Mensagem direta')).not.toBeInTheDocument();
  await act(async () => { resolveMessages(Response.json({ data: { thread: created, messages: [] } })); });
  const input = await screen.findByLabelText('Mensagem direta');
  await userEvent.type(input, 'Meu rascunho');
  expect(input).toHaveValue('Meu rascunho');
});
