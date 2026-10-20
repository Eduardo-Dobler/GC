// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../apps/web/src/App';
import { mockFetchSequence } from './fetch-mock';
import { dashboardFixture, loginSuccessFixture, ownerUser } from './fixtures';

describe('entrada no GC', () => {
  it('abre o painel ao entrar pela conta rápida do Dono', async () => {
    mockFetchSequence({ data: [{ ...ownerUser, memberships: [] }] }, loginSuccessFixture(), dashboardFixture());
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /entrar como carlos barbosa/i }));
    expect(await screen.findByText(/olá, carlos/i)).toBeInTheDocument();
    expect(localStorage.getItem('gc_demo_token')).toBe('token-demo');
  });
});
