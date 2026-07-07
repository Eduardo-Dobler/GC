import './style.css';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import {
  getCurrentSession,
  onAuthChange,
  signUpUser,
  signInUser,
  signOutUser,
  loadProfile,
  updateProfile
} from './services/authService.js';
import { uploadAvatar } from './services/storageService.js';
import {
  PERMISSIONS,
  createTeam,
  joinTeamByCode,
  loadMyTeams,
  loadTeamBundle,
  createRole,
  updateRole,
  deleteRole,
  updateMemberRole,
  removeMember,
  createGroup,
  deleteGroup,
  createEvent,
  deleteEvent,
  createAnnouncement,
  deleteAnnouncement
} from './services/teamService.js';
import {
  createChat,
  deleteChat,
  getMessages,
  sendMessage,
  subscribeToMessages
} from './services/chatService.js';

const app = document.querySelector('#app');
const toastArea = document.querySelector('#toastArea');

const state = {
  session: null,
  profile: null,
  teamRows: [],
  currentTeamId: null,
  currentTeam: null,
  currentMember: null,
  currentView: 'dashboard',
  roles: [],
  members: [],
  groups: [],
  chats: [],
  events: [],
  announcements: [],
  selectedChatId: null,
  messages: [],
  unsubscribeMessages: null,
  authListener: null
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function initials(name = 'GC') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'GC';
}

function formatDate(date) {
  if (!date) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(date));
}

function toast(message, type = 'success') {
  const element = document.createElement('div');
  element.className = `toast ${type}`;
  element.textContent = message;
  toastArea.appendChild(element);
  setTimeout(() => element.remove(), 3600);
}

function setLoading(button, isLoading, label = 'Salvando...') {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function getPendingInviteCode() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('invite');
  if (code) sessionStorage.setItem('gc_pending_invite', code.trim().toUpperCase());
  return sessionStorage.getItem('gc_pending_invite');
}

function clearPendingInviteCode() {
  sessionStorage.removeItem('gc_pending_invite');
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  window.history.replaceState({}, '', url.toString());
}

function currentUserId() {
  return state.session?.user?.id;
}

function isOwner() {
  return state.currentTeam?.owner_id === currentUserId();
}

function can(permission) {
  if (isOwner()) return true;
  const permissions = state.currentMember?.roles?.permissions || [];
  return permissions.includes(permission);
}

function avatar(profile, size = 'md') {
  const name = profile?.name || profile?.username || 'Usuário';
  if (profile?.avatar_url) {
    return `<img class="avatar ${size}" src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(name)}" />`;
  }
  return `<div class="avatar ${size} avatar-fallback">${escapeHtml(initials(name))}</div>`;
}

function badge(text, color = '#ff7a1a') {
  return `<span class="badge" style="--badge-color: ${escapeHtml(color)}">${escapeHtml(text)}</span>`;
}

function inviteLink(code) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('invite', code);
  return url.toString();
}

async function boot() {
  if (!isSupabaseConfigured) {
    renderMissingConfig();
    return;
  }

  const pendingCode = getPendingInviteCode();
  state.session = await getCurrentSession();

  if (!state.authListener) {
    state.authListener = onAuthChange(async session => {
      state.session = session;
      if (!session) {
        resetAppState();
        renderAuth();
        return;
      }
      await loadUserArea(pendingCode || getPendingInviteCode());
    });
  }

  if (!state.session) {
    renderAuth();
    return;
  }

  await loadUserArea(pendingCode);
}

function resetAppState() {
  if (state.unsubscribeMessages) state.unsubscribeMessages();
  state.profile = null;
  state.teamRows = [];
  state.currentTeamId = null;
  state.currentTeam = null;
  state.currentMember = null;
  state.currentView = 'dashboard';
  state.roles = [];
  state.members = [];
  state.groups = [];
  state.chats = [];
  state.events = [];
  state.announcements = [];
  state.selectedChatId = null;
  state.messages = [];
  state.unsubscribeMessages = null;
}

async function loadUserArea(pendingCode = null) {
  try {
    state.profile = await loadProfile(currentUserId());

    if (pendingCode) {
      try {
        await joinTeamByCode(pendingCode);
        toast('Você entrou na equipe pelo convite.');
        clearPendingInviteCode();
      } catch (error) {
        toast(error.message || 'Não foi possível entrar pelo convite.', 'error');
      }
    }

    state.teamRows = await loadMyTeams(currentUserId());

    if (!state.teamRows.length) {
      renderTeamSetup();
      return;
    }

    const selectedExists = state.teamRows.some(row => row.team_id === state.currentTeamId);
    if (!selectedExists) state.currentTeamId = state.teamRows[0].team_id;

    await loadCurrentTeam();
    renderShell();
    await renderCurrentView();
  } catch (error) {
    console.error(error);
    toast(error.message || 'Erro ao carregar sua conta.', 'error');
  }
}

async function loadCurrentTeam() {
  const teamRow = state.teamRows.find(row => row.team_id === state.currentTeamId);
  state.currentTeam = teamRow?.teams || null;
  state.currentMember = teamRow || null;

  if (!state.currentTeamId) return;

  const bundle = await loadTeamBundle(state.currentTeamId);
  state.roles = bundle.roles;
  state.members = bundle.members;
  state.groups = bundle.groups;
  state.chats = bundle.chats;
  state.events = bundle.events;
  state.announcements = bundle.announcements;

  if (!state.selectedChatId || !state.chats.some(chat => chat.id === state.selectedChatId)) {
    state.selectedChatId = state.chats[0]?.id || null;
  }
}

