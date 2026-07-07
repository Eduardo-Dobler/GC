import { supabase } from '../lib/supabase.js';

export const PERMISSIONS = [
  { id: 'manageMembers', label: 'Gerenciar membros' },
  { id: 'manageRoles', label: 'Gerenciar cargos' },
  { id: 'manageGroups', label: 'Gerenciar grupos' },
  { id: 'manageChats', label: 'Gerenciar chats' },
  { id: 'manageEvents', label: 'Gerenciar eventos' },
  { id: 'manageAnnouncements', label: 'Gerenciar comunicados' },
  { id: 'manageInvites', label: 'Gerenciar convites' }
];

export async function createTeam({ name, description }) {
  const { data, error } = await supabase.rpc('create_team_with_defaults', {
    team_name: name,
    team_description: description || null
  });

  if (error) throw error;
  return data;
}

export async function joinTeamByCode(code) {
  const { data, error } = await supabase.rpc('join_team_by_code', {
    join_code: code
  });

  if (error) throw error;
  return data;
}

export async function loadMyTeams(userId) {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      id,
      team_id,
      role_id,
      joined_at,
      teams:team_id (*),
      roles:role_id (*)
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function loadTeamBundle(teamId) {
  const [roles, members, groups, chats, events, announcements] = await Promise.all([
    getRoles(teamId),
    getMembers(teamId),
    getGroups(teamId),
    getChats(teamId),
    getEvents(teamId),
    getAnnouncements(teamId)
  ]);

  return { roles, members, groups, chats, events, announcements };
}

export async function getRoles(teamId) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createRole(teamId, role) {
  const { data, error } = await supabase
    .from('roles')
    .insert({
      team_id: teamId,
      name: role.name,
      color: role.color || '#ff7a1a',
      permissions: role.permissions || []
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateRole(roleId, updates) {
  const { data, error } = await supabase
    .from('roles')
    .update(updates)
    .eq('id', roleId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRole(roleId) {
  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', roleId);

  if (error) throw error;
}

export async function getMembers(teamId) {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      id,
      team_id,
      user_id,
      role_id,
      joined_at,
      profiles:user_id (*),
      roles:role_id (*)
    `)
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateMemberRole(memberId, roleId) {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role_id: roleId || null })
    .eq('id', memberId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function removeMember(memberId) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

export async function getGroups(teamId) {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      group_members (
        id,
        user_id,
        profiles:user_id (*)
      )
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createGroup(teamId, group, memberIds) {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      team_id: teamId,
      name: group.name,
      description: group.description || null
    })
    .select('*')
    .single();

  if (error) throw error;

  if (memberIds?.length) {
    const rows = memberIds.map(userId => ({
      group_id: data.id,
      user_id: userId
    }));

    const { error: membersError } = await supabase
      .from('group_members')
      .insert(rows);

    if (membersError) throw membersError;
  }

  return data;
}

export async function deleteGroup(groupId) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
}

export async function getEvents(teamId) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      roles:target_role_id (name, color),
      groups:target_group_id (name),
      event_targets (
        user_id,
        profiles:user_id (*)
      )
    `)
    .eq('team_id', teamId)
    .order('event_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createEvent(teamId, event, targetUserIds = []) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      team_id: teamId,
      title: event.title,
      description: event.description || null,
      event_at: event.event_at,
      scope: event.scope,
      target_role_id: event.target_role_id || null,
      target_group_id: event.target_group_id || null
    })
    .select('*')
    .single();

  if (error) throw error;

  if (event.scope === 'custom' && targetUserIds.length) {
    const rows = targetUserIds.map(userId => ({
      event_id: data.id,
      user_id: userId
    }));

    const { error: targetError } = await supabase
      .from('event_targets')
      .insert(rows);

    if (targetError) throw targetError;
  }

  return data;
}

export async function deleteEvent(eventId) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

export async function getAnnouncements(teamId) {
  const { data, error } = await supabase
    .from('announcements')
    .select(`
      *,
      profiles:created_by (name, username, avatar_url)
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createAnnouncement(teamId, announcement) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      team_id: teamId,
      title: announcement.title,
      body: announcement.body
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(announcementId) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId);

  if (error) throw error;
}
