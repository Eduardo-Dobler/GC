import type { MemberView, Role } from '@gc/shared';
import { Ban, CalendarDays, Mail, Shield, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastProvider';

interface MemberProfileModalProps {
  member: MemberView;
  roles: Role[];
  onClose: () => void;
  onUpdate: (member: MemberView) => void;
}

export function MemberProfileModal({ member, roles, onClose, onUpdate }: MemberProfileModalProps) {
  const notify = useToast();
  const [roleId, setRoleId] = useState(member.roleId);
  const [reason, setReason] = useState('Ação realizada durante a demonstração.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setRoleId(member.roleId), [member.id, member.roleId]);

  const changeRole = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await api.patch<MemberView>(`/members/${member.id}/role`, { roleId });
      onUpdate(updated);
      notify('Cargo atualizado com sucesso.', 'success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar o cargo.');
    } finally {
      setBusy(false);
    }
  };

  const moderate = async (action: 'ban' | 'remove') => {
    setBusy(true);
    setError('');
    try {
      const updated = await api.post<MemberView>(`/members/${member.id}/moderation`, { action, reason });
      onUpdate(updated);
      notify(action === 'ban' ? 'Membro banido.' : 'Membro removido.', 'success');
      if (action === 'remove') onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível moderar este membro.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={`Perfil de ${member.name}`} onClose={onClose} wide>
      <div className="member-profile">
        <header className="member-profile__identity">
          <Avatar name={member.name} color={member.avatarColor ?? member.role.color} size="large" status={member.status} />
          <div><h3>{member.name}</h3><span style={{ color: member.role.color }}>{member.role.name}</span></div>
          {member.memberStatus === 'banned' && <Badge tone="danger">Conta banida</Badge>}
        </header>

        <p className="member-profile__bio">{member.bio || 'Sem biografia cadastrada.'}</p>
        <div className="member-profile__facts">
          <span><Mail size={15} /> {member.email}</span>
          <span><CalendarDays size={15} /> Entrou em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(member.joinedAt))}</span>
          <span><Shield size={15} /> {member.role.name}</span>
        </div>

        {member.capabilities.canChangeRole ? (
          <section className="profile-section">
            <h4>Gerenciar cargo</h4>
            <div className="inline-form">
              <label className="form-field" htmlFor={`member-role-${member.id}`}>Alterar cargo
                <select id={`member-role-${member.id}`} value={roleId} onChange={(event) => setRoleId(event.target.value)}>
                  {roles.filter((role) => role.id !== 'role-owner').map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </label>
              <Button onClick={() => void changeRole()} disabled={busy || roleId === member.roleId}>Salvar cargo</Button>
            </div>
          </section>
        ) : member.roleId === 'role-owner' ? (
          <p className="protected-note"><Shield size={16} /> O Dono não pode ser rebaixado, removido ou banido.</p>
        ) : null}

        {member.capabilities.canModerate && (
          <section className="profile-section profile-section--danger">
            <h4>Moderação</h4>
            <label className="form-field" htmlFor={`moderation-reason-${member.id}`}>Motivo
              <input id={`moderation-reason-${member.id}`} value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="danger-actions">
              <Button variant="secondary" onClick={() => void moderate('ban')} disabled={busy || reason.trim().length < 3}><Ban size={16} /> Banir</Button>
              <Button variant="danger" onClick={() => void moderate('remove')} disabled={busy || reason.trim().length < 3}><Trash2 size={16} /> Remover</Button>
            </div>
          </section>
        )}

        <section className="profile-section">
          <h4>Atividade recente</h4>
          <ol className="activity-list">
            {member.activity.length ? member.activity.slice(0, 6).map((item, index) => (
              <li key={`${item.date}-${index}`}><span /> <div><strong>{item.label}</strong><small>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.date))}</small></div></li>
            )) : <li className="muted">Nenhuma atividade registrada.</li>}
          </ol>
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
