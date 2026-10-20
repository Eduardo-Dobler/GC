import { CalendarPlus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EventView } from '@gc/shared';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { PermissionGate } from '../components/PermissionGate';
import { useToast } from '../components/ToastProvider';
import { EventCard } from '../features/events/EventCard';
import { EventForm, type EventFormValues } from '../features/events/EventForm';

export function EventsPage() {
  const { user, permissions } = useAuth();
  const notify = useToast();
  const [events, setEvents] = useState<EventView[]>([]);
  const [period, setPeriod] = useState('upcoming');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventView | null>(null);
  const [deleting, setDeleting] = useState<EventView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ period });
    if (category) query.set('category', category);
    try {
      setEvents(await api.get<EventView[]>(`/events?${query}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os eventos.');
    } finally {
      setLoading(false);
    }
  }, [category, period]);

  useEffect(() => { void load(); }, [load]);
  const categories = useMemo(() => Array.from(new Set(events.map((event) => event.category))), [events]);

  function canEdit(event: EventView) {
    return permissions.includes('MANAGE_EVENTS') || (permissions.includes('CREATE_EVENTS') && event.createdBy === user?.id);
  }

  async function attendance(event: EventView, status: 'going' | 'not_going') {
    try {
      const updated = await api.put<EventView>(`/events/${event.id}/attendance`, { status });
      setEvents((current) => current.map((candidate) => candidate.id === event.id ? updated : candidate));
      notify(status === 'going' ? 'Presença confirmada.' : 'Presença cancelada.', 'success');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Não foi possível atualizar sua presença.', 'error');
    }
  }

  async function save(values: EventFormValues) {
    const saved = editing
      ? await api.patch<EventView>(`/events/${editing.id}`, values)
      : await api.post<EventView>('/events', values);
    setEvents((current) => editing ? current.map((event) => event.id === saved.id ? saved : event) : [...current, saved].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    notify(editing ? 'Evento atualizado.' : 'Evento criado.', 'success');
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api.delete(`/events/${deleting.id}`);
      setEvents((current) => current.filter((event) => event.id !== deleting.id));
      setDeleting(null);
      notify('Evento excluído.', 'success');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Não foi possível excluir o evento.', 'error');
    }
  }

  return (
    <section className="page events-page">
      <div className="page-heading">
        <div><span className="eyebrow">Agenda da comunidade</span><h1>Próximos eventos</h1><p>Confirme presença e acompanhe todas as atividades.</p></div>
        <PermissionGate permissions={permissions} requires="CREATE_EVENTS"><Button onClick={() => { setEditing(null); setFormOpen(true); }}><CalendarPlus size={18} /> Criar evento</Button></PermissionGate>
      </div>
      <div className="event-filters">
        <label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="upcoming">Próximos</option><option value="past">Passados</option><option value="all">Todos</option></select></label>
        <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <span>{events.length} {events.length === 1 ? 'evento' : 'eventos'}</span>
      </div>
      {loading && <div className="page-state"><span className="spinner" /> Carregando eventos...</div>}
      {!loading && error && <div className="page-state page-state--error"><p>{error}</p><Button variant="secondary" onClick={() => void load()}><RefreshCw size={17} /> Tentar novamente</Button></div>}
      {!loading && !error && <div className="event-list">{events.length ? events.map((event) => <EventCard key={event.id} event={event} canEdit={canEdit(event)} onAttendance={(item, status) => void attendance(item, status)} onEdit={(item) => { setEditing(item); setFormOpen(true); }} onDelete={setDeleting} />) : <div className="empty-card">Nenhum evento encontrado para estes filtros.</div>}</div>}
      {formOpen && <EventForm key={editing?.id ?? 'new'} open event={editing} onClose={() => setFormOpen(false)} onSave={save} />}
      <Modal open={Boolean(deleting)} title="Excluir evento" onClose={() => setDeleting(null)} footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="danger" onClick={() => void confirmDelete()}>Excluir evento</Button></>}><p>O evento <strong>{deleting?.title}</strong> e suas confirmações de presença serão removidos.</p></Modal>
    </section>
  );
}
