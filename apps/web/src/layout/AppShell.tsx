import { useState, type ReactNode } from 'react';
import { ResetDemoDialog } from '../features/demo/ResetDemoDialog';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <div className="app-shell">
      {menuOpen && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app-shell__main">
        <Topbar onMenu={() => setMenuOpen(true)} onReset={() => setResetOpen(true)} />
        <main className="page-container">{children}</main>
      </div>
      <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}
