import { Hash, LockKeyhole, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { MessageView, PublicUser } from '@gc/shared';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { useToast } from '../components/ToastProvider';
import { ChannelList, type ChannelWithAccess } from '../features/channels/ChannelList';
import { MessageComposer } from '../features/channels/MessageComposer';
import { MessageList } from '../features/channels/MessageList';
import { Modal } from '../components/Modal';
import { MemberPicker } from '../components/MemberPicker';
import { useAuth } from '../auth/AuthProvider';

interface ConversationPayload {
  channel: ChannelWithAccess;
  messages: MessageView[];
}

export function ChannelsPage() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const { user, permissions } = useAuth();
  const [channels, setChannels] = useState<ChannelWithAccess[]>([]);
  const [selectedId, setSelectedId] = useState(channelId ?? '');
  const [conversation, setConversation] = useState<ConversationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'private'>('text');
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  async function openCreate() {
    setCreateOpen(true); setChannelName(''); setChannelDescription(''); setChannelType('text'); setAllowedUsers([]);
    try { setMembers((await api.get<PublicUser[]>('/members')).filter((member) => member.memberStatus === 'active')); } catch (caught) { notify(caught instanceof Error ? caught.message : 'Não foi possível carregar as pessoas.', 'error'); }
  }

  async function createChannel() {
    setCreating(true);
    try {
      const created = await api.post<ChannelWithAccess>('/channels', { name: channelName, description: channelDescription, type: channelType, allowedUserIds: channelType === 'private' ? allowedUsers : [] });
      setChannels((current) => [...current, created].sort((a, b) => a.order - b.order)); setCreateOpen(false); setSelectedId(created.id); setConversation(null); navigate(`/canais/${created.id}`);
    } catch (caught) { notify(caught instanceof Error ? caught.message : 'Não foi possível criar o canal.', 'error'); }
    finally { setCreating(false); }
  }

  const loadChannels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get<ChannelWithAccess[]>('/channels');
      setChannels(result);
      const nextId = channelId && result.some((channel) => channel.id === channelId) ? channelId : result[0]?.id;
      if (nextId) {
        setSelectedId(nextId);
        if (nextId !== channelId) navigate(`/canais/${nextId}`, { replace: true });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os canais.');
      setLoading(false);
    }
  }, [channelId, navigate]);

  useEffect(() => { void loadChannels(); }, [loadChannels]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    api.get<ConversationPayload>(`/channels/${selectedId}/messages`)
      .then(setConversation)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Não foi possível abrir o canal.'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  function selectChannel(id: string) {
    setSelectedId(id);
    navigate(`/canais/${id}`);
  }

  async function sendMessage(content: string) {
    try {
      const created = await api.post<MessageView>(`/channels/${selectedId}/messages`, { content });
      setConversation((current) => current ? { ...current, messages: [...current.messages, created] } : current);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Não foi possível enviar a mensagem.', 'error');
      throw caught;
    }
  }

  async function deleteMessage(id: string) {
    try {
      await api.delete(`/messages/${id}`);
      setConversation((current) => current ? {
        ...current,
        messages: current.messages.map((message) => message.id === id ? { ...message, content: 'Mensagem removida', deletedAt: new Date().toISOString(), canDelete: false } : message),
      } : current);
      notify('Mensagem removida.', 'success');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Não foi possível remover a mensagem.', 'error');
    }
  }

  return (
    <section className="page channels-page">
      <div className="page-heading"><div><span className="eyebrow">Comunicação</span><h1>Canais</h1><p>Conversas organizadas por assunto e permissão.</p></div><div className="creation-actions">{permissions.includes('CREATE_CHANNELS') && <Button onClick={() => void openCreate()}><Plus size={18} /> Novo canal</Button>}<Button variant="secondary" onClick={() => navigate('/solicitacoes')}>Solicitações</Button></div></div>
      <div className="channel-workspace">
        <ChannelList channels={channels} selectedId={selectedId} onSelect={selectChannel} />
        <section className="conversation-panel">
          {loading && <div className="page-state"><span className="spinner" /> Abrindo canal...</div>}
          {!loading && error && <div className="page-state page-state--error"><p>{error}</p><Button variant="secondary" onClick={() => void loadChannels()}><RefreshCw size={17} /> Tentar novamente</Button></div>}
          {!loading && !error && conversation && <>
            <header className="conversation-header">
              <span className="conversation-header__icon">{conversation.channel.type === 'private' ? <LockKeyhole size={20} /> : <Hash size={21} />}</span>
              <div><h2>{conversation.channel.name}</h2><p>{conversation.channel.description}</p></div>
              <span className="conversation-header__count">{conversation.messages.length} mensagens</span>
            </header>
            <MessageList messages={conversation.messages} onDelete={(id) => void deleteMessage(id)} />
            <MessageComposer channelName={conversation.channel.name} disabled={!conversation.channel.canPost} onSend={sendMessage} />
          </>}
        </section>
      </div>
      <Modal open={createOpen} title="Novo canal" onClose={() => setCreateOpen(false)} wide footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button disabled={creating || !channelName.trim() || (channelType === 'private' && allowedUsers.length === 0)} onClick={() => void createChannel()}>{creating ? 'Criando...' : 'Criar canal'}</Button></>}>
        <div className="create-dialog"><p className="helper-text">Canais públicos ficam disponíveis para toda a comunidade. Em canais privados, escolha as pessoas que poderão participar. Pessoas de cargo superior só serão incluídas após aceitar a solicitação.</p><label className="form-field">Nome<input value={channelName} onChange={(event) => setChannelName(event.target.value)} maxLength={40} placeholder="Ex.: planejamento" /></label><label className="form-field">Descrição<input value={channelDescription} onChange={(event) => setChannelDescription(event.target.value)} maxLength={200} placeholder="Sobre o que este canal conversa?" /></label><label className="form-field">Visibilidade<select value={channelType} onChange={(event) => setChannelType(event.target.value as 'text' | 'private')}><option value="text">Público</option><option value="private">Privado por pessoas</option></select></label>{channelType === 'private' && <fieldset className="location-fieldset"><legend>Pessoas com acesso</legend><MemberPicker members={members} selected={allowedUsers} onChange={setAllowedUsers} exclude={user ? [user.id] : []} /></fieldset>}</div>
      </Modal>
    </section>
  );
}
