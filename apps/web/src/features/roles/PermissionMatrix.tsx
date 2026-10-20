import { Check, Minus, ShieldCheck } from 'lucide-react';
import { PERMISSIONS, PERMISSION_LABELS, type Role } from '@gc/shared';

export function PermissionMatrix({ roles }: { roles: Role[] }) {
  const displayed = roles.filter((role) => role.system).sort((left, right) => right.rank - left.rank);
  return (
    <section className="surface permission-surface">
      <header className="surface__header"><div><h2>Matriz de permissões</h2><p>Compare o acesso dos cinco cargos padrão.</p></div><ShieldCheck size={21} /></header>
      <div className="permission-table-wrap">
        <table className="permission-table">
          <thead><tr><th>Permissão</th>{displayed.map((role) => <th key={role.id}><span style={{ color: role.color }}>{role.name}</span></th>)}</tr></thead>
          <tbody>
            {PERMISSIONS.map((permission) => (
              <tr key={permission}>
                <th scope="row">{PERMISSION_LABELS[permission]}</th>
                {displayed.map((role) => <td key={role.id} aria-label={`${role.name}: ${role.permissions.includes(permission) ? 'permitido' : 'não permitido'}`}>{role.permissions.includes(permission) ? <Check className="permission-yes" size={17} /> : <Minus className="permission-no" size={17} />}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="protected-note permission-protected"><ShieldCheck size={16} /> O cargo de Dono é protegido.</p>
    </section>
  );
}
