import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { StickyNote, Inbox, ArrowLeftRight, CalendarDays, Hash, Home, Mail, Settings, ShieldCheck, Ticket, Users, X } from 'lucide-react';
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
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar({ open, mobile, onClose }: { open: boolean; mobile: boolean; onClose: () => void }) {
  const { activeCommunity } = useAuth();
  const name = activeCommunity?.name ?? 'SENAC Tech';
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobile || !open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = panel.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
      if (!items?.length) return;
      const first = items[0]!; const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mobile, open, onClose]);

  return <aside id="main-navigation" ref={panel} className={`sidebar ${open ? 'sidebar--open' : ''}`} role={mobile && open ? 'dialog' : undefined} aria-modal={mobile && open ? true : undefined} aria-label="Menu principal" inert={mobile && !open} aria-hidden={mobile && !open ? true : undefined}>
    <div className="sidebar__brand"><Logo size="small" /><div><strong>Gerenciador</strong><span>de Comunidade</span></div><button ref={closeButton} className="sidebar__close" type="button" onClick={onClose} aria-label="Fechar menu"><X /></button></div>
    <div className="community-switcher"><span className="community-switcher__mark">{name.split(' ').slice(0, 2).map(word => word[0]).join('')}</span><div><strong>{name}</strong><span>Comunidade ativa</span></div><NavLink className="community-switcher__button" to="/comunidades" onClick={onClose} aria-label="Minhas comunidades" title={`Minhas comunidades · ${name}`}><ArrowLeftRight size={18} /></NavLink></div>
    <nav className="sidebar__nav" aria-label="Navegação principal"><span className="sidebar__label">Menu</span>{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onClose} title={label} aria-label={label} className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}><Icon size={19} aria-hidden="true" /><span>{label}</span></NavLink>)}</nav>
  </aside>;
}
