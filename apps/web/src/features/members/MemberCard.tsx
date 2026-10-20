import type { MemberView } from '@gc/shared';
import { Eye, Mail } from 'lucide-react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';

const STATUS_LABELS = { online: 'Online', away: 'Ausente', offline: 'Offline' } as const;

export function MemberCard({ member, onOpen }: { member: MemberView; onOpen: () => void }) {
  const statusTone = member.memberStatus === 'banned' ? 'danger' : member.status === 'online' ? 'success' : 'neutral';
  return (
    <article className="member-card">
      <header>
        <Avatar name={member.name} color={member.avatarColor ?? member.role.color} size="large" status={member.status} />
        <div>
          <h2>{member.name}</h2>
          <span className="role-label" style={{ color: member.role.color }}><i style={{ backgroundColor: member.role.color }} />{member.role.name}</span>
        </div>
        <Badge tone={statusTone}>{member.memberStatus === 'banned' ? 'Banido' : STATUS_LABELS[member.status]}</Badge>
      </header>
      <p>{member.bio || 'Membro da Comunidade SENAC Tech.'}</p>
      <span className="member-card__email"><Mail size={14} /> {member.email}</span>
      <footer>
        <span>Desde {new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(member.joinedAt))}</span>
        <button type="button" className="button button--secondary button--small" onClick={onOpen} aria-label={`Ver ${member.name}`}><Eye size={16} /> Ver perfil</button>
      </footer>
    </article>
  );
}
