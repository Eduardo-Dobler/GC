import type { DirectThreadView } from '@gc/shared';
import { Avatar } from '../../components/Avatar';

export function ThreadList({ threads, selectedId, onSelect }: { threads: DirectThreadView[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <nav className="thread-list" aria-label="Conversas diretas">
      <header><span>Conversas</span><small>{threads.length}</small></header>
      {threads.map((thread) => (
        <button key={thread.id} className={thread.id === selectedId ? 'thread-item thread-item--active' : 'thread-item'} onClick={() => onSelect(thread.id)}>
          <Avatar name={thread.title ?? thread.otherParticipant.name} color={thread.otherParticipant.avatarColor ?? thread.otherParticipant.role.color} status={thread.isGroup ? undefined : thread.otherParticipant.status} />
          <span><strong>{thread.title ?? thread.otherParticipant.name}</strong><small>{thread.latestMessage?.content ?? (thread.isGroup ? `${thread.participantIds.length} participantes` : 'Inicie uma conversa')}</small></span>
          <time>{thread.latestMessage ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(thread.latestMessage.createdAt)) : ''}</time>
        </button>
      ))}
    </nav>
  );
}
