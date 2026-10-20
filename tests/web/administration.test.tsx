// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../apps/web/src/App';
import { TOKEN_KEY } from '../../apps/web/src/api/client';
import { mockFetchSequence } from './fetch-mock';
import {
  adminUser,
  dashboardFixture,
  meSuccessFixture,
  membersFixture,
  resetSuccessFixture,
  rolesFixture,
} from './fixtures';

describe('administração da comunidade', () => {
  beforeEach(() => localStorage.setItem(TOKEN_KEY, 'token-admin'));

  it('mostra alteração de cargo ao administrador e protege o dono', async () => {
    mockFetchSequence(meSuccessFixture(adminUser), membersFixture(), rolesFixture());
    render(<App initialPath="/membros" />);

    await userEvent.click(await screen.findByRole('button', { name: /ver carlos barbosa/i }));
    expect(screen.queryByLabelText('Alterar cargo')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    await userEvent.click(screen.getByRole('button', { name: /ver pedro santos/i }));
    expect(await screen.findByLabelText('Alterar cargo')).toBeInTheDocument();
  });

  it('exige a palavra RESTAURAR e volta ao login', async () => {
    mockFetchSequence(meSuccessFixture(adminUser), dashboardFixture(), resetSuccessFixture());
    render(<App initialPath="/inicio" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Restaurar demo' }));
    const confirmation = screen.getByLabelText('Digite RESTAURAR');
    const submit = screen.getByRole('button', { name: 'Confirmar restauração' });
    expect(submit).toBeDisabled();
    await userEvent.type(confirmation, 'RESTAURAR');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(await screen.findByRole('heading', { name: 'Entre no GC' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('exibe as nove permissões e identifica o cargo protegido', async () => {
    mockFetchSequence(meSuccessFixture(adminUser), rolesFixture());
    render(<App initialPath="/cargos" />);

    expect(await screen.findByText('Acessar canais privados')).toBeInTheDocument();
    expect(screen.getByText('Criar convites')).toBeInTheDocument();
    expect(screen.getByText('O cargo de Dono é protegido.')).toBeInTheDocument();
  });
});
