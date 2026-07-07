import { supabase } from '../lib/supabase.js';

export async function getChats(teamId) {
  const { data, error } = await supabase
    .from('chats')
    .select(`
      *,
      roles:target_role_id (name, color),
      groups:target_group_id (name),
      chat_members (
        user_id,
        profiles:user_id (*)
      )
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createChat(teamId, chat, targetUserIds = []) {
  const { data, error } = await supabase
    .from('chats')
    .insert({
      team_id: teamId,
      name: chat.name,
      scope: chat.scope,
      target_role_id: chat.target_role_id || null,
      target_group_id: chat.target_group_id || null
    })
    .select('*')
    .single();

  if (error) throw error;

  if (chat.scope === 'custom') {
    const uniqueUserIds = Array.from(new Set(targetUserIds));
    if (uniqueUserIds.length) {
      const rows = uniqueUserIds.map(userId => ({
        chat_id: data.id,
        user_id: userId
      }));

      const { error: memberError } = await supabase
        .from('chat_members')
        .insert(rows);

      if (memberError) throw memberError;
    }
  }

  return data;
}

export async function deleteChat(chatId) {
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (error) throw error;
}

export async function getMessages(chatId) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles:user_id (name, username, avatar_url)
    `)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendMessage(chatId, body) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      body
    })
    .select(`
      *,
      profiles:user_id (name, username, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToMessages(chatId, onMessage) {
  const channel = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      async payload => {
        const messageId = payload.new.id;
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            profiles:user_id (name, username, avatar_url)
          `)
          .eq('id', messageId)
          .single();

        if (!error && data) onMessage(data);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
