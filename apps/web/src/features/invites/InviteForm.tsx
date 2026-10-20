import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';

export interface InviteValues { maxUses: number; expiresInDays: number }

export function InviteForm({ busy, error, onSubmit, onCancel }: { busy: boolean; error: string; onSubmit: (values: InviteValues) => Promise<void>; onCancel: () => void }) {
  const [maxUses, setMaxUses] = useState(10);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const submit = (event: FormEvent) => { event.preventDefault(); void onSubmit({ maxUses, expiresInDays }); };
  return (
    <form className="invite-form" onSubmit={submit}>
      <p className="helper-text">O código será gerado automaticamente e ficará salvo no arquivo JSON local.</p>
      <div className="form-grid">
        <label className="form-field">Limite de usos<input type="number" min={1} max={100} required value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} /></label>
        <label className="form-field">Validade (dias)<input type="number" min={1} max={365} required value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Gerando...' : 'Gerar convite'}</Button></div>
    </form>
  );
}
