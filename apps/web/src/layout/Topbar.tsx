import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, RotateCcw } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { ThemeToggle } from '../components/ThemeToggle';
import { LocalSearch } from '../features/search/LocalSearch';

interface TopbarProps {
  onMenu: () => void;
  menuOpen: boolean;
  compact: boolean;
  onToggleCompact: () => void;
  savingSidebar: boolean;
  onReset?: () => void;
}

export function Topbar({ onMenu, menuOpen, compact, onToggleCompact, savingSidebar, onReset }: TopbarProps) {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <button className="topbar__menu icon-button" onClick={onMenu} aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="main-navigation"><Menu /></button>
      <button className="topbar__collapse icon-button" onClick={onToggleCompact} disabled={savingSidebar} aria-label={compact ? 'Expandir barra lateral' : 'Recolher barra lateral'} title={compact ? 'Expandir barra lateral' : 'Recolher barra lateral'} aria-expanded={!compact} aria-controls="main-navigation">{compact ? <PanelLeftOpen size={21} /> : <PanelLeftClose size={21} />}</button>
      <LocalSearch />
      <div className="topbar__actions">
        <ThemeToggle />
        <button className="topbar__reset" onClick={onReset} disabled={!onReset}><RotateCcw size={16} /><span>Restaurar demo</span></button>
        {user && (
          <div className="user-menu">
            <Avatar name={user.name} color={user.avatarColor ?? user.role.color} size="small" status={user.status} />
            <div className="user-menu__text"><strong>{user.name}</strong><span>{user.role.name}</span></div>
            <button className="icon-button" onClick={() => void logout()} aria-label="Sair"><LogOut size={18} /></button>
          </div>
        )}
      </div>
    </header>
  );
}
