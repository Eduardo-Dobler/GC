import { useAuth } from '../auth/AuthProvider';
import { StickyNote, Inbox, ArrowLeftRight, CalendarDays, Hash, Home, Mail, ShieldCheck, Ticket, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Logo } from '../components/Logo';

const navigation = [
  { to: '/inicio', label: 'Início', icon: Home },
  { to: '/canais', label: 'Canais', icon: Hash },
  { to: '/mensagens', label: 'Mensagens', icon: Mail },
  { to: '/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/anotacoes', label: 'Anotações', icon: StickyNote },
  { to: '/solicitacoes', label: 'Solicitações', icon: Inbox },
  { to: '/membros', label: 'Membros', icon: Users },
  { to: '/cargos', label: 'Cargos', icon: ShieldCheck },
  { to: '/convites', label: 'Convites', icon: Ticket },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeCommunity } = useAuth();
  const name = activeCommunity?.name ?? 'SENAC Tech';
  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <Logo size="small" />
        <div><strong>Gerenciador</strong><span>de Comunidade</span></div>
        <button className="sidebar__close" onClick={onClose} aria-label="Fechar menu"><X /></button>
      </div>
      <div className="community-switcher">
        <span className="community-switcher__mark">{name.split(' ').slice(0, 2).map(word => word[0]).join('')}</span>
        <div><strong>{name}</strong><span>Comunidade ativa</span></div>
        <NavLink className="community-switcher__button" to="/comunidades" onClick={onClose} aria-label="Minhas comunidades" title="Minhas comunidades"><ArrowLeftRight size={18} /></NavLink>
      </div>
      <nav className="sidebar__nav" aria-label="Navegação principal">
        <span className="sidebar__label">Menu</span>
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
