import { ArrowRight, Network, Plus, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Community, CommunitySummary, PublicUser } from '@gc/shared';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { MemberPicker } from '../components/MemberPicker';
import { Modal } from '../components/Modal';

interface Directory {
  communities: CommunitySummary[];
  people: Array<PublicUser & { communities: Community[] }>;
  connections: Array<{ from: Community; to: Community; sharedMembers: PublicUser[] }>;
}

export function CommunitiesPage() {
  const { user, activeCommunity, switchCommunity } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Directory | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [peopleLoading, setPeopleLoading] = useState(false);

  function load() { setError(''); void api.get<Directory>('/communities').then(setData).catch(caught => setError(caught.message)); }
  useEffect(load, []);

  async function enter(id: string) {
    setBusy(true); setError('');
    try { await switchCommunity(id); navigate('/inicio'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível abrir a comunidade.'); }
    finally { setBusy(false); }
  }

  async function showCreate() {
    setSelected([]); setFormError(''); setPeople([]); setOpen(true); setPeopleLoading(true);
    try { setPeople(await api.get<PublicUser[]>('/people')); }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Não foi possível carregar as pessoas.'); }
    finally { setPeopleLoading(false); }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setFormError('');
    try {
      const result = await api.post<CommunitySummary>('/communities', {
        name: String(form.get('name')), description: String(form.get('description')),
        category: String(form.get('category')), accent: '#ff6a00', memberIds: selected,
      });
      setOpen(false);
      await enter(result.community.id);
    } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Não foi possível criar a comunidade.'); }
    finally { setBusy(false); }
  }

  const visible = data?.communities.filter(item => `${item.community.name} ${item.category}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))) ?? [];
  return <section className="page communities-page">
    <div className="page-heading"><div><span className="eyebrow">Sua rede no GC</span><h1>Minhas comunidades</h1><p>Do trabalho aos encontros entre amigos. Cada grupo tem seu espaço.</p></div><Button onClick={() => void showCreate()}><Plus size={18} /> Nova comunidade</Button></div>
    {error && <div className="form-error" role="alert">{error} <Button variant="secondary" onClick={load}>Tentar novamente</Button></div>}
    {!data && !error && <p className="page-state">Carregando suas comunidades...</p>}
    {data && <>
      <div className="community-overview"><div><Network size={24} /><strong>{data.communities.length}</strong><span>comunidades para participar</span></div><label>Encontrar comunidade<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome ou categoria" /></label></div>
      <div className="community-grid">{visible.map(item => <article className="surface community-card" key={item.community.id}>
        <div className="community-card__top"><span className="community-card__icon" style={{ backgroundColor: item.accent }}>{item.community.name.split(' ').slice(0, 2).map(word => word[0]).join('')}</span><span className="eyebrow">{item.category}</span>{item.community.id === activeCommunity?.id && <span className="community-active">Atual</span>}</div>
        <h2>{item.community.name}</h2><p>{item.community.description}</p>
        <div className="community-card__meta"><Users size={16} /> {item.memberCount} pessoas <span>Seu cargo: {item.role?.name ?? 'Membro'}</span></div>
        <div className="community-card__people">{item.sharedMembers.slice(0, 4).map(person => <Avatar key={person.id} name={person.name} color={person.avatarColor ?? person.role.color} size="small" />)}<small>{item.sharedMembers.slice(0, 2).map(person => person.name.split(' ')[0]).join(', ')}{item.sharedMembers.length > 2 ? ` e mais ${item.sharedMembers.length - 2}` : ''}</small></div>
        <Button variant="secondary" disabled={busy} onClick={() => void enter(item.community.id)} aria-label={`Abrir ${item.community.name}`}>Abrir comunidade <ArrowRight size={16} /></Button>
      </article>)}</div>
      {!visible.length && <p className="page-state">Nenhuma comunidade encontrada.</p>}
      <section className="surface community-network"><header><span className="eyebrow">Pessoas que conectam</span><h2>Além de um único grupo</h2><p>Conheça os interesses compartilhados pelas pessoas da rede.</p></header><div className="network-people">{data.people.map(person => <article key={person.id}><Avatar name={person.name} color={person.avatarColor ?? person.role.color} /><div><strong>{person.name}</strong><p>{person.bio}</p><div className="community-tags">{person.communities.map(community => <span key={community.id}>{community.name}</span>)}</div></div></article>)}</div></section>
      {data.connections.length > 0 && <section className="surface community-network"><header><span className="eyebrow">Interesses em comum</span><h2>Conexões entre comunidades</h2></header><div className="network-connections">{data.connections.map(connection => <article key={`${connection.from.id}-${connection.to.id}`}><Network size={20} /><div><strong>{connection.from.name} <span>↔</span> {connection.to.name}</strong><p>{connection.sharedMembers.map(person => person.name).join(', ')}</p></div><span>{connection.sharedMembers.length} em comum</span></article>)}</div></section>}
    </>}
    <Modal open={open} title="Nova comunidade" onClose={() => { if (!busy) setOpen(false); }} wide>
      <form className="community-form" onSubmit={event => void create(event)}>
        <p className="helper-text">Você será o dono deste novo espaço. Escolha quem vai participar com você.</p>
        <label className="form-field">Nome da comunidade<input name="name" required minLength={3} maxLength={70} placeholder="Ex.: Clube de cinema" /></label>
        <label className="form-field">Descrição<textarea name="description" required minLength={3} maxLength={240} placeholder="O que reúne as pessoas aqui?" /></label>
        <label className="form-field">Categoria<select name="category"><option>Convívio</option><option>Tecnologia</option><option>Negócios</option><option>Esporte</option><option>Cultura</option><option>Criatividade</option></select></label>
        <fieldset className="location-fieldset"><legend>Participantes iniciais</legend>{peopleLoading ? <p>Carregando pessoas...</p> : <MemberPicker members={people} selected={selected} onChange={setSelected} exclude={user ? [user.id] : []} />}</fieldset>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <Button type="submit" disabled={busy || peopleLoading}>{busy ? 'Criando...' : 'Criar comunidade'}</Button>
      </form>
    </Modal>
  </section>;
}
