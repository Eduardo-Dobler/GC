import { useEffect, useState, type FormEvent } from 'react';
import { Bot, Check, Keyboard, Moon, Palette, Save, Settings, Sun, UserRound } from 'lucide-react';
import { AUTO_REPLY_TIME_ZONES, type SettingsView, type UserPreferences } from '@gc/shared';
import { useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { useTheme } from '../components/ThemeProvider';
import { useToast } from '../components/ToastProvider';

const zoneLabels: Record<string, string> = {
  'America/Sao_Paulo': 'Brasília / São Paulo', 'America/Manaus': 'Manaus',
  'America/Rio_Branco': 'Rio Branco', 'America/Noronha': 'Fernando de Noronha',
  'Europe/Lisbon': 'Lisboa', UTC: 'UTC',
};

export function SettingsPage() {
  const { user, preferences, saveSettings } = useAuth();
  const { theme, setTheme } = useTheme();
  const notify = useToast();
  const [profile, setProfile] = useState(() => ({ name: user!.name, bio: user!.bio, status: user!.status, avatarColor: user!.avatarColor ?? '#ff6a00' }));
  const [draft, setDraft] = useState<UserPreferences>(() => structuredClone(preferences));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // O atalho da barra superior salva esta preferência fora do formulário.
  useEffect(() => {
    setDraft(current => ({ ...current, compactSidebar: preferences.compactSidebar }));
  }, [preferences.compactSidebar]);

  function applySaved(saved: SettingsView) {
    const { name, bio, status, avatarColor } = saved.profile;
    setProfile({ name, bio, status, avatarColor: avatarColor ?? '#ff6a00' });
    setDraft(structuredClone(saved.preferences));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try {
      applySaved(await saveSettings({ profile, preferences: draft }));
      notify('Configurações salvas.', 'success');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar as configurações.'); }
    finally { setSaving(false); }
  }
  function changeReply(values: Partial<UserPreferences['autoReply']>) {
    setDraft(current => ({ ...current, autoReply: { ...current.autoReply, ...values } }));
  }

  return <section className="page settings-page">
    <div className="page-heading"><div><span className="eyebrow">Seu GC, do seu jeito</span><h1>Configurações</h1><p>Ajuste seu perfil, suas conversas e a forma de navegar.</p></div><span className="settings-heading-icon" aria-hidden="true"><Settings size={26} /></span></div>
    <form onSubmit={submit}>
      <fieldset className="settings-fields" disabled={saving}>
        <legend className="sr-only">Configurações pessoais</legend>
        <div className="settings-grid">
          <section className="surface settings-card settings-auto-reply" aria-labelledby="auto-reply-title">
            <header className="settings-card__header"><span className="settings-card__icon"><Bot size={21} /></span><div><h2 id="auto-reply-title">Resposta automática</h2><p>Receba cada pessoa com uma mensagem sua.</p></div></header>
            <label className="settings-option"><span><strong>Ativar resposta automática</strong><small>Uma resposta por pessoa, na primeira mensagem recebida do dia.</small></span><input type="checkbox" checked={draft.autoReply.enabled} onChange={event => changeReply({ enabled: event.target.checked })} /></label>
            <div className="form-field"><label htmlFor="auto-reply-message">Sua mensagem automática</label><textarea id="auto-reply-message" rows={5} maxLength={500} required={draft.autoReply.enabled} value={draft.autoReply.message} onChange={event => changeReply({ message: event.target.value })} placeholder="Ex.: Olá! Estou em aula e respondo no intervalo." /></div>
            <div className="settings-field-help"><span>O texto será enviado em seu nome, com a indicação de resposta automática.</span><span>{draft.autoReply.message.length}/500</span></div>
            <div className="form-field"><label htmlFor="auto-reply-timezone">Fuso horário para a virada do dia</label><select id="auto-reply-timezone" value={draft.autoReply.timeZone} onChange={event => changeReply({ timeZone: event.target.value })}>{AUTO_REPLY_TIME_ZONES.map(zone => <option key={zone} value={zone}>{zoneLabels[zone]}</option>)}</select></div>
            <div className="auto-reply-preview"><span className="eyebrow">Prévia da mensagem</span><div><Avatar name={profile.name || user!.name} color={profile.avatarColor} size="small" /><div><strong>{profile.name || user!.name}</strong><span className="automatic-message-label"><Bot size={12} /> Resposta automática</span><p>{draft.autoReply.message.trim() || 'Sua mensagem aparecerá aqui.'}</p></div></div></div>
            <p className="helper-text settings-explanation">Funciona em conversas individuais já aceitas, mesmo quando você está offline. Não responde em grupos ou canais e não responde a outras mensagens automáticas. Se a pessoa já falou com você hoje, a próxima resposta será no dia seguinte.</p>
          </section>

          <section className="surface settings-card" aria-labelledby="profile-title">
            <header className="settings-card__header"><span className="settings-card__icon"><UserRound size={21} /></span><div><h2 id="profile-title">Meu perfil</h2><p>Como você aparece nas comunidades.</p></div></header>
            <div className="settings-profile"><Avatar name={profile.name || user!.name} color={profile.avatarColor} status={profile.status} /><div><strong>{user!.name}</strong><span>{user!.email}</span></div></div>
            <div className="form-field"><label htmlFor="profile-name">Nome de exibição</label><input id="profile-name" minLength={3} maxLength={60} required value={profile.name} onChange={event => setProfile(current => ({ ...current, name: event.target.value }))} autoComplete="name" /></div>
            <div className="form-field"><label htmlFor="profile-bio">Sobre você</label><textarea id="profile-bio" rows={3} maxLength={500} value={profile.bio} onChange={event => setProfile(current => ({ ...current, bio: event.target.value }))} placeholder="Conte um pouco sobre você." /></div>
            <div className="settings-profile-options"><div className="form-field"><label htmlFor="profile-status">Status</label><select id="profile-status" value={profile.status} onChange={event => setProfile(current => ({ ...current, status: event.target.value as typeof current.status }))}><option value="online">Online</option><option value="away">Ausente</option><option value="offline">Offline</option></select></div><div className="form-field"><label htmlFor="profile-color">Cor do avatar</label><input id="profile-color" type="color" value={profile.avatarColor} onChange={event => setProfile(current => ({ ...current, avatarColor: event.target.value }))} /></div></div>
            <p className="helper-text">Seu perfil é o mesmo em todas as comunidades. A resposta automática funciona independentemente do status escolhido.</p>
          </section>

          <section className="surface settings-card settings-appearance" aria-labelledby="appearance-title">
            <header className="settings-card__header"><span className="settings-card__icon"><Palette size={21} /></span><div><h2 id="appearance-title">Aparência e navegação</h2><p>Deixe o GC confortável para sua rotina.</p></div></header>
            <div className="settings-appearance__grid"><div><h3>Tema neste navegador</h3><div className="theme-options"><button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Sun size={19} /><span>Claro</span>{theme === 'light' && <Check size={16} />}</button><button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Moon size={19} /><span>Escuro</span>{theme === 'dark' && <Check size={16} />}</button></div><p className="helper-text">O tema é aplicado e salvo imediatamente neste navegador.</p></div><div className="settings-preferences"><label className="settings-option"><span><strong>Barra lateral compacta</strong><small>Exibe apenas os ícones no computador. No celular, o menu continua completo.</small></span><input type="checkbox" checked={draft.compactSidebar} onChange={event => setDraft(current => ({ ...current, compactSidebar: event.target.checked }))} /></label><label className="settings-option"><span><strong>Enviar mensagens com Enter</strong><small>Shift+Enter quebra a linha. Com a opção desativada, use o botão de envio ou Ctrl+Enter.</small></span><input type="checkbox" checked={draft.sendOnEnter} onChange={event => setDraft(current => ({ ...current, sendOnEnter: event.target.checked }))} /></label><span className="settings-keyboard-hint"><Keyboard size={15} /> Vale para canais e mensagens diretas.</span></div></div>
          </section>
        </div>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <footer className="settings-save"><span>Perfil e preferências são salvos na sua conta.</span><div><Button variant="secondary" disabled={saving} onClick={() => { applySaved({ profile: user!, preferences }); setError(''); }}>Descartar alterações</Button><Button type="submit" disabled={saving}><Save size={17} />{saving ? 'Salvando...' : 'Salvar configurações'}</Button></div></footer>
    </form>
  </section>;
}
