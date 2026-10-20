import { PERMISSIONS, PERMISSION_LABELS, type Permission, type Role } from '@gc/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';

export interface RoleValues {
  name: string;
  color: string;
  permissions: Permission[];
}

interface RoleFormProps {
  role?: Role;
  busy: boolean;
  error: string;
  onSubmit: (values: RoleValues) => Promise<void>;
  onCancel: () => void;
}

export function RoleForm({ role, busy, error, onSubmit, onCancel }: RoleFormProps) {
  const locked = role?.id === 'role-owner';
  const [name, setName] = useState(role?.name ?? '');
  const [color, setColor] = useState(role?.color ?? '#2563eb');
  const [permissions, setPermissions] = useState<Permission[]>(role?.permissions ?? []);

  useEffect(() => {
    setName(role?.name ?? '');
    setColor(role?.color ?? '#2563eb');
    setPermissions(role?.permissions ?? []);
  }, [role]);

  const toggle = (permission: Permission) => setPermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit({ name, color, permissions });
  };

  return (
    <form className="role-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field">Nome do cargo<input required minLength={2} maxLength={40} value={name} disabled={locked || Boolean(role?.system)} onChange={(event) => setName(event.target.value)} /></label>
        <label className="form-field">Cor do cargo<span className="color-field"><input type="color" value={color} disabled={locked} onChange={(event) => setColor(event.target.value)} /><code>{color}</code></span></label>
      </div>
      <fieldset className="permission-checklist" disabled={locked}>
        <legend>Permissões</legend>
        {PERMISSIONS.map((permission) => <label key={permission}><input type="checkbox" checked={permissions.includes(permission)} onChange={() => toggle(permission)} /><span>{PERMISSION_LABELS[permission]}</span></label>)}
      </fieldset>
      {locked && <p className="protected-note">O cargo de Dono não pode ser alterado.</p>}
      {role?.system && !locked && <p className="helper-text">O nome do cargo padrão é fixo; cor e permissões podem ser ajustadas.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy || locked || name.trim().length < 2}>{busy ? 'Salvando...' : role ? 'Salvar alterações' : 'Criar cargo'}</Button></div>
    </form>
  );
}
