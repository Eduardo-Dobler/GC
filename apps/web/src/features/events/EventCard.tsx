import { CalendarDays, Clock, Edit3, MapPin, Repeat2, Trash2, UserRoundCheck, Users } from 'lucide-react';
import { googleMapsOpenUrl, normalizeGoogleMapsEmbedUrl } from '@gc/shared';
import type { EventView } from '@gc/shared';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { MapEmbedPreview } from './MapEmbedPreview';

interface EventCardProps {
  event: EventView;
  canEdit: boolean;
  onAttendance: (event: EventView, status: 'going' | 'not_going') => void;
  onEdit: (event: EventView) => void;
  onDelete: (event: EventView) => void;
}

export function EventCard({ event, canEdit, onAttendance, onEdit, onDelete }: EventCardProps) {
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const mapSrc = event.googleMapsEmbedUrl ? normalizeGoogleMapsEmbedUrl(event.googleMapsEmbedUrl) : null;
  const mapUrl = googleMapsOpenUrl(event.googleMapsUrl || event.googleMapsEmbedUrl || '', event.locationDescription ?? '');
  return (
    <article className="event-card" style={{ '--event-color': event.color } as React.CSSProperties}>
      <div className="event-card__date"><strong>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(startsAt)}</strong><span>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(startsAt).replace('.', '')}</span></div>
      <div className="event-card__body">
        <header><Badge>{event.category}</Badge>{event.recurring && <Badge tone="navy"><Repeat2 size={13} /> {event.recurrence === 'monthly' ? 'Mensal' : 'Semanal'}</Badge>}</header>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <div className="event-card__details">
          <span><CalendarDays size={15} /> {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(startsAt)}</span>
          <span><Clock size={15} /> {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(startsAt)}–{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(endsAt)}</span>
          <span><Users size={15} /> {event.invitedUserIds.length} {event.invitedUserIds.length === 1 ? 'convidado' : 'convidados'}</span>
        </div>
        {(event.locationDescription || event.googleMapsUrl || event.googleMapsEmbedUrl) && <div className="event-card__location"><strong><MapPin size={15} /> Local</strong>{event.locationDescription && <p>{event.locationDescription}</p>}{mapUrl && <a className="event-card__map-link" href={mapUrl} target="_blank" rel="noreferrer">Abrir no Google Maps</a>}{mapSrc && <MapEmbedPreview src={mapSrc} title={`Mapa de ${event.title}`} />}</div>}
        <footer>
          <div className="event-card__creator"><Avatar name={event.creator.name} color={event.creator.avatarColor ?? event.creator.role.color} size="small" /><span><small>Organizado por</small><strong>{event.creator.name}</strong></span></div>
          <div className="event-card__attendance"><span><Users size={15} /> {event.attendance.going} confirmados</span><Button size="small" variant={event.attendance.current === 'going' ? 'secondary' : 'primary'} onClick={() => onAttendance(event, event.attendance.current === 'going' ? 'not_going' : 'going')}><UserRoundCheck size={16} /> {event.attendance.current === 'going' ? 'Cancelar presença' : 'Confirmar presença'}</Button></div>
        </footer>
      </div>
      {canEdit && <div className="event-card__actions"><button className="icon-button" onClick={() => onEdit(event)} aria-label={`Editar ${event.title}`}><Edit3 size={16} /></button><button className="icon-button" onClick={() => onDelete(event)} aria-label={`Excluir ${event.title}`}><Trash2 size={16} /></button></div>}
    </article>
  );
}
