import type { MemberView, Role } from '@gc/shared';
import { RefreshCw, Search, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { MemberCard } from '../features/members/MemberCard';
import { MemberProfileModal } from '../features/members/MemberProfileModal';

export function MembersPage() {
  const [members, setMembers] = useState<MemberView[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<MemberView | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [memberData, roleData] = await Promise.all([
        api.get<MemberView[]>('/members'),
        api.get<Role[]>('/roles'),
      ]);
      setMembers(memberData);
      setRoles(roleData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os membros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return members;
    return members.filter((member) => `${member.name} ${member.email} ${member.role.name}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [members, query]);

  const updateMember = (updated: MemberView) => {
    setMembers((current) => current.map((member) => member.id === updated.id ? updated : member));
    setSelected(updated);
  };

  if (loading) return <div className="page-state"><span className="spinner" /> Carregando membros...</div>;
  if (error) return <div className="page-state page-state--error"><p>{error}</p><Button variant="secondary" onClick={() => void load()}><RefreshCw size={17} /> Tentar novamente</Button></div>;

  return (
    <section className="page members-page">
      <div className="page-heading">
        <div><span className="eyebrow">Comunidade SENAC Tech</span><h1>Membros</h1><p>Conheça as pessoas e gerencie o acesso à comunidade.</p></div>
        <BadgeCount count={members.length} />
      </div>
      <label className="page-search"><Search size={18} /><span className="sr-only">Buscar membros</span><input aria-label="Buscar membros" placeholder="Buscar por nome, e-mail ou cargo" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {filtered.length ? <div className="members-grid">{filtered.map((member) => <MemberCard key={member.id} member={member} onOpen={() => setSelected(member)} />)}</div> : <div className="empty-card"><div><Users size={30} /><p>Nenhum membro corresponde à busca.</p></div></div>}
      {selected && <MemberProfileModal member={selected} roles={roles} onClose={() => setSelected(null)} onUpdate={updateMember} />}
    </section>
  );
}

function BadgeCount({ count }: { count: number }) {
  return <span className="heading-count"><Users size={17} /> {count} {count === 1 ? 'membro' : 'membros'}</span>;
}
