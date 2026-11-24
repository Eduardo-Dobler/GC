import { submitOnEnter } from '../messages/submitOnEnter';
import { Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export function MessageComposer({ channelName, disabled, onSend, sendOnEnter = false }: { channelName: string; disabled: boolean; sendOnEnter?: boolean; onSend: (content: string) => Promise<void> }) {
  // Começo parte feita a MÃO
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value || disabled || sending) return;
    setSending(true);
    try {
      await onSend(value);
      setContent('');
    } catch {
    } finally {
      setSending(false);
    }
  }
  // Fim da parte feita a MÃO

  // Começo parte feita a MÃO
  return (
    <form className="message-composer" onSubmit={submit}>
      <label className="sr-only" htmlFor="channel-message">Mensagem para #{channelName}</label>
      <textarea id="channel-message" onKeyDown={event => submitOnEnter(event, sendOnEnter)} value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} disabled={disabled || sending} placeholder={disabled ? 'Seu cargo pode ler, mas não publicar neste canal.' : `Mensagem para #${channelName}`} rows={1} />
      <span className="message-composer__count">{content.length}/500</span>
      <button type="submit" disabled={disabled || sending || !content.trim()} aria-label="Enviar mensagem"><Send size={18} /></button>
    </form>
  );
  // Fim da parte feita a MÃO
}
