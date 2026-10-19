import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { identifier: { type: 'string' }, name: { type: 'string' } } });
const identifier = values.identifier?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!identifier || !/^[a-z0-9._-]{1,80}$/.test(identifier) || !values.name || !password || password.length < 6) {
  console.error('Isi ADMIN_PASSWORD (minimal 6 karakter), lalu jalankan: node --env-file=.env.local scripts/create-admin.mjs --identifier admin --name "Administrator"');
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.auth.admin.createUser({ email: `${identifier}@presensi.invalid`, password, email_confirm: true });
if (error) throw error;
const { error: profileError } = await db.from('profiles').insert({ id: data.user.id, identifier, name: values.name, role: 'admin' });
if (profileError) {
  await db.auth.admin.deleteUser(data.user.id);
  throw profileError;
}
console.log(`Administrator ${identifier} berhasil dibuat. Silakan login.`);
