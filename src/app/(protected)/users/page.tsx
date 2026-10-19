import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { checked } from '@/lib/data';
import type { Profile } from '@/lib/types';
import { createUser, updateUser } from '@/app/actions';
import { Heading, Notice } from '@/components/ui';
import { PasswordField } from '@/components/password-field';
import { DeleteUserButton } from '@/components/delete-user-button';

export default async function Users({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; edit?: string }> }) {
  const { db, user } = await requireUser(['admin']);
  const params = await searchParams;
  const users = checked(await db.from('profiles').select('*').order('name')) as Profile[];
  const editing = params.edit ? users.find(profile => profile.id === params.edit) : undefined;
  return <><Heading title="Pengguna" subtitle="Kelola akun mahasiswa, dosen, BAAK, dan administrator."/>
    <Notice params={params}/>
    {params.edit && !editing && <Notice params={{ error: 'Pengguna tidak ditemukan.' }}/>}
    <section className="panel" aria-labelledby="user-form-title">
      <h2 id="user-form-title">{editing ? `Edit pengguna: ${editing.name}` : 'Tambah pengguna'}</h2>
      <form key={editing?.id ?? 'new'} action={editing ? updateUser : createUser} className="form-grid">
        {editing && <input type="hidden" name="id" value={editing.id}/>}
        <label>Nama lengkap<input name="name" required maxLength={160} defaultValue={editing?.name}/></label>
        <label>NIM / NIP<input name="identifier" required pattern="[a-zA-Z0-9._-]{1,80}" maxLength={80} defaultValue={editing?.identifier}/></label>
        <label>Peran<select name="role" defaultValue={editing?.role ?? 'mahasiswa'}>
          <option value="mahasiswa" disabled={editing?.id === user.id}>Mahasiswa</option>
          <option value="dosen" disabled={editing?.id === user.id}>Dosen</option>
          <option value="baak" disabled={editing?.id === user.id}>BAAK</option>
          <option value="admin">Administrator</option>
        </select></label>
        <PasswordField label={editing ? 'Kata sandi baru' : 'Kata sandi awal'} required={!editing}
          hint={editing ? 'Kosongkan jika tidak ingin mengganti kata sandi. Minimal 6 karakter.' : 'Minimal 6 karakter.'}/>
        <div className="form-actions"><button>{editing ? 'Simpan perubahan' : 'Buat pengguna'}</button>
          {editing && <Link className="button secondary" href="/users">Batal</Link>}
        </div>
      </form>
    </section>
    <section className="panel"><h2>Akun terdaftar</h2><div className="table-wrap"><table>
      <thead><tr><th>Nama</th><th>NIM / NIP</th><th>Peran</th><th>Aksi</th></tr></thead>
      <tbody>{users.map(profile => <tr key={profile.id}>
        <td>{profile.name}</td><td>{profile.identifier}</td><td><span className="badge">{profile.role}</span></td>
        <td><div className="user-actions"><Link className="button secondary" href={`/users?edit=${profile.id}`}
          aria-label={`Edit ${profile.name}`}>Edit</Link>
          <DeleteUserButton id={profile.id} name={profile.name} isSelf={profile.id === user.id}/>
        </div></td>
      </tr>)}</tbody>
    </table></div></section>
  </>;
}
