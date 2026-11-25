import { DEFAULT_USER_PREFERENCES, type Community, type Permission, type PublicUser, type UserPreferences, type SettingsUpdate, type SettingsView } from '@gc/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, TOKEN_KEY, COMMUNITY_KEY } from '../api/client';

interface AuthPayload {
  preferences?: UserPreferences;
  activeCommunity?: Community;
  token: string;
  user: PublicUser;
  permissions: Permission[];
}

interface SessionPayload {
  preferences?: UserPreferences;
  activeCommunity?: Community;
  user: PublicUser;
  permissions: Permission[];
}

interface RegisterValues {
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  preferences: UserPreferences;
  saveSettings: (input: SettingsUpdate) => Promise<SettingsView>;
  activeCommunity: Community | null;
  switchCommunity: (id: string) => Promise<void>;
  user: PublicUser | null;
  permissions: Permission[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (values: RegisterValues) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => structuredClone(DEFAULT_USER_PREFERENCES));
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(COMMUNITY_KEY);
    setActiveCommunity(null);
    setUser(null);
    setPreferences(structuredClone(DEFAULT_USER_PREFERENCES));
    setPermissions([]);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const payload = await api.get<SessionPayload>('/auth/me');
    setActiveCommunity(payload.activeCommunity ?? null);
    if (payload.activeCommunity) localStorage.setItem(COMMUNITY_KEY, payload.activeCommunity.id);
    else localStorage.removeItem(COMMUNITY_KEY);
    setUser(payload.user);
    if (payload.preferences) setPreferences(payload.preferences);
    setPermissions(payload.permissions);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    refreshUser().catch(clearSession).finally(() => setLoading(false));
  }, [clearSession, refreshUser]);

  useEffect(() => {
    window.addEventListener('gc-session-expired', clearSession);
    return () => window.removeEventListener('gc-session-expired', clearSession);
  }, [clearSession]);

  const applyAuth = useCallback((payload: AuthPayload) => {
    localStorage.setItem(TOKEN_KEY, payload.token);
    setActiveCommunity(payload.activeCommunity ?? null);
    if (payload.activeCommunity) localStorage.setItem(COMMUNITY_KEY, payload.activeCommunity.id);
    else localStorage.removeItem(COMMUNITY_KEY);
    setUser(payload.user);
    if (payload.preferences) setPreferences(payload.preferences);
    setPermissions(payload.permissions);
  }, []);

  const switchCommunity = useCallback(async (id: string) => {
    const payload = await api.get<SessionPayload>(`/communities/${encodeURIComponent(id)}/session`);
    localStorage.setItem(COMMUNITY_KEY, id);
    setActiveCommunity(payload.activeCommunity ?? null);
    setUser(payload.user);
    if (payload.preferences) setPreferences(payload.preferences);
    setPermissions(payload.permissions);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    applyAuth(await api.post<AuthPayload>('/auth/login', { email, password }));
  }, [applyAuth]);

  const register = useCallback(async (values: RegisterValues) => {
    applyAuth(await api.post<AuthPayload>('/auth/register', values));
  }, [applyAuth]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const saveSettings = useCallback(async (input: SettingsUpdate) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const saved = await api.patch<SettingsView>('/settings', input);
    if (localStorage.getItem(TOKEN_KEY) === token) {
      setPreferences(saved.preferences);
      setUser(current => current?.id === saved.profile.id ? { ...current, ...saved.profile } : current);
    }
    return saved;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    preferences, saveSettings, activeCommunity, switchCommunity, user, permissions, loading, login, register, logout, refreshUser, clearSession,
  }), [preferences, saveSettings, activeCommunity, switchCommunity, user, permissions, loading, login, register, logout, refreshUser, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return context;
}
