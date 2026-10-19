import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { identifier: { type: 'string' } } });
const identifier = values.identifier?.trim().toLowerCase();
const password = process.env.ACCOUNT_PASSWORD;
if (!identifier || !password || password.length < 6) {
  console.error('Isi ACCOUNT_PASSWORD (minimal 6 karakter), lalu jalankan: node --env-file=.env.local scripts/reset-password.mjs --identifier NIM_ATAU_NIP');
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.from('profiles').select('id').eq('identifier', identifier).single();
if (error) throw error;
const { error: updateError } = await db.auth.admin.updateUserById(data.id, { password });
if (updateError) throw updateError;
console.log(`Password ${identifier} berhasil diperbarui.`);