function renderMissingConfig() {
  app.innerHTML = `
    <main class="auth-screen single">
      <section class="auth-brand wide">
        <div class="brand-card">
          <div class="logo-big">GC</div>
          <p class="eyebrow">Configuração necessária</p>
          <h1>Conecte o projeto ao Supabase antes de rodar.</h1>
          <p class="muted">
            Crie um arquivo <b>.env</b> na raiz do projeto usando o modelo <b>.env.example</b>.
          </p>
          <pre class="code-block">VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA</pre>
          <p class="muted small">
            Depois rode <b>npm install</b> e <b>npm run dev</b>. O passo a passo completo está no README.md.
          </p>
        </div>
      </section>
    </main>
  `;
}

function renderAuth() {
  const pendingCode = getPendingInviteCode();
  app.innerHTML = `
    <main class="auth-screen">
      <section class="auth-brand">
        <div class="brand-card">
          <div class="logo-big">GC</div>
          <p class="eyebrow">Gerenciador de Comunidade Profissional</p>
          <h1>Equipes, cargos, grupos, eventos e chats em tempo real.</h1>
          <p class="muted">
            Uma base real com Vite + Supabase para login, banco de dados, convites,
            cargos, grupos, chats segmentados e mensagens simultâneas.
          </p>
          <div class="feature-list">
            <span>Supabase Auth</span>
            <span>Banco PostgreSQL</span>
            <span>Realtime Chat</span>
            <span>Storage para fotos</span>
            <span>RLS Segurança</span>
          </div>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-box">
          ${pendingCode ? `<div class="notice">Convite detectado: <b>${escapeHtml(pendingCode)}</b>. Entre ou crie uma conta para participar.</div>` : ''}
          <div class="auth-tabs">
            <button class="tab-btn active" data-auth-tab="login">Entrar</button>
            <button class="tab-btn" data-auth-tab="register">Criar conta</button>
          </div>

          <form id="loginForm" class="form active">
            <h2>Entrar no GC</h2>
            <p class="muted small">Use seu e-mail e senha cadastrados no Supabase.</p>
            <label for="loginEmail">E-mail</label>
            <input id="loginEmail" type="email" placeholder="seuemail@empresa.com" required />
            <label for="loginPassword">Senha</label>
            <input id="loginPassword" type="password" placeholder="Sua senha" required />
            <button class="primary-btn" type="submit">Entrar</button>
          </form>

          <form id="registerForm" class="form">
            <h2>Criar usuário</h2>
            <label for="registerName">Nome completo</label>
            <input id="registerName" placeholder="Ex: Lorenzo Posser" required />
            <label for="registerUsername">Nome de usuário</label>
            <input id="registerUsername" placeholder="Ex: lorenzo.dev" required />
            <label for="registerEmail">E-mail</label>
            <input id="registerEmail" type="email" placeholder="seuemail@empresa.com" required />
            <label for="registerPassword">Senha</label>
            <input id="registerPassword" type="password" minlength="6" placeholder="Mínimo 6 caracteres" required />
            <label for="registerPhoto">Foto de perfil</label>
            <input id="registerPhoto" type="file" accept="image/*" />
            <button class="primary-btn" type="submit">Criar conta</button>
          </form>
        </div>
      </section>
    </main>
  `;

  document.querySelectorAll('[data-auth-tab]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const target = button.dataset.authTab;
      document.querySelector('#loginForm').classList.toggle('active', target === 'login');
      document.querySelector('#registerForm').classList.toggle('active', target === 'register');
    });
  });

  document.querySelector('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, 'Entrando...');
    try {
      await signInUser({
        email: document.querySelector('#loginEmail').value,
        password: document.querySelector('#loginPassword').value
      });
      toast('Login realizado.');
    } catch (error) {
      toast(error.message || 'Erro ao entrar.', 'error');
    } finally {
      setLoading(button, false);
    }
  });

  document.querySelector('#registerForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, 'Criando...');
    try {
      const photo = document.querySelector('#registerPhoto').files[0];
      const data = await signUpUser({
        name: document.querySelector('#registerName').value,
        username: document.querySelector('#registerUsername').value,
        email: document.querySelector('#registerEmail').value,
        password: document.querySelector('#registerPassword').value
      });

      if (data.session && photo) {
        const photoUrl = await uploadAvatar(data.user.id, photo);
        await updateProfile(data.user.id, { avatar_url: photoUrl });
      }

      if (!data.session) {
        toast('Conta criada. Confirme seu e-mail ou desative a confirmação no Supabase para testar.', 'success');
      } else {
        toast('Conta criada com sucesso.');
      }
    } catch (error) {
      toast(error.message || 'Erro ao cadastrar.', 'error');
    } finally {
      setLoading(button, false);
    }
  });
}

