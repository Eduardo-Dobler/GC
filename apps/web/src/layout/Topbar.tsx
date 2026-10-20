import { LogOut, Menu, RotateCcw } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { ThemeToggle } from '../components/ThemeToggle';
import { LocalSearch } from '../features/search/LocalSearch';

interface TopbarProps {
  onMenu: () => void;
  onReset?: () => void;
}

export function Topbar({ onMenu, onReset }: TopbarProps) {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <button className="topbar__menu icon-button" onClick={onMenu} aria-label="Abrir menu"><Menu /></button>
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
