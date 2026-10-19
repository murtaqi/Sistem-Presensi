import { changePassword } from '@/app/actions';
import { Heading, Notice } from '@/components/ui';
export default async function Password({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  return <><Heading title="Ganti kata sandi"/><Notice params={await searchParams}/><section className="panel"><form action={changePassword} style={{ maxWidth: 420 }}><label>Kata sandi lama<input name="old_password" type="password" required autoComplete="current-password"/></label><label>Kata sandi baru<input name="password" type="password" required minLength={6} maxLength={128} autoComplete="new-password"/></label><button>Simpan kata sandi</button></form></section></>;
}
