import type { Role } from '@gc/shared';
import { LockKeyhole, Pencil, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useToast } from '../components/ToastProvider';
import { PermissionMatrix } from '../features/roles/PermissionMatrix';
import { RoleForm, type RoleValues } from '../features/roles/RoleForm';

export function RolesPage() {
  const { permissions } = useAuth();
  const notify = useToast();
  const canManage = permissions.includes('MANAGE_ROLES');
  const [roles, setRoles] = useState<Role[]>([]);
  const [editing, setEditing] = useState<Role | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setRoles(await api.get<Role[]>('/roles')); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os cargos.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (values: RoleValues) => {
    setBusy(true);
    setError('');
    try {
      const saved = editing === 'new'
        ? await api.post<Role>('/roles', values)
        : await api.patch<Role>(`/roles/${editing!.id}`, values);
      setRoles((current) => editing === 'new' ? [...current, saved].sort((a, b) => b.rank - a.rank) : current.map((role) => role.id === saved.id ? saved : role));
      setEditing(null);
      notify(editing === 'new' ? 'Cargo criado com sucesso.' : 'Cargo atualizado.', 'success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o cargo.');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="page-state"><span className="spinner" /> Carregando cargos...</div>;
  if (error && !roles.length) return <div className="page-state page-state--error"><p>{error}</p><Button variant="secondary" onClick={() => void load()}><RefreshCw size={17} /> Tentar novamente</Button></div>;

  const activeRole = editing && editing !== 'new' ? editing : undefined;
  return (
    <section className="page roles-page">
      <div className="page-heading">
        <div><span className="eyebrow">Acesso e segurança</span><h1>Cargos</h1><p>Defina responsabilidades por meio de permissões claras.</p></div>
        {canManage && <Button onClick={() => { setError(''); setEditing('new'); }}><Plus size={17} /> Novo cargo</Button>}
      </div>
      <div className="role-cards">
        {roles.map((role) => <article key={role.id} className="role-card" style={{ borderTopColor: role.color }}><header><span className="role-card__icon" style={{ color: role.color, backgroundColor: `${role.color}18` }}><ShieldCheck size={20} /></span><div><h2>{role.name}</h2><small>{role.system ? 'Cargo padrão' : 'Cargo personalizado'}</small></div>{role.id === 'role-owner' && <LockKeyhole size={16} />}</header><strong>{role.permissions.length}</strong><span>permissões ativas</span>{canManage && role.id !== 'role-owner' ? <button className="button button--secondary button--small" onClick={() => { setError(''); setEditing(role); }} aria-label={`Editar ${role.name}`}><Pencil size={15} /> Editar</button> : <span className="role-card__locked">{role.id === 'role-owner' ? 'Protegido' : 'Somente leitura'}</span>}</article>)}
      </div>
      <PermissionMatrix roles={roles} />
      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Criar novo cargo' : `Editar ${activeRole?.name ?? 'cargo'}`} onClose={() => setEditing(null)} wide>
        <RoleForm role={activeRole} busy={busy} error={error} onSubmit={save} onCancel={() => setEditing(null)} />
      </Modal>
    </section>
  );
}
