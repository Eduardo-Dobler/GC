import type { Invite } from '@gc/shared';
import { Copy, Plus, RefreshCw, Ticket, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useToast } from '../components/ToastProvider';
import { InviteForm, type InviteValues } from '../features/invites/InviteForm';

type InviteStatus = 'active' | 'expired' | 'used' | 'revoked';
type InviteView = Invite & { status: InviteStatus };
const STATUS = {
  active: { label: 'Ativo', tone: 'success' }, expired: { label: 'Expirado', tone: 'warning' },
  used: { label: 'Esgotado', tone: 'warning' }, revoked: { label: 'Revogado', tone: 'danger' },
} as const;

export function InvitesPage() {
  const { permissions } = useAuth();
  const notify = useToast();
  const canCreate = permissions.includes('CREATE_INVITES');
  const [invites, setInvites] = useState<InviteView[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setInvites(await api.get<InviteView[]>('/invites')); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os convites.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const createInvite = async (values: InviteValues) => {
    setBusy(true);
    setError('');
    try {
      const invite = await api.post<Invite>('/invites', values);
      setInvites((current) => [{ ...invite, status: 'active' }, ...current]);
      setFormOpen(false);
      notify('Convite criado com sucesso.', 'success');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível criar o convite.'); }
    finally { setBusy(false); }
  };

  const revoke = async (invite: InviteView) => {
    setBusy(true);
    try {
      await api.delete(`/invites/${invite.id}`);
      setInvites((current) => current.map((item) => item.id === invite.id ? { ...item, status: 'revoked', revokedAt: new Date().toISOString() } : item));
      notify('Convite revogado.', 'success');
    } catch (caught) { notify(caught instanceof Error ? caught.message : 'Não foi possível revogar o convite.', 'error'); }
    finally { setBusy(false); }
  };

  const copy = async (invite: InviteView) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(invite.link);
      setManualCopy(null);
      notify('Link copiado.', 'success');
    } catch {
      const input = document.getElementById(`invite-link-${invite.id}`) as HTMLInputElement | null;
      input?.focus();
      input?.select();
      setManualCopy(invite.id);
      notify('Selecione e copie manualmente', 'info');
    }
  };

  if (loading) return <div className="page-state"><span className="spinner" /> Carregando convites...</div>;
  if (error && !invites.length) return <div className="page-state page-state--error"><p>{error}</p><Button variant="secondary" onClick={() => void load()}><RefreshCw size={17} /> Tentar novamente</Button></div>;

  return (
    <section className="page invites-page">
      <div className="page-heading">
        <div><span className="eyebrow">Acesso local</span><h1>Convites</h1><p>Crie códigos para demonstrar a entrada de novos membros.</p></div>
        {canCreate && <Button onClick={() => { setError(''); setFormOpen(true); }}><Plus size={17} /> Novo convite</Button>}
      </div>
      <div className="offline-callout"><Ticket size={20} /><div><strong>Links funcionam somente nesta demonstração local</strong><p>Não há envio por e-mail nem comunicação com serviços externos.</p></div></div>
      {invites.length ? <div className="invite-list">{invites.map((invite) => {
        const status = STATUS[invite.status];
        return <article className="invite-card" key={invite.id}><header><code>{invite.code}</code><Badge tone={status.tone}>{status.label}</Badge></header><div className="invite-link"><input id={`invite-link-${invite.id}`} readOnly value={invite.link} aria-label={`Link do convite ${invite.code}`} /><button className="icon-button" onClick={() => void copy(invite)} aria-label={`Copiar convite ${invite.code}`}><Copy size={17} /></button></div>{manualCopy === invite.id && <p className="copy-fallback">Selecione e copie manualmente</p>}<dl><div><dt>Validade</dt><dd>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(invite.expiresAt))}</dd></div><div><dt>Usos</dt><dd>{invite.uses} de {invite.maxUses}</dd></div></dl>{canCreate && invite.status === 'active' && <button className="invite-revoke" disabled={busy} onClick={() => void revoke(invite)}><Trash2 size={15} /> Revogar convite</button>}</article>;
      })}</div> : <div className="empty-card"><div><Ticket size={30} /><p>Nenhum convite cadastrado.</p></div></div>}
      <Modal open={formOpen} title="Gerar novo convite" onClose={() => setFormOpen(false)}><InviteForm busy={busy} error={error} onSubmit={createInvite} onCancel={() => setFormOpen(false)} /></Modal>
    </section>
  );
}
