import { randomUUID } from 'node:crypto';
import type { DemoDatabase, DirectMessage, DirectThread } from '@gc/shared';
import { userPreferences } from './user-settings';

/** Chamado dentro da fila de escrita, antes de inserir a mensagem humana. */
export function automaticReply(database: DemoDatabase, thread: DirectThread, senderId: string, now: string): DirectMessage | undefined {
  // Só conversas individuais já autorizadas; grupos e canais não recebem respostas automáticas.
  if (thread.participantIds.length !== 2) return;
  const recipientId = thread.participantIds.find(id => id !== senderId);
  const recipient = database.users.find(user => user.id === recipientId && user.memberStatus === 'active');
  if (!recipient) return;
  const { autoReply } = userPreferences(database, recipient.id);
  if (!autoReply.enabled || !autoReply.message.trim()) return;

  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: autoReply.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = formatter.format(new Date(now));
  const conversations = new Set(database.directThreads.filter(item => item.participantIds.length === 2
    && item.participantIds.includes(senderId) && item.participantIds.includes(recipient.id)).map(item => item.id));
  const alreadyContacted = database.directMessages.some(message => !message.isAutomatic
    && message.authorId === senderId && conversations.has(message.threadId)
    && formatter.format(new Date(message.createdAt)) === today);
  if (alreadyContacted) return;

  // A resposta é inserida junto da mensagem recebida, sem disparar novamente este serviço.
  return { id: randomUUID(), threadId: thread.id, authorId: recipient.id, content: autoReply.message, createdAt: now, isAutomatic: true };
}
