import { useMemo, useState } from 'react';
import type { PublicUser } from '@gc/shared';
import { Avatar } from './Avatar';

export function MemberPicker({ members, selected, onChange, exclude = [] }: { members: PublicUser[]; selected: string[]; onChange: (ids: string[]) => void; exclude?: string[] }) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return members.filter((member) => !exclude.includes(member.id) && (!term || `${member.name} ${member.email} ${member.role.name}`.toLocaleLowerCase('pt-BR').includes(term)));
  }, [exclude, members, query]);
  return <div className="member-picker">
    <input aria-label="Buscar pessoas" placeholder="Buscar por nome, e-mail ou cargo" value={query} onChange={(event) => setQuery(event.target.value)} />
    <div className="member-picker__list">{visible.map((member) => <label key={member.id} className="member-picker__item"><input type="checkbox" checked={selected.includes(member.id)} onChange={() => onChange(selected.includes(member.id) ? selected.filter((id) => id !== member.id) : [...selected, member.id])} /><Avatar name={member.name} color={member.avatarColor ?? member.role.color} size="small" /><span><strong>{member.name}</strong><small>{member.role.name} · {member.email}</small></span></label>)}</div>
    {!visible.length && <p className="helper-text">Nenhuma pessoa encontrada.</p>}
  </div>;
}
