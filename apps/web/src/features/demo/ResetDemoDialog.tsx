import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';

export function ResetDemoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clearSession } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setConfirmation(''); setError(''); }
  }, [open]);

  const reset = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post<{ restored: true }>('/demo/reset', { confirmation });
      clearSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível restaurar a demonstração.');
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} title="Restaurar demonstração" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" disabled={busy || confirmation !== 'RESTAURAR'} onClick={() => void reset()}><RotateCcw size={16} /> {busy ? 'Restaurando...' : 'Confirmar restauração'}</Button></>}>
      <div className="reset-dialog">
        <span className="reset-dialog__icon"><AlertTriangle size={25} /></span>
        <div><h3>Voltar aos dados iniciais?</h3><p>Mensagens, eventos, cargos, convites e membros serão restaurados. Todas as sessões serão encerradas.</p></div>
      </div>
      <label className="form-field" htmlFor="reset-confirmation">Digite RESTAURAR<input id="reset-confirmation" value={confirmation} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} placeholder="RESTAURAR" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
