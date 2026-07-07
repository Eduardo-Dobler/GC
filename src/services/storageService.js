import { supabase } from '../lib/supabase.js';

export async function uploadAvatar(userId, file) {
  if (!file) return null;

  const extension = file.name.split('.').pop() || 'png';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  return data.publicUrl;
}
