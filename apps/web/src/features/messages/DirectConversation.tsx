import { Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { DirectMessage, DirectThreadView, PublicUser } from '@gc/shared';
import { Avatar } from '../../components/Avatar';

export interface DirectMessageView extends DirectMessage {
  author: PublicUser;
}

export function DirectConversation({ thread, messages, onSend }: { thread: DirectThreadView; messages: DirectMessageView[]; onSend: (content: string) => Promise<void> }) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value) return;
    setSending(true);
    try {
      await onSend(value);
      setContent('');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="direct-conversation">
      <header className="direct-conversation__header">
        <Avatar name={thread.title ?? thread.otherParticipant.name} color={thread.otherParticipant.avatarColor ?? thread.otherParticipant.role.color} status={thread.isGroup ? undefined : thread.otherParticipant.status} />
        <div><h2>{thread.title ?? thread.otherParticipant.name}</h2><p>{thread.isGroup ? `${thread.participantIds.length} participantes` : `${thread.otherParticipant.role.name} · ${thread.otherParticipant.status === 'online' ? 'Online' : thread.otherParticipant.status === 'away' ? 'Ausente' : 'Offline'}`}</p></div>
      </header>
      <div className="direct-messages" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className="direct-message">
            <Avatar name={message.author.name} color={message.author.avatarColor ?? message.author.role.color} size="small" />
            <div><header><strong>{message.author.name}</strong><time>{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt))}</time></header><p>{message.content}</p></div>
          </article>
        ))}
      </div>
      <form className="direct-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="direct-message">Mensagem direta</label>
        <textarea id="direct-message" rows={1} maxLength={500} value={content} onChange={(event) => setContent(event.target.value)} placeholder={`Mensagem para ${thread.title ?? thread.otherParticipant.name}`} disabled={sending} />
        <button type="submit" disabled={sending || !content.trim()} aria-label="Enviar mensagem"><Send size={18} /></button>
      </form>
    </section>
  );
}
