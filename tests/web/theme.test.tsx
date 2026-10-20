// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../apps/web/src/components/ThemeProvider';
import { ThemeToggle } from '../../apps/web/src/components/ThemeToggle';

describe('tema da interface', () => {
  it('alterna entre claro e escuro e persiste a escolha', async () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    expect(document.documentElement.dataset.theme).toBe('light');
    await userEvent.click(screen.getByRole('switch', { name: 'Ativar modo escuro' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('gc_theme')).toBe('dark');
    expect(screen.getByRole('switch', { name: 'Ativar modo claro' })).toBeInTheDocument();
  });
});
