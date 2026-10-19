import { login } from '@/app/actions';
import Link from 'next/link';
import { PasswordField } from '@/components/password-field';
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return <main className="auth-wrap"><section className="auth-card"><Link className="brand" href="/"><span className="logo">G</span>GeoPresensi</Link>
    <p className="eyebrow">PRESENSI KAMPUS</p><h1>Selamat datang kembali.</h1><p className="muted">Masuk dengan NIM / NIP untuk melanjutkan.</p>
    {!configured && <div className="notice error">Konfigurasi Supabase belum tersedia. Isi environment variable sesuai README.</div>}
    {error && <div role="alert" className="notice error">{error}</div>}
    <form action={login}><label>NIM / NIP<input name="identifier" required autoComplete="username" maxLength={80} /></label>
    <PasswordField label="Kata sandi" required autoComplete="current-password"/>
    <button disabled={!configured}>Masuk ke dashboard →</button></form><p className="muted tiny">Akun disediakan oleh administrator kampus.</p>
  </section></main>;
}
