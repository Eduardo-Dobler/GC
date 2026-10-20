import { Trash2 } from 'lucide-react';
import type { MessageView } from '@gc/shared';
import { Avatar } from '../../components/Avatar';

export function MessageList({ messages, onDelete }: { messages: MessageView[]; onDelete: (id: string) => void }) {
  if (!messages.length) return <div className="conversation-empty"><HashIcon /><strong>Comece a conversa</strong><span>Envie a primeira mensagem deste canal.</span></div>;
  return (
    <div className="message-list" aria-live="polite">
      {messages.map((message) => (
        <article key={message.id} className={`message ${message.deletedAt ? 'message--deleted' : ''}`}>
          <Avatar name={message.author.name} color={message.author.avatarColor ?? message.author.role.color} size="medium" status={message.author.status} />
          <div className="message__body">
            <header><strong>{message.author.name}</strong><span style={{ color: message.author.role.color }}>{message.author.role.name}</span><time>{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt))}</time></header>
            <p>{message.content}</p>
          </div>
          {message.canDelete && !message.deletedAt && <button className="message__delete icon-button" onClick={() => onDelete(message.id)} aria-label={`Excluir mensagem de ${message.author.name}`}><Trash2 size={16} /></button>}
        </article>
      ))}
    </div>
  );
}

function HashIcon() {
  return <span className="conversation-empty__icon">#</span>;
}
