import { RequestsPage } from './pages/RequestsPage';
import { NotesPage } from './pages/NotesPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { Navigate, Route, Routes, BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ToastProvider } from './components/ToastProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { Logo } from './components/Logo';
import { AppShell } from './layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { DirectMessagesPage } from './pages/DirectMessagesPage';
import { EventsPage } from './pages/EventsPage';
import { InvitesPage } from './pages/InvitesPage';
import { MembersPage } from './pages/MembersPage';
import { RolesPage } from './pages/RolesPage';

export interface AppProps {
  initialPath?: string;
}

function AuthenticatedApplication() {
  const { user, loading, activeCommunity } = useAuth();
  if (loading) return <div className="loading-screen"><Logo size="medium" /><p>Carregando demonstração...</p></div>;
  if (!user) return <LoginPage />;

  return (
    <AppShell key={activeCommunity?.id ?? 'default'}>
      <Routes>
        <Route path="/solicitacoes" element={<RequestsPage />} />
        <Route path="/anotacoes" element={<NotesPage />} />
        <Route path="/comunidades" element={<CommunitiesPage />} />
        <Route path="/inicio" element={<DashboardPage />} />
        <Route path="/canais" element={<ChannelsPage />} />
        <Route path="/canais/:channelId" element={<ChannelsPage />} />
        <Route path="/mensagens" element={<DirectMessagesPage />} />
        <Route path="/mensagens/:threadId" element={<DirectMessagesPage />} />
        <Route path="/eventos" element={<EventsPage />} />
        <Route path="/membros" element={<MembersPage />} />
        <Route path="/cargos" element={<RolesPage />} />
        <Route path="/convites" element={<InvitesPage />} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </AppShell>
  );
}

function AppProviders() {
  return <ThemeProvider><ToastProvider><AuthProvider><AuthenticatedApplication /></AuthProvider></ToastProvider></ThemeProvider>;
}

export function App({ initialPath }: AppProps) {
  if (initialPath) return <MemoryRouter initialEntries={[initialPath]}><AppProviders /></MemoryRouter>;
  return <BrowserRouter><AppProviders /></BrowserRouter>;
}
