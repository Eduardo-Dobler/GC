import type { Channel, EventView, MemberView } from '@gc/shared';
import { CalendarDays, Hash, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

interface SearchResult { id: string; label: string; detail: string; to: string; kind: 'Canal' | 'Membro' | 'Evento' }

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function LocalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<SearchResult[]>([]);

  const load = async () => {
    if (loaded || loading) return;
    setLoading(true);
    setError('');
    try {
      const [channels, members, events] = await Promise.all([
        api.get<Channel[]>('/channels'), api.get<MemberView[]>('/members'), api.get<EventView[]>('/events?period=all'),
      ]);
      setItems([
        ...channels.map((channel) => ({ id: channel.id, label: `#${channel.name}`, detail: channel.description, to: `/canais/${channel.id}`, kind: 'Canal' as const })),
        ...members.map((member) => ({ id: member.id, label: member.name, detail: member.role.name, to: `/membros?membro=${member.id}`, kind: 'Membro' as const })),
        ...events.map((event) => ({ id: event.id, label: event.title, detail: event.category, to: '/eventos', kind: 'Evento' as const })),
      ]);
      setLoaded(true);
    } catch { setError('Busca local indisponível.'); }
    finally { setLoading(false); }
  };

  const results = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return [];
    return items.filter((item) => normalize(`${item.label} ${item.detail} ${item.kind}`).includes(term)).slice(0, 8);
  }, [items, query]);

  const select = (result: SearchResult) => {
    setQuery('');
    setFocused(false);
    navigate(result.to);
  };

  return (
    <div className="local-search">
      <label className="topbar__search"><Search size={18} /><span className="sr-only">Buscar na comunidade</span><input value={query} placeholder="Buscar na comunidade" onFocus={() => { setFocused(true); void load(); }} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onChange={(event) => setQuery(event.target.value)} autoComplete="off" /></label>
      {focused && query.trim() && <div className="search-results" role="listbox" aria-label="Resultados da busca">
        {loading ? <p>Preparando busca local...</p> : error ? <p>{error}</p> : results.length ? results.map((result) => {
          const Icon = result.kind === 'Canal' ? Hash : result.kind === 'Membro' ? Users : CalendarDays;
          return <button key={`${result.kind}-${result.id}`} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => select(result)}><span><Icon size={16} /></span><span><strong>{result.label}</strong><small>{result.kind} · {result.detail}</small></span></button>;
        }) : <p>Nenhum resultado encontrado.</p>}
      </div>}
    </div>
  );
}