function renderTeamSetup() {
  const pendingCode = getPendingInviteCode();
  app.innerHTML = `
    <main class="setup-screen">
      <section class="setup-card">
        <div class="setup-header">
          <div>
            <p class="eyebrow">Primeiro acesso</p>
            <h1>Crie uma equipe ou entre em uma já existente</h1>
            <p class="muted">Use código de convite, como Google Classroom, ou link, como Discord.</p>
          </div>
          <button id="setupLogoutBtn" class="ghost-btn">Sair</button>
        </div>

        ${pendingCode ? `<div class="notice">Convite pendente: <b>${escapeHtml(pendingCode)}</b></div>` : ''}

        <div class="setup-grid">
          <form id="createTeamForm" class="panel form-card">
            <h2>Criar equipe</h2>
            <label for="teamName">Nome da equipe</label>
            <input id="teamName" placeholder="Ex: Equipe Marketing" required />
            <label for="teamDescription">Descrição</label>
            <textarea id="teamDescription" placeholder="Resumo da finalidade da equipe"></textarea>
            <button class="primary-btn" type="submit">Criar equipe</button>
          </form>

          <form id="joinTeamForm" class="panel form-card">
            <h2>Entrar com código</h2>
            <label for="joinCode">Código da equipe</label>
            <input id="joinCode" value="${escapeHtml(pendingCode || '')}" placeholder="Ex: GC-A1B2C3D4" required />
            <button class="secondary-btn" type="submit">Entrar na equipe</button>
          </form>
        </div>
      </section>
    </main>
  `;

  document.querySelector('#setupLogoutBtn').addEventListener('click', () => signOutUser());

  document.querySelector('#createTeamForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, 'Criando...');
    try {
      const teamId = await createTeam({
        name: document.querySelector('#teamName').value,
        description: document.querySelector('#teamDescription').value
      });
      state.currentTeamId = teamId;
      toast('Equipe criada com sucesso.');
      await loadUserArea();
    } catch (error) {
      toast(error.message || 'Erro ao criar equipe.', 'error');
    } finally {
      setLoading(button, false);
    }
  });

  document.querySelector('#joinTeamForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, 'Entrando...');
    try {
      const teamId = await joinTeamByCode(document.querySelector('#joinCode').value);
      state.currentTeamId = teamId;
      clearPendingInviteCode();
      toast('Você entrou na equipe.');
      await loadUserArea();
    } catch (error) {
      toast(error.message || 'Código inválido ou equipe não encontrada.', 'error');
    } finally {
      setLoading(button, false);
    }
  });
}

function renderShell() {
  app.innerHTML = `
    <main class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="logo">GC</div>
          <div>
            <strong>Community</strong>
            <span>Manager</span>
          </div>
        </div>

        <div class="team-switcher">
          <label for="teamSelect">Equipe atual</label>
          <select id="teamSelect">
            ${state.teamRows.map(row => `
              <option value="${row.team_id}" ${row.team_id === state.currentTeamId ? 'selected' : ''}>
                ${escapeHtml(row.teams?.name || 'Equipe')}
              </option>
            `).join('')}
          </select>
        </div>

        <nav class="nav">
          ${[
            ['dashboard', 'Painel'],
            ['chats', 'Chats'],
            ['members', 'Membros'],
            ['roles', 'Cargos'],
            ['groups', 'Grupos'],
            ['events', 'Eventos'],
            ['announcements', 'Comunicados'],
            ['invites', 'Convites'],
            ['profile', 'Meu perfil']
          ].map(([view, label]) => `
            <button class="nav-btn ${state.currentView === view ? 'active' : ''}" data-view="${view}">${label}</button>
          `).join('')}
        </nav>

        <div class="sidebar-footer">
          <button id="newTeamBtn" class="secondary-btn full">Nova equipe</button>
          <button id="logoutBtn" class="ghost-btn full">Sair</button>
        </div>
      </aside>

      <section class="content">
        <header class="topbar">
          <div>
            <p class="eyebrow">${escapeHtml(state.currentTeam?.name || 'Equipe')}</p>
            <h1 id="pageTitle">Painel</h1>
          </div>
          <div class="user-chip">
            ${avatar(state.profile, 'sm')}
            <div>
              <strong>${escapeHtml(state.profile?.name || 'Usuário')}</strong>
              <span>${escapeHtml(state.currentMember?.roles?.name || 'Membro')}</span>
            </div>
          </div>
        </header>
        <section id="viewContainer" class="view-container"></section>
      </section>
    </main>
  `;

  document.querySelector('#teamSelect').addEventListener('change', async event => {
    state.currentTeamId = event.target.value;
    state.currentView = 'dashboard';
    state.selectedChatId = null;
    if (state.unsubscribeMessages) state.unsubscribeMessages();
    await loadCurrentTeam();
    renderShell();
    await renderCurrentView();
  });

  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', async () => {
      state.currentView = button.dataset.view;
      document.querySelectorAll('[data-view]').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      await renderCurrentView();
    });
  });

  document.querySelector('#newTeamBtn').addEventListener('click', () => renderTeamSetup());
  document.querySelector('#logoutBtn').addEventListener('click', () => signOutUser());
}

async function refreshAndRender() {
  state.teamRows = await loadMyTeams(currentUserId());
  await loadCurrentTeam();
  renderShell();
  await renderCurrentView();
}

async function renderCurrentView() {
  const titles = {
    dashboard: 'Painel',
    chats: 'Chats',
    members: 'Membros',
    roles: 'Cargos',
    groups: 'Grupos',
    events: 'Eventos',
    announcements: 'Comunicados',
    invites: 'Convites',
    profile: 'Meu perfil'
  };

  document.querySelector('#pageTitle').textContent = titles[state.currentView] || 'Painel';

  if (state.currentView !== 'chats' && state.unsubscribeMessages) {
    state.unsubscribeMessages();
    state.unsubscribeMessages = null;
  }

  const views = {
    dashboard: renderDashboard,
    chats: renderChats,
    members: renderMembers,
    roles: renderRoles,
    groups: renderGroups,
    events: renderEvents,
    announcements: renderAnnouncements,
    invites: renderInvites,
    profile: renderProfile
  };

  await views[state.currentView]();
}

