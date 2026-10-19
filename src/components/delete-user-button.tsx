'use client';

import { useFormStatus } from 'react-dom';
import { deleteUser } from '@/app/actions';

function DeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="danger" disabled={disabled || pending}>{pending ? 'Menghapus…' : 'Hapus'}</button>;
}

export function DeleteUserButton({ id, name, isSelf }: { id: string; name: string; isSelf: boolean }) {
  return <form action={deleteUser} onSubmit={event => {
    if (!window.confirm(`Hapus akun ${name}? Akun yang dihapus tidak dapat dipulihkan.`)) event.preventDefault();
  }}>
    <input type="hidden" name="id" value={id}/>
    <DeleteButton disabled={isSelf}/>
    {isSelf && <small className="muted">Akun Anda</small>}
  </form>;
}
