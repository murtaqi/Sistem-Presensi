import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('admin user changes preserve login identity, permissions, and attendance history', async t => {
  const db = new PGlite();
  const admin = '00000000-0000-4000-8000-000000000001';
  const lecturer = '00000000-0000-4000-8000-000000000002';
  const student = '00000000-0000-4000-8000-000000000003';
  const other = '00000000-0000-4000-8000-000000000004';
  const q = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows;
  const update = (uid: string, name: string, identifier: string, role: string) => q(
    'update auth.users set email=$2,raw_app_meta_data=jsonb_build_object(\'presensi_profile\',$3::jsonb) where id=$1',
    [uid, `${identifier}@presensi.invalid`, JSON.stringify({ name, identifier, role })],
  );
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key,email text unique,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
    `);
    await db.exec(await readFile('supabase/migrations/001_initial.sql', 'utf8'));
    await db.exec(await readFile('supabase/migrations/20261019040535_user_management.sql', 'utf8'));
    for (const [uid, name, identifier, role] of [[admin, 'Admin', 'admin', 'admin'], [lecturer, 'Dosen', 'dosen', 'dosen'], [student, 'Mahasiswa', 'nim1', 'mahasiswa'], [other, 'Akun lain', 'nim2', 'mahasiswa']]) {
      await q('insert into auth.users(id,email) values($1,$2)', [uid, `${identifier}@presensi.invalid`]);
      await q('insert into public.profiles values($1,$2,$3,$4)', [uid, name, identifier, role]);
    }
    await t.test('name, NIM and role synchronize from trusted Admin API metadata', async () => {
      await update(other, 'Nama baru', 'nip-baru', 'baak');
      assert.deepEqual(await q('select name,identifier,role from public.profiles where id=$1', [other]), [{ name: 'Nama baru', identifier: 'nip-baru', role: 'baak' }]);
      assert.deepEqual(await q('select email from auth.users where id=$1', [other]), [{ email: 'nip-baru@presensi.invalid' }]);
    });
    await t.test('duplicate identifiers and invalid roles roll back the entire Auth update', async () => {
      await assert.rejects(() => update(other, 'Duplikat', 'admin', 'baak'), /duplicate/);
      await assert.rejects(() => update(other, 'Tidak valid', 'nip-gagal', 'superadmin'), /check constraint/);
      assert.deepEqual(await q('select email from auth.users where id=$1', [other]), [{ email: 'nip-baru@presensi.invalid' }]);
      assert.deepEqual(await q('select identifier from public.profiles where id=$1', [other]), [{ identifier: 'nip-baru' }]);
    });
    await t.test('user-editable metadata cannot modify the profile or elevate a role', async () => {
      await q('update auth.users set raw_user_meta_data=$2::jsonb where id=$1', [student, JSON.stringify({ presensi_profile: { name: 'Spoof', identifier: 'spoof', role: 'admin' } })]);
      assert.deepEqual(await q('select name,role from public.profiles where id=$1', [student]), [{ name: 'Mahasiswa', role: 'mahasiswa' }]);
      await db.exec('set role authenticated');
      await assert.rejects(() => db.exec("update public.profiles set role='admin'"), /permission denied/);
      await assert.rejects(() => db.exec('select private.sync_admin_profile()'), /permission denied/);
      await db.exec('reset role');
    });
    await t.test('the last administrator cannot be deleted or demoted', async () => {
      await assert.rejects(() => update(admin, 'Admin', 'admin', 'baak'), /Administrator terakhir/);
      await assert.rejects(() => q('delete from auth.users where id=$1', [admin]), /Administrator terakhir/);
      assert.equal((await q('select id from auth.users where id=$1', [admin])).length, 1);
    });
    await t.test('class and student references prevent unsafe role changes and history deletion', async () => {
      await q("insert into public.classes(code,name,lecturer_id,room,latitude,longitude) values('IF1','Kelas',$1,'A1',-6.2,106.8)", [lecturer]);
      await q('insert into public.enrollments values(1,$1)', [student]);
      await db.exec("insert into public.sessions(class_id,title,starts_at,ends_at,latitude,longitude,radius) values(1,'Pertemuan',now(),now()+interval '1 hour',-6.2,106.8,50)");
      await q('insert into public.attendance(session_id,student_id,latitude,longitude,accuracy,distance) values(1,$1,-6.2,106.8,5,0)', [student]);
      await assert.rejects(() => update(lecturer, 'Dosen', 'dosen', 'mahasiswa'), /masih terkait/);
      await assert.rejects(() => update(student, 'Mahasiswa', 'nim1', 'dosen'), /masih terkait/);
      await assert.rejects(() => q('delete from auth.users where id=$1', [student]), /foreign key constraint/);
      await assert.rejects(() => q('delete from auth.users where id=$1', [lecturer]), /foreign key constraint/);
      assert.equal((await q('select * from public.attendance')).length, 1);
    });
    await t.test('deleting an unreferenced account removes both Auth and profile', async () => {
      await q('delete from auth.users where id=$1', [other]);
      assert.equal((await q('select id from auth.users where id=$1', [other])).length, 0);
      assert.equal((await q('select id from public.profiles where id=$1', [other])).length, 0);
    });
  } finally { await db.close(); }
});
