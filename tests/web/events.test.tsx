// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../apps/web/src/App';
import { TOKEN_KEY } from '../../apps/web/src/api/client';
import { mockFetchSequence } from './fetch-mock';
import {
  attendanceFixture,
  createdDirectMessageFixture,
  directMessagesFixture,
  eventsFixture,
  meSuccessFixture,
  memberUser,
  threadsFixture,
} from './fixtures';

describe('eventos e mensagens diretas', () => {
  beforeEach(() => localStorage.setItem(TOKEN_KEY, 'token-member'));

  it('confirma presença e atualiza o total mostrado no evento', async () => {
    mockFetchSequence(meSuccessFixture(memberUser), eventsFixture(8), attendanceFixture(9));
    render(<App initialPath="/eventos" />);
    expect(await screen.findByText('1 convidado')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar presença' }));
    expect(await screen.findByText('9 confirmados')).toBeInTheDocument();
  });

  it('não mostra criação de evento para um membro sem permissão', async () => {
    mockFetchSequence(meSuccessFixture(memberUser), eventsFixture());
    render(<App initialPath="/eventos" />);
    expect(await screen.findByText('Próximos eventos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar evento' })).not.toBeInTheDocument();
  });

  it('envia mensagem direta e a adiciona à conversa', async () => {
    mockFetchSequence(
      meSuccessFixture(memberUser),
      threadsFixture(),
      directMessagesFixture(),
      createdDirectMessageFixture('Podemos conversar?'),
    );
    render(<App initialPath="/mensagens/thread-member-organizer" />);
    await userEvent.type(await screen.findByLabelText('Mensagem direta'), 'Podemos conversar?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findAllByText('Podemos conversar?')).toHaveLength(2);
  });
});
