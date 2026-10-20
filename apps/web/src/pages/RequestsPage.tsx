import { Inbox, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AccessRequestView } from '@gc/shared';
import { api } from '../api/client';
import { Button } from '../components/Button';

const labels = { pending: 'Pendente', ignored: 'Ignorada', accepted: 'Aceita', rejected: 'Recusada' };
interface Requests { incoming: AccessRequestView[]; outgoing: AccessRequestView[] }
export function RequestsPage() {
  const [data, setData] = useState<Requests | null>(null);
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  function load() { setError(''); void api.get<Requests>('/requests').then(setData).catch(caught => setError(caught.message)); }
  useEffect(load, []);
  async function respond(id: string, action: 'accept' | 'reject' | 'ignore') {
    setBusy(id); setError('');
    try { const saved = await api.patch<AccessRequestView>(`/requests/${id}`, { action }); setData(current => current ? { ...current, incoming: current.incoming.map(item => item.id === id ? saved : item) } : current); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível responder.'); }
    finally { setBusy(''); }
  }
  return <section className="page requests-page">
    <div className="page-heading"><div><span className="eyebrow">Você decide quem se aproxima</span><h1>Solicitações</h1><p>Convites para conversar e participar de canais, reunidos em um só lugar.</p></div><Button variant="secondary" onClick={load}><RefreshCw size={16} /> Atualizar</Button></div>
    <div className="tabs request-tabs" role="tablist" aria-label="Solicitações"><button role="tab" aria-selected={tab === 'incoming'} className={tab === 'incoming' ? 'tabs__active' : ''} onClick={() => setTab('incoming')}>Recebidas ({data?.incoming.filter(item => item.status === 'pending').length ?? 0})</button><button role="tab" aria-selected={tab === 'outgoing'} className={tab === 'outgoing' ? 'tabs__active' : ''} onClick={() => setTab('outgoing')}>Enviadas</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!data && !error && <p className="page-state">Carregando solicitações...</p>}
    {data && <div className="request-list">{data[tab].map(item => <article key={item.id} className="surface request-card"><span className="request-card__icon"><Inbox size={22} /></span><div className="request-card__body"><span className="eyebrow">{item.kind === 'direct' ? 'Conversa' : 'Canal'} · {item.communityName}</span><h2>{tab === 'incoming' ? item.requesterName : item.recipientName}</h2><p>{item.title}</p><small>{new Date(item.createdAt).toLocaleString('pt-BR')} · <strong>{labels[item.status]}</strong></small>{item.status === 'ignored' && <p className="helper-text">Este pedido permanece bloqueado para reenvio. Você pode aceitá-lo ou recusá-lo depois.</p>}{item.status === 'accepted' && item.kind === 'direct' && <p><Link to={`/mensagens/${item.targetId}`}>Abrir conversa</Link></p>}</div>{tab === 'incoming' && (item.status === 'pending' || item.status === 'ignored') && <div className="request-actions"><Button disabled={Boolean(busy)} onClick={() => void respond(item.id, 'accept')}>Aceitar</Button><Button variant="secondary" disabled={Boolean(busy)} onClick={() => void respond(item.id, 'reject')}>Recusar</Button>{item.status === 'pending' && <Button variant="secondary" disabled={Boolean(busy)} onClick={() => void respond(item.id, 'ignore')}>Ignorar</Button>}</div>}</article>)}{data[tab].length === 0 && <div className="page-state"><Inbox /><p>Nenhuma solicitação {tab === 'incoming' ? 'recebida' : 'enviada'}.</p></div>}</div>}
  </section>;
}
