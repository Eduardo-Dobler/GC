import { CalendarDays, Hash, RefreshCw, Users, Wifi } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Channel, PublicUser } from '@gc/shared';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { StatCard } from '../features/dashboard/StatCard';
import { UpcomingEventCard } from '../features/dashboard/UpcomingEventCard';

interface DashboardData {
  community: { name: string; description: string };
  stats: { members: number; channels: number; events: number; online: number };
  announcements: Array<{ id: string; content: string; createdAt: string; author: PublicUser }>;
  upcomingEvents: Array<{ id: string; title: string; startsAt: string; category: string; color: string; participantCount: number }>;
  onlineMembers: PublicUser[];
  channelShortcuts: Channel[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.get<DashboardData>('/dashboard'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="page-state"><span className="spinner" /> Carregando painel...</div>;
  if (error || !data) return <div className="page-state page-state--error"><p>{error || 'Painel indisponível.'}</p><Button variant="secondary" onClick={() => void load()}><RefreshCw size={17} /> Tentar novamente</Button></div>;

  return (
    <section className="page dashboard-page">
      <div className="page-heading">
        <div><span className="eyebrow">{data.community.name}</span><h1>Olá, {user?.name.split(' ')[0]}</h1><p>{data.community.description}</p></div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Users} value={data.stats.members} label="membros" hint={`${data.stats.online} conectados agora`} tone="blue" />
        <StatCard icon={Hash} value={data.stats.channels} label="canais" hint="Visíveis para seu cargo" tone="orange" />
        <StatCard icon={CalendarDays} value={data.stats.events} label="eventos" hint="Programados" tone="purple" />
        <StatCard icon={Wifi} value={data.stats.online} label="online" hint="Equipe disponível" tone="green" />
      </div>

      <div className="dashboard-grid">
        <section className="surface dashboard-grid__events">
          <header className="surface__header"><div><h2>Próximos eventos</h2><p>Atividades programadas para a comunidade.</p></div><Link to="/eventos">Ver todos</Link></header>
          <div className="surface__content stacked-list">
            {data.upcomingEvents.length ? data.upcomingEvents.map((event) => <UpcomingEventCard key={event.id} event={event} />) : <p className="muted">Nenhum evento programado.</p>}
          </div>
        </section>

        <section className="surface">
          <header className="surface__header"><div><h2>Membros ativos</h2><p>Quem está disponível agora.</p></div><Link to="/membros">Ver membros</Link></header>
          <div className="surface__content online-list">
            {data.onlineMembers.map((member) => <div className="online-member" key={member.id}><Avatar name={member.name} color={member.avatarColor ?? member.role.color} status={member.status} /><span><strong>{member.name}</strong><small style={{ color: member.role.color }}>{member.role.name}</small></span></div>)}
          </div>
        </section>

        <section className="surface dashboard-grid__announcements">
          <header className="surface__header"><div><h2>Avisos recentes</h2><p>Últimas atualizações oficiais.</p></div><Link to="/canais">Abrir canal</Link></header>
          <div className="surface__content announcement-list">
            {data.announcements.map((announcement) => <article key={announcement.id}><Avatar name={announcement.author.name} color={announcement.author.avatarColor ?? announcement.author.role.color} size="small" /><div><p>{announcement.content}</p><small>{announcement.author.name} · {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(announcement.createdAt))}</small></div></article>)}
          </div>
        </section>

        <section className="surface">
          <header className="surface__header"><div><h2>Acessos rápidos</h2><p>Canais disponíveis para seu cargo.</p></div></header>
          <div className="surface__content channel-shortcuts">
            {data.channelShortcuts.slice(0, 5).map((channel) => <Link key={channel.id} to={`/canais/${channel.id}`}><span><Hash size={17} /></span><div><strong>{channel.name}</strong><small>{channel.description}</small></div></Link>)}
          </div>
        </section>
      </div>
    </section>
  );
}
