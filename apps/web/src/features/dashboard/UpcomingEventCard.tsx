import { CalendarDays, Users } from 'lucide-react';

interface UpcomingEventCardProps {
  event: {
    title: string;
    startsAt: string;
    category: string;
    color: string;
    participantCount: number;
  };
}

export function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(event.startsAt));
  return (
    <article className="upcoming-event">
      <span className="upcoming-event__color" style={{ backgroundColor: event.color }} />
      <div className="upcoming-event__main"><strong>{event.title}</strong><span><CalendarDays size={14} /> {date}</span></div>
      <div className="upcoming-event__meta"><span>{event.category}</span><small><Users size={13} /> {event.participantCount}</small></div>
    </article>
  );
}
