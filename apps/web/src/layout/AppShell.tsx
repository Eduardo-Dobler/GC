import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../components/ToastProvider';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ResetDemoDialog } from '../features/demo/ResetDemoDialog';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [savingSidebar, setSavingSidebar] = useState(false);
  const { preferences, saveSettings } = useAuth();
  const notify = useToast();
  const mobile = useMediaQuery('(max-width: 820px)');
  const { pathname } = useLocation();
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(closeMenu, [pathname, mobile, closeMenu]);
  const drawerOpen = mobile && menuOpen;

  async function toggleCompact() {
    if (savingSidebar) return;
    setSavingSidebar(true);
    try { await saveSettings({ preferences: { compactSidebar: !preferences.compactSidebar } }); }
    catch (caught) { notify(caught instanceof Error ? caught.message : 'Não foi possível alterar o menu.', 'error'); }
    finally { setSavingSidebar(false); }
  }

  return <div className={`app-shell ${preferences.compactSidebar ? 'app-shell--compact' : ''}`}>
    {drawerOpen && <button className="mobile-overlay" aria-label="Fechar navegação" tabIndex={-1} onClick={closeMenu} />}
    <Sidebar open={drawerOpen} mobile={mobile} onClose={closeMenu} />
    <div className="app-shell__main" inert={drawerOpen} aria-hidden={drawerOpen ? true : undefined}>
      <Topbar onMenu={() => setMenuOpen(true)} menuOpen={drawerOpen} compact={preferences.compactSidebar} onToggleCompact={() => void toggleCompact()} savingSidebar={savingSidebar} onReset={() => setResetOpen(true)} />
      <main className="page-container">{children}</main>
    </div>
    <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} />
  </div>;
}
