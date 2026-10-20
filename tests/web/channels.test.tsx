// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../apps/web/src/App';
import { TOKEN_KEY } from '../../apps/web/src/api/client';
import { mockFetchSequence } from './fetch-mock';
import {
  channelsFixture,
  createdMessageFixture,
  dashboardFixture,
  meSuccessFixture,
  memberUser,
  messagesFixture,
} from './fixtures';

describe('painel e canais', () => {
  beforeEach(() => localStorage.setItem(TOKEN_KEY, 'token-member'));

  it('carrega no painel os números reais da comunidade', async () => {
    mockFetchSequence(meSuccessFixture(memberUser), dashboardFixture());
    render(<App initialPath="/inicio" />);
    expect(await screen.findByText('5 membros')).toBeInTheDocument();
    expect(screen.getByText('Workshop de protótipos')).toBeInTheDocument();
  });

  it('envia uma mensagem e a adiciona à conversa aberta', async () => {
    mockFetchSequence(
      meSuccessFixture(memberUser),
      channelsFixture(),
      messagesFixture(),
      createdMessageFixture('Olá, comunidade!'),
    );
    render(<App initialPath="/canais/channel-general" />);

    const input = await screen.findByLabelText('Mensagem para #chat-geral');
    await userEvent.type(input, 'Olá, comunidade!');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText('Olá, comunidade!')).toBeInTheDocument();
  });
});