function view() {
  return document.querySelector('#viewContainer');
}

async function renderDashboard() {
  const nextEvents = state.events.slice(0, 3);
  view().innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><span>Membros</span><strong>${state.members.length}</strong></div>
      <div class="stat-card"><span>Cargos</span><strong>${state.roles.length}</strong></div>
      <div class="stat-card"><span>Grupos</span><strong>${state.groups.length}</strong></div>
      <div class="stat-card"><span>Chats</span><strong>${state.chats.length}</strong></div>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="section-head">
          <div>
            <h2>Visão geral</h2>
            <p class="muted small">Resumo rápido da equipe atual.</p>
          </div>
        </div>
        <div class="team-summary">
          <div class="logo-big mini">${escapeHtml(initials(state.currentTeam?.name))}</div>
          <div>
            <h3>${escapeHtml(state.currentTeam?.name)}</h3>
            <p class="muted">${escapeHtml(state.currentTeam?.description || 'Sem descrição cadastrada.')}</p>
            <div class="chips">
              ${badge(`Código: ${state.currentTeam?.invite_code || '---'}`)}
              ${isOwner() ? badge('Dono da equipe', '#30d158') : badge(state.currentMember?.roles?.name || 'Membro')}
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="section-head">
          <div>
            <h2>Próximos eventos</h2>
            <p class="muted small">Eventos visíveis para você.</p>
          </div>
        </div>
        <div class="list clean">
          ${nextEvents.length ? nextEvents.map(event => `
            <div class="list-row">
              <div>
                <strong>${escapeHtml(event.title)}</strong>
                <span>${formatDate(event.event_at)}</span>
              </div>
              ${badge(scopeName(event))}
            </div>
          `).join('') : '<p class="muted">Nenhum evento cadastrado.</p>'}
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="section-head">
        <div>
          <h2>Comunicados recentes</h2>
          <p class="muted small">Últimos avisos publicados na equipe.</p>
        </div>
      </div>
      <div class="cards-list">
        ${state.announcements.slice(0, 3).map(announcement => announcementCard(announcement)).join('') || '<p class="muted">Nenhum comunicado publicado.</p>'}
      </div>
    </section>
  `;
}

function renderMembers() {
  view().innerHTML = `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2>Membros da equipe</h2>
          <p class="muted small">Altere cargos ou remova membros conforme suas permissões.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Cargo</th>
              <th>Entrada</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${state.members.map(member => `
              <tr>
                <td>
                  <div class="member-cell">
                    ${avatar(member.profiles, 'sm')}
                    <div>
                      <strong>${escapeHtml(member.profiles?.name || 'Usuário')}</strong>
                      <span>@${escapeHtml(member.profiles?.username || 'sem.usuario')}</span>
                    </div>
                  </div>
                </td>
                <td>
                  ${can('manageMembers') ? `
                    <select class="role-select" data-member-role="${member.id}">
                      ${state.roles.map(role => `
                        <option value="${role.id}" ${role.id === member.role_id ? 'selected' : ''}>${escapeHtml(role.name)}</option>
                      `).join('')}
                    </select>
                  ` : badge(member.roles?.name || 'Membro', member.roles?.color)}
                </td>
                <td>${formatDate(member.joined_at)}</td>
                <td>
                  ${can('manageMembers') && member.user_id !== state.currentTeam.owner_id ? `<button class="danger-btn sm" data-remove-member="${member.id}">Remover</button>` : '<span class="muted small">---</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;

  document.querySelectorAll('[data-member-role]').forEach(select => {
    select.addEventListener('change', async () => {
      try {
        await updateMemberRole(select.dataset.memberRole, select.value);
        toast('Cargo atualizado.');
        await refreshAndRender();
      } catch (error) {
        toast(error.message || 'Erro ao alterar cargo.', 'error');
      }
    });
  });

  document.querySelectorAll('[data-remove-member]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!confirm('Remover este membro da equipe?')) return;
      try {
        await removeMember(button.dataset.removeMember);
        toast('Membro removido.');
        await refreshAndRender();
      } catch (error) {
        toast(error.message || 'Erro ao remover membro.', 'error');
      }
    });
  });
}

function renderRoles() {
  const permissionInputs = PERMISSIONS.map(permission => `
    <label class="check-card">
      <input type="checkbox" value="${permission.id}" name="rolePermissions" />
      <span>${permission.label}</span>
    </label>
  `).join('');

  view().innerHTML = `
    <div class="split-grid">
      <form id="roleForm" class="panel form-card ${can('manageRoles') ? '' : 'locked'}">
        <h2>Criar cargo</h2>
        ${!can('manageRoles') ? '<p class="notice">Você não tem permissão para criar cargos.</p>' : ''}
        <label>Nome do cargo</label>
        <input id="roleName" placeholder="Ex: Marketing" required ${!can('manageRoles') ? 'disabled' : ''} />
        <label>Cor do cargo</label>
        <input id="roleColor" type="color" value="#ff7a1a" ${!can('manageRoles') ? 'disabled' : ''} />
        <label>Permissões</label>
        <div class="check-grid">${permissionInputs}</div>
        <button class="primary-btn" type="submit" ${!can('manageRoles') ? 'disabled' : ''}>Criar cargo</button>
      </form>

      <section class="panel">
        <div class="section-head">
          <div>
            <h2>Cargos existentes</h2>
            <p class="muted small">Cargos controlam o acesso às funções da equipe.</p>
          </div>
        </div>
        <div class="cards-list">
          ${state.roles.map(role => `
            <article class="card-item">
              <div>
                <h3>${badge(role.name, role.color)}</h3>
                <p class="muted small">${role.permissions?.length ? role.permissions.map(permissionLabel).join(', ') : 'Sem permissões administrativas.'}</p>
              </div>
              ${can('manageRoles') ? `
                <div class="row-actions">
                  <button class="ghost-btn sm" data-edit-role="${role.id}">Editar</button>
                  <button class="danger-btn sm" data-delete-role="${role.id}">Excluir</button>
                </div>
              ` : ''}
            </article>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  document.querySelector('#roleForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!can('manageRoles')) return;
    const permissions = Array.from(document.querySelectorAll('[name="rolePermissions"]:checked')).map(input => input.value);
    const button = event.submitter;
    setLoading(button, true);
    try {
      await createRole(state.currentTeamId, {
        name: document.querySelector('#roleName').value,
        color: document.querySelector('#roleColor').value,
        permissions
      });
      toast('Cargo criado.');
      await refreshAndRender();
    } catch (error) {
      toast(error.message || 'Erro ao criar cargo.', 'error');
    } finally {
      setLoading(button, false);
    }
  });

  document.querySelectorAll('[data-edit-role]').forEach(button => {
    button.addEventListener('click', async () => {
      const role = state.roles.find(item => item.id === button.dataset.editRole);
      const name = prompt('Novo nome do cargo:', role.name);
      if (!name) return;
      const color = prompt('Nova cor em hexadecimal:', role.color) || role.color;
      try {
        await updateRole(role.id, { name, color });
        toast('Cargo editado.');
        await refreshAndRender();
      } catch (error) {
        toast(error.message || 'Erro ao editar cargo.', 'error');
      }
    });
  });

  document.querySelectorAll('[data-delete-role]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!confirm('Excluir este cargo? Membros podem ficar sem cargo.')) return;
      try {
        await deleteRole(button.dataset.deleteRole);
        toast('Cargo excluído.');
        await refreshAndRender();
      } catch (error) {
        toast(error.message || 'Erro ao excluir cargo.', 'error');
      }
    });
  });
}

function permissionLabel(permissionId) {
  return PERMISSIONS.find(permission => permission.id === permissionId)?.label || permissionId;
}

function renderGroups() {
  view().innerHTML = `
    <div class="split-grid">
      <form id="groupForm" class="panel form-card ${can('manageGroups') ? '' : 'locked'}">
        <h2>Criar grupo</h2>
        ${!can('manageGroups') ? '<p class="notice">Você não tem permissão para criar grupos.</p>' : ''}
        <label>Nome do grupo</label>
        <input id="groupName" placeholder="Ex: Time de Produto" required ${!can('manageGroups') ? 'disabled' : ''} />
        <label>Descrição</label>
        <textarea id="groupDescription" placeholder="Objetivo do grupo" ${!can('manageGroups') ? 'disabled' : ''}></textarea>
        <label>Pessoas do grupo</label>
        <div class="check-list compact">
          ${state.members.map(member => `
            <label>
              <input type="checkbox" name="groupMembers" value="${member.user_id}" ${!can('manageGroups') ? 'disabled' : ''} />
              ${escapeHtml(member.profiles?.name || 'Usuário')}
            </label>
          `).join('')}
        </div>
        <button class="primary-btn" type="submit" ${!can('manageGroups') ? 'disabled' : ''}>Criar grupo</button>
      </form>

      <section class="panel">
        <div class="section-head">
          <div>
            <h2>Grupos</h2>
            <p class="muted small">Agrupe pessoas para chats, eventos e organização interna.</p>
          </div>
        </div>
        <div class="cards-list">
          ${state.groups.map(group => `
            <article class="card-item vertical">
              <div class="section-head slim">
                <div>
                  <h3>${escapeHtml(group.name)}</h3>
                  <p class="muted small">${escapeHtml(group.description || 'Sem descrição.')}</p>
                </div>
                ${can('manageGroups') ? `<button class="danger-btn sm" data-delete-group="${group.id}">Excluir</button>` : ''}
              </div>
              <div class="avatar-row">
                ${group.group_members?.length ? group.group_members.map(item => avatar(item.profiles, 'xs')).join('') : '<span class="muted small">Sem membros.</span>'}
              </div>
            </article>
          `).join('') || '<p class="muted">Nenhum grupo criado.</p>'}
        </div>
      </section>
    </div>
  `;

  document.querySelector('#groupForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!can('manageGroups')) return;
    const button = event.submitter;
    const memberIds = Array.from(document.querySelectorAll('[name="groupMembers"]:checked')).map(input => input.value);
    setLoading(button, true);
    try {
      await createGroup(
        state.currentTeamId,
        {
          name: document.querySelector('#groupName').value,
          description: document.querySelector('#groupDescription').value
        },
        memberIds
      );
      toast('Grupo criado.');
      await refreshAndRender();
    } catch (error) {
      toast(error.message || 'Erro ao criar grupo.', 'error');
    } finally {
      setLoading(button, false);
    }
  });

  document.querySelectorAll('[data-delete-group]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!confirm('Excluir este grupo?')) return;
      try {
        await deleteGroup(button.dataset.deleteGroup);
        toast('Grupo excluído.');
        await refreshAndRender();
      } catch (error) {
        toast(error.message || 'Erro ao excluir grupo.', 'error');
      }
    });
  });
}

async function renderChats() {
  const selectedChat = state.chats.find(chat => chat.id === state.selectedChatId) || state.chats[0];
  state.selectedChatId = selectedChat?.id || null;

  view().innerHTML = `
    <div class="chat-page">
      <aside class="chat-sidebar panel">
        <div class="section-head">
          <div>
            <h2>Chats</h2>
            <p class="muted small">Geral, cargo, grupo ou pessoas específicas.</p>
          </div>
        </div>
        <div class="chat-list">
          ${state.chats.map(chat => `
            <button class="chat-list-item ${chat.id === state.selectedChatId ? 'active' : ''}" data-select-chat="${chat.id}">
              <strong>${escapeHtml(chat.name)}</strong>
              <span>${escapeHtml(scopeName(chat))}</span>
            </button>
          `).join('') || '<p class="muted small">Nenhum chat disponível.</p>'}
        </div>

        <form id="chatForm" class="mini-form">
          <h3>Criar chat</h3>
          <label>Nome</label>
          <input id="chatName" placeholder="Ex: Design Sprint" required />
          <label>Tipo</label>
          <select id="chatScope">
            <option value="custom">Pessoas específicas</option>
            <option value="role">Cargo específico</option>
            <option value="group">Grupo específico</option>
            <option value="general">Todos da equipe</option>
          </select>
          <div id="chatTargetArea"></div>
          <button class="primary-btn full" type="submit">Criar chat</button>
        </form>
      </aside>

      <section class="chat-main panel">
        <div id="chatHeader" class="chat-header"></div>
        <div id="messagesList" class="messages-list"></div>
        <form id="messageForm" class="message-form">
          <input id="messageInput" placeholder="Digite uma mensagem..." ${!state.selectedChatId ? 'disabled' : ''} required />
          <button class="primary-btn" type="submit" ${!state.selectedChatId ? 'disabled' : ''}>Enviar</button>
        </form>
      </section>
    </div>
  `;

  document.querySelectorAll('[data-select-chat]').forEach(button => {
    button.addEventListener('click', async () => {
      state.selectedChatId = button.dataset.selectChat;
      await openChat(state.selectedChatId);
      document.querySelectorAll('[data-select-chat]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
    });
  });

  const scopeSelect = document.querySelector('#chatScope');
  const targetArea = document.querySelector('#chatTargetArea');
  const renderChatTarget = () => {
    targetArea.innerHTML = targetPicker(scopeSelect.value, 'chat');
  };
  scopeSelect.addEventListener('change', renderChatTarget);
  renderChatTarget();

  document.querySelector('#chatForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true);
    try {
      const scope = document.querySelector('#chatScope').value;
      const targetUserIds = Array.from(document.querySelectorAll('[name="chatUsers"]:checked')).map(input => input.value);
      const payload = {
        name: document.querySelector('#chatName').value,
        scope,
        target_role_id: document.querySelector('#chatRole')?.value || null,
        target_group_id: document.querySelector('#chatGroup')?.value || null
      };

      if (scope === 'custom' && !targetUserIds.includes(currentUserId())) targetUserIds.push(currentUserId());

      const chat = await createChat(state.currentTeamId, payload, targetUserIds);
      state.selectedChatId = chat.id;
      toast('Chat criado.');
      await refreshAndRender();
    } catch (error) {
      toast(error.message || 'Erro ao criar chat.', 'error');
    } finally {
      setLoading(button, false);
    }
  });

  document.querySelector('#messageForm').addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.querySelector('#messageInput');
    const body = input.value.trim();
    if (!body || !state.selectedChatId) return;
    input.value = '';
    try {
      await sendMessage(state.selectedChatId, body);
    } catch (error) {
      toast(error.message || 'Erro ao enviar mensagem.', 'error');
    }
  });

  if (state.selectedChatId) await openChat(state.selectedChatId);
}

async function openChat(chatId) {
  const chat = state.chats.find(item => item.id === chatId);
  const header = document.querySelector('#chatHeader');
  const list = document.querySelector('#messagesList');
  if (!chat || !header || !list) return;

  header.innerHTML = `
    <div>
      <h2>${escapeHtml(chat.name)}</h2>
      <p class="muted small">${escapeHtml(scopeName(chat))}</p>
    </div>
    ${chat.scope !== 'general' && (can('manageChats') || chat.created_by === currentUserId()) ? `<button class="danger-btn sm" id="deleteChatBtn">Excluir chat</button>` : ''}
  `;

  document.querySelector('#deleteChatBtn')?.addEventListener('click', async () => {
    if (!confirm('Excluir este chat e suas mensagens?')) return;
    try {
      await deleteChat(chat.id);
      state.selectedChatId = null;
      toast('Chat excluído.');
      await refreshAndRender();
    } catch (error) {
      toast(error.message || 'Erro ao excluir chat.', 'error');
    }
  });

  if (state.unsubscribeMessages) state.unsubscribeMessages();
  state.messages = await getMessages(chat.id);
  renderMessageList();

  state.unsubscribeMessages = subscribeToMessages(chat.id, message => {
    if (state.messages.some(item => item.id === message.id)) return;
    state.messages.push(message);
    appendMessage(message);
  });
}

function renderMessageList() {
  const list = document.querySelector('#messagesList');
  list.innerHTML = state.messages.length
    ? state.messages.map(messageCard).join('')
    : '<div class="empty-state">Nenhuma mensagem ainda. Seja o primeiro a falar.</div>';
  list.scrollTop = list.scrollHeight;
}

function appendMessage(message) {
  const list = document.querySelector('#messagesList');
  if (!list) return;
  const empty = list.querySelector('.empty-state');
  if (empty) empty.remove();
  list.insertAdjacentHTML('beforeend', messageCard(message));
  list.scrollTop = list.scrollHeight;
}

function messageCard(message) {
  const mine = message.user_id === currentUserId();
  return `
    <article class="message ${mine ? 'mine' : ''}">
      ${avatar(message.profiles, 'xs')}
      <div>
        <div class="message-meta">
          <strong>${escapeHtml(message.profiles?.name || 'Usuário')}</strong>
          <span>${formatDate(message.created_at)}</span>
        </div>
        <p>${escapeHtml(message.body)}</p>
      </div>
    </article>
  `;
}

function targetPicker(scope, prefix) {
  if (scope === 'role') {
    return `
      <label>Cargo</label>
      <select id="${prefix}Role" required>
        ${state.roles.map(role => `<option value="${role.id}">${escapeHtml(role.name)}</option>`).join('')}
      </select>
    `;
  }

  if (scope === 'group') {
    return `
      <label>Grupo</label>
      <select id="${prefix}Group" required>
        ${state.groups.map(group => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join('')}
      </select>
    `;
  }

  if (scope === 'custom') {
    return `
      <label>Pessoas</label>
      <div class="check-list compact">
        ${state.members.map(member => `
          <label>
            <input type="checkbox" name="${prefix}Users" value="${member.user_id}" ${member.user_id === currentUserId() ? 'checked disabled' : ''} />
            ${escapeHtml(member.profiles?.name || 'Usuário')}
          </label>
        `).join('')}
      </div>
    `;
  }

  return '<p class="muted small">Todos os membros da equipe terão acesso.</p>';
}

function scopeName(item) {
  if (item.scope === 'general') return 'Geral da equipe';
  if (item.scope === 'role') return `Cargo: ${item.roles?.name || 'cargo'}`;
  if (item.scope === 'group') return `Grupo: ${item.groups?.name || 'grupo'}`;
  if (item.scope === 'custom') return 'Pessoas específicas';
  return 'Equipe';
}

function renderEvents() {
  view().innerHTML = `
    <div class="split-grid">
      <form id="eventForm" class="panel form-card ${can('manageEvents') ? '' : 'locked'}">
        <h2>Criar evento</h2>
        ${!can('manageEvents') ? '<p class="notice">Você não tem permissão para criar eventos.</p>' : ''}
        <label>Título</label>
        <input id="eventTitle" placeholder="Ex: Reunião semanal" required ${!can('manageEvents') ? 'disabled' : ''} />
        <label>Descrição</label>
        <textarea id="eventDescription" placeholder="Detalhes do evento" ${!can('manageEvents') ? 'disabled' : ''}></textarea>
        <label>Data e horário</label>
        <input id="eventAt" type="datetime-local" required ${!can('manageEvents') ? 'disabled' : ''} />
        <label>Direcionamento</label>
        <select id="eventScope" ${!can('manageEvents') ? 'disabled' : ''}>
          <option value="general">Todos da equipe</option>
          <option value="role">Cargo específico</option>
          <option value="group">Grupo específico</option>
          <option value="custom">Pessoas específicas</option>
        </select>
        <div id="eventTargetArea"></div>
        <button class="primary-btn" type="submit" ${!can('manageEvents') ? 'disabled' : ''}>Criar evento</button>
      </form>

      <section class="panel">
        <div class="section-head">
          <div>
            <h2>Eventos visíveis</h2>
            <p class="muted small">Eventos filtrados conforme sua equipe, cargo ou grupo.</p>
          </div>
        </div>
        <div class="cards-list">
          ${state.events.map(event => `
            <article class="card-item vertical">
              <div class="section-head slim">
                <div>
                  <h3>${escapeHtml(event.title)}</h3>
                  <p class="muted small">${formatDate(event.event_at)} • ${escapeHtml(scopeName(event))}</p>
                </div>
                ${can('manageEvents') ? `<button class="danger-btn sm" data-delete-event="${event.id}">Excluir</button>` : ''}
              </div>
              <p>${escapeHtml(event.description || 'Sem descrição.')}</p>
            </article>
          `).join('') || '<p class="muted">Nenhum evento cadastrado.</p>'}
        </div>
      </section>
    </div>
  `;

  const scopeSelect = document.querySelector('#eventScope');
  const targetArea = document.querySelector('#eventTargetArea');
  const renderEventTarget = () => targetArea.innerHTML = targetPicker(scopeSelect.value, 'event');
  scopeSelect.addEventListener('change', renderEventTarget);
  renderEventTarget();

  document.querySelector('#eventForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!can('manageEvents')) return;
    const button = event.submitter;
    setLoading(button, true);
    try {
      const scope = document.querySelector('#eventScope').value;
      const targetUserIds = Array.from(document.querySelectorAll('[name="eventUsers"]:checked')).map(input => input.value);
      await createEvent(state.currentTeamId, {
        title: document.querySelector('#eventTitle').value,
        description: document.querySelector('#eventDescription').value,
        event_at: new Date(document.querySelector('#eventAt').value).toISOString(),
        scope,
        target_role_id: document.querySelector('#eventRole')?.value || null,
        target_group_id: document.querySelector('#eventGroup')?.value || null
      }, targetUserIds);
      toast('Evento criado.');
      await refreshAndRender();
    } catch (error) {
      toast(error.message || 'Erro ao criar evento.', 'error');
    } finally {
      setLoading(button, false);
    }
  });

  document.querySelectorAll('[data-delete-event]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!confirm('Excluir este evento?')) return;
      try {
        await deleteEvent(button.dataset.deleteEvent);
        toast('Evento excluído.');
        await refreshAndRender();
      } catch (error) {
        toast(error.message || 'Erro ao excluir evento.', 'error');
      }
    });
  });
}

function renderAnnouncements() {
  view().innerHTML = `
    <div class="split-grid">
      <form id="announcementForm" class="panel form-card ${can('manageAnnouncements') ? '' : 'locked'}">
        <h2>Novo comunicado</h2>
        ${!can('manageAnnouncements') ? '<p class="notice">Você não tem permissão para publicar comunicados.</p>' : ''}
        <label>Título</label>
        <input id="announcementTitle" placeholder="Ex: Aviso importante" required ${!can('manageAnnouncements') ? 'disabled' : ''} />
        <label>Mensagem</label>
        <textarea id="announcementBody" placeholder="Escreva o comunicado" required ${!can('manageAnnouncements') ? 'disabled' : ''}></textarea>
        <button class="primary-btn" type="submit" ${!can('manageAnnouncements') ? 'disabled' : ''}>Publicar</button>
      </form>

      <section class="panel">
        <div class="section-head">
          <div>
            <h2>Comunicados</h2>
            <p class="muted small">Avisos internos para toda a equipe.</p>
          </div>
        </div>
        <div class="cards-list">
          ${state.announcements.map(announcement => announcementCard(announcement, can('manageAnnouncements'))).join('') || '<p class="muted">Nenhum comunicado publicado.</p>'}
        </div>
      </section>
    </div>
  `;

  document.querySelector('#announcementForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!can('manageAnnouncements')) return;
    const button = event.submitter;
    setLoading(button, true);
    try {
      await createAnnouncement(state.currentTeamId, {
        title: document.querySelector('#announcementTitle').value,
        body: document.querySelector('#announcementBody').value
      });
      toast('Comunicado publicado.');
      await refreshAndRender();
    } catch (error) {
      toast(error.message || 'Erro ao publicar comunicado.', 'error');
    } finally {
      setLoading(button, false);
    }
  });

  document.querySelectorAll('[data-delete-announcement]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!confirm('Excluir comunicado?')) return;
      try {
        await deleteAnnouncement(button.dataset.deleteAnnouncement);
        toast('Comunicado excluído.');
        await refreshAndRender();
      } catch (error) {
        toast(error.message || 'Erro ao excluir comunicado.', 'error');
      }
    });
  });
}

function announcementCard(announcement, showActions = false) {
  return `
    <article class="card-item vertical">
      <div class="section-head slim">
        <div>
          <h3>${escapeHtml(announcement.title)}</h3>
          <p class="muted small">Publicado em ${formatDate(announcement.created_at)}</p>
        </div>
        ${showActions ? `<button class="danger-btn sm" data-delete-announcement="${announcement.id}">Excluir</button>` : ''}
      </div>
      <p>${escapeHtml(announcement.body)}</p>
    </article>
  `;
}

function renderInvites() {
  const code = state.currentTeam?.invite_code;
  const link = inviteLink(code);
  view().innerHTML = `
    <section class="panel invite-panel">
      <div>
        <p class="eyebrow">Convites</p>
        <h2>Entrada por código ou link</h2>
        <p class="muted">Compartilhe o código como Google Classroom ou o link como Discord.</p>
      </div>

      <div class="invite-grid">
        <div class="copy-card">
          <span>Código da equipe</span>
          <strong>${escapeHtml(code)}</strong>
          <button class="secondary-btn" data-copy="${escapeHtml(code)}">Copiar código</button>
        </div>
        <div class="copy-card wide">
          <span>Link de convite</span>
          <strong>${escapeHtml(link)}</strong>
          <button class="secondary-btn" data-copy="${escapeHtml(link)}">Copiar link</button>
        </div>
      </div>
    </section>
  `;

  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(button.dataset.copy);
      toast('Copiado.');
    });
  });
}

function renderProfile() {
  view().innerHTML = `
    <section class="panel profile-panel">
      <div class="profile-head">
        ${avatar(state.profile, 'lg')}
        <div>
          <h2>${escapeHtml(state.profile?.name || 'Usuário')}</h2>
          <p class="muted">@${escapeHtml(state.profile?.username || 'sem.usuario')}</p>
        </div>
      </div>

      <form id="profileForm" class="form-card narrow">
        <label>Nome completo</label>
        <input id="profileName" value="${escapeHtml(state.profile?.name || '')}" required />
        <label>Nome de usuário</label>
        <input id="profileUsername" value="${escapeHtml(state.profile?.username || '')}" required />
        <label>Nova foto</label>
        <input id="profilePhoto" type="file" accept="image/*" />
        <button class="primary-btn" type="submit">Salvar perfil</button>
      </form>
    </section>
  `;

  document.querySelector('#profileForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true);
    try {
      const updates = {
        name: document.querySelector('#profileName').value,
        username: document.querySelector('#profileUsername').value
      };
      const photo = document.querySelector('#profilePhoto').files[0];
      if (photo) updates.avatar_url = await uploadAvatar(currentUserId(), photo);
      state.profile = await updateProfile(currentUserId(), updates);
      toast('Perfil atualizado.');
      renderShell();
      await renderCurrentView();
    } catch (error) {
      toast(error.message || 'Erro ao salvar perfil.', 'error');
    } finally {
      setLoading(button, false);
    }
  });
}

boot().catch(error => {
  console.error(error);
  toast(error.message || 'Erro inesperado.', 'error');
});
