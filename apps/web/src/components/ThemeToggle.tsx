import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      className={`theme-toggle ${dark ? 'theme-toggle--dark' : ''}`}
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      onClick={toggleTheme}
    >
      <span className="theme-toggle__thumb">{dark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}</span>
    </button>
  );
}
