import { ArrowRight, LockKeyhole } from 'lucide-react';
import type { DemoAccountView } from '@gc/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';

export function LoginPage() {
  const { login, register } = useAuth();
  const [quickAccounts, setQuickAccounts] = useState<DemoAccountView[]>([]);
  const [accountsError, setAccountsError] = useState(false);
  useEffect(() => { let active = true; api.get<DemoAccountView[]>('/demo/accounts').then(accounts => { if (active) setQuickAccounts(accounts); }).catch(() => { if (active) setAccountsError(true); }); return () => { active = false; }; }, []);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading('form');
    const data = new FormData(event.currentTarget);
    try {
      if (mode === 'login') {
        await login(String(data.get('email')), String(data.get('password')));
      } else {
        await register({
          name: String(data.get('name')),
          email: String(data.get('email')),
          password: String(data.get('password')),
        });
      }
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Não foi possível entrar.');
    } finally {
      setLoading(null);
    }
  }

  async function quickLogin(email: string) {
    setError('');
    setLoading(email);
    try {
      await login(email, 'demo123');
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Não foi possível entrar.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="login-brand"><Logo size="large" /><strong>Gerenciador de Comunidade</strong></div>
        <div className="login-intro__content">
          <span className="eyebrow">Comunicação que aproxima</span>
          <h1>O espaço onde sua comunidade se organiza.</h1>
          <p>O GC transforma conversas, encontros e decisões em uma experiência simples, visual e feita para aproximar pessoas.</p>
          <div className="login-promise"><span>GC</span><div><strong>Uma comunidade mais presente.</strong><small>Entre para continuar construindo junto.</small></div></div>
        </div>
        <div className="login-intro__footer"><LockKeyhole size={17} /> Seu espaço de comunidade, do seu jeito.</div>
      </section>

      <section className="login-panel">
        <div className="login-panel__inner">
          <header className="login-panel__header">
            <Logo size="small" />
            <div><h2>Entre no GC</h2><p>Acesse sua comunidade ou use uma conta rápida.</p></div>
          </header>
          <div className="tabs" role="tablist" aria-label="Tipo de acesso">
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'tabs__active' : ''} onClick={() => setMode('login')}>Entrar</button>
            <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'tabs__active' : ''} onClick={() => setMode('register')}>Criar conta</button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && <label>Nome completo<input name="name" required minLength={3} placeholder="Seu nome" /></label>}
            <label>E-mail<input name="email" type="email" required placeholder="voce@gc.local" /></label>
            <label>Senha<input name="password" type="password" required minLength={mode === 'register' ? 6 : 1} placeholder="••••••••" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" disabled={loading !== null}>{loading === 'form' ? 'Aguarde...' : mode === 'login' ? 'Entrar na comunidade' : 'Criar minha conta'} <ArrowRight size={18} /></Button>
          </form>
          <div className="divider"><span>pessoas e comunidades para explorar</span></div>
          <div className="quick-accounts">{accountsError && <p className="muted">Atalhos indisponíveis. Entre com seu e-mail e senha.</p>}
            {quickAccounts.map((account) => (
              <button
                key={account.email}
                className="quick-account"
                onClick={() => void quickLogin(account.email)}
                disabled={loading !== null}
                aria-label={`Entrar como ${account.name} — ${account.role.name}`}
              >
                <span className="quick-account__dot" style={{ backgroundColor: account.avatarColor ?? account.role.color }} />
                <span className="quick-account__details"><strong>{account.name}</strong><small>{account.role.name}</small><span className="quick-account__memberships">{account.memberships.map(membership => <span key={membership.community.id}><b>{membership.community.name}</b><small>{membership.roleDescription}</small></span>)}</span></span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
          <p className="quick-hint">Todas as contas usam a senha <code>demo123</code>.</p>
        </div>
      </section>
    </main>
  );
}
