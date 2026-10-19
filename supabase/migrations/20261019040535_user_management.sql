begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Only attached triggers can call these helpers. No RPC is exposed to clients.
create function private.guard_profile_changes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    perform pg_advisory_xact_lock(21807, 1);
    if not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
      raise exception 'Administrator terakhir tidak dapat dihapus atau diubah perannya.';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if exists (select 1 from public.classes where lecturer_id = old.id)
       or exists (select 1 from public.enrollments where student_id = old.id)
       or exists (select 1 from public.attendance where student_id = old.id)
       or exists (select 1 from public.attempts where student_id = old.id) then
      raise exception 'Peran pengguna masih terkait kelas, peserta, atau riwayat presensi.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.guard_profile_changes() from public, anon, authenticated;
create trigger guard_profile_changes before update or delete on public.profiles
for each row execute function private.guard_profile_changes();

-- Admin API updates email/password and app_metadata in one transaction.
-- User-editable user_metadata is deliberately never used for authorization or profile writes.
create function private.sync_admin_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare profile_data jsonb;
begin
  profile_data := new.raw_app_meta_data -> 'presensi_profile';
  if profile_data is null or not exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;
  if new.email is distinct from (profile_data ->> 'identifier') || '@presensi.invalid' then
    raise exception 'NIM / NIP dan identitas login tidak cocok.';
  end if;
  if profile_data is distinct from old.raw_app_meta_data -> 'presensi_profile' then
    update public.profiles set name = profile_data ->> 'name',
      identifier = profile_data ->> 'identifier', role = profile_data ->> 'role'
      where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_admin_profile() from public, anon, authenticated;
create trigger sync_admin_profile after update of email, raw_app_meta_data on auth.users
for each row execute function private.sync_admin_profile();
commit;
