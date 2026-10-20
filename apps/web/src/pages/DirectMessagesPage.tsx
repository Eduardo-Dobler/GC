import { MessageCircle, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DirectThread, DirectThreadView, PublicUser } from '@gc/shared';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { useToast } from '../components/ToastProvider';
import { DirectConversation, type DirectMessageView } from '../features/messages/DirectConversation';
import { ThreadList } from '../features/messages/ThreadList';
import { Modal } from '../components/Modal';
import { MemberPicker } from '../components/MemberPicker';
import { useAuth } from '../auth/AuthProvider';

interface ConversationPayload {
  thread: DirectThread;
  messages: DirectMessageView[];
}

export function DirectMessagesPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const { user } = useAuth();
  const [threads, setThreads] = useState<DirectThreadView[]>([]);
  const [selectedId, setSelectedId] = useState(threadId ?? '');
  const [messages, setMessages] = useState<DirectMessageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [conversationName, setConversationName] = useState('');
  const [creating, setCreating] = useState(false);

  async function openCreate() {
    setCreateOpen(true);
    setSelectedMembers([]);
    setConversationName('');
    try { setMembers((await api.get<PublicUser[]>('/people')).filter((member) => member.memberStatus === 'active')); } catch (caught) { notify(caught instanceof Error ? caught.message : 'Não foi possível carregar as pessoas.', 'error'); }
  }

  async function createConversation() {
    setCreating(true);
    try {
      const created = await api.post<(DirectThreadView & { pendingRequests?: number }) | { pending: true }>('/direct-threads', { participantIds: selectedMembers, name: conversationName.trim() || undefined });
      if ('pending' in created) { setCreateOpen(false); notify('Solicitação enviada. Aguarde a resposta do destinatário.', 'success'); navigate('/solicitacoes'); return; }
      if (created.pendingRequests) notify('Conversa criada. Pessoas de cargo superior aguardam aceitação.', 'success');
      setThreads((current) => [created, ...current.filter((thread) => thread.id !== created.id)]);
      setSelectedId(created.id);
      setMessages([]);
      setCreateOpen(false);
      navigate(`/mensagens/${created.id}`);
    } catch (caught) { notify(caught instanceof Error ? caught.message : 'Não foi possível criar a conversa.', 'error'); }
    finally { setCreating(false); }
  }

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get<DirectThreadView[]>('/direct-threads');
      setThreads(result);
      const nextId = threadId && result.some((thread) => thread.id === threadId) ? threadId : result[0]?.id;
      if (nextId) {
        setSelectedId(nextId);
        if (nextId !== threadId) navigate(`/mensagens/${nextId}`, { replace: true });
      } else {
        setLoading(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as conversas.');
      setLoading(false);
    }
  }, [navigate, threadId]);

  useEffect(() => { void loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    api.get<ConversationPayload>(`/direct-threads/${selectedId}/messages`)
      .then((payload) => setMessages(payload.messages))
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Não foi possível abrir a conversa.'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  function selectThread(id: string) {
    setSelectedId(id);
    navigate(`/mensagens/${id}`);
  }

  async function send(content: string) {
    try {
      const created = await api.post<DirectMessageView>(`/direct-threads/${selectedId}/messages`, { content });
      setMessages((current) => [...current, created]);
      setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, updatedAt: created.createdAt, latestMessage: created } : thread));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Não foi possível enviar a mensagem.', 'error');
      throw caught;
    }
  }

  const selected = threads.find((thread) => thread.id === selectedId);
  return (
    <section className="page messages-page">
      <div className="page-heading"><div><span className="eyebrow">Conversas privadas</span><h1>Mensagens</h1><p>Fale diretamente com integrantes da comunidade.</p></div><div className="creation-actions"><Button onClick={() => void openCreate()}><Plus size={18} /> Nova conversa</Button><Button variant="secondary" onClick={() => navigate('/solicitacoes')}>Solicitações</Button></div></div>
      <div className="messages-workspace">
        <ThreadList threads={threads} selectedId={selectedId} onSelect={selectThread} />
        {loading && <div className="page-state"><span className="spinner" /> Abrindo conversa...</div>}
        {!loading && error && <div className="page-state page-state--error"><p>{error}</p><Button variant="secondary" onClick={() => void loadThreads()}><RefreshCw size={17} /> Tentar novamente</Button></div>}
        {!loading && !error && selected && <DirectConversation thread={selected} messages={messages} onSend={send} />}
        {!loading && !error && !selected && <div className="conversation-empty"><span className="conversation-empty__icon"><MessageCircle /></span><strong>Nenhuma conversa</strong><span>As conversas disponíveis aparecerão aqui.</span></div>}
      </div>
      <Modal open={createOpen} title="Nova conversa" onClose={() => setCreateOpen(false)} wide footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button disabled={creating || selectedMembers.length === 0} onClick={() => void createConversation()}>{creating ? 'Criando...' : 'Criar conversa'}</Button></>}>
        <div className="create-dialog"><p className="helper-text">Pessoas de cargo igual ou inferior entram diretamente. Cargos superiores recebem uma solicitação. Sem uma comunidade em comum, também é necessário aceitar o convite.</p><label className="form-field">Nome do grupo (opcional)<input value={conversationName} onChange={(event) => setConversationName(event.target.value)} placeholder="Ex.: Organização do evento" /></label><fieldset className="location-fieldset"><legend>Pessoas</legend><MemberPicker members={members} selected={selectedMembers} onChange={setSelectedMembers} exclude={user ? [user.id] : []} /></fieldset></div>
      </Modal>
    </section>
  );
}
