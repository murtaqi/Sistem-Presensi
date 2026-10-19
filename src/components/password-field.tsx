'use client';

import { useId, useState } from 'react';

export function PasswordField({ label, name = 'password', required = false, hint, autoComplete = 'new-password' }: {
  label: string; name?: string; required?: boolean; hint?: string; autoComplete?: 'new-password' | 'current-password';
}) {
  const inputId = useId();
  const [visible, setVisible] = useState(false);
  return <div className="password-field"><label htmlFor={inputId}>{label}</label>
    <span className="password-input">
      <input id={inputId} name={name} type={visible ? 'text' : 'password'}
        minLength={autoComplete === 'new-password' ? 6 : undefined} maxLength={autoComplete === 'new-password' ? 128 : undefined}
        required={required} autoComplete={autoComplete} aria-describedby={hint ? `${inputId}-hint` : undefined}/>
      <button type="button" className="password-toggle" aria-controls={inputId} aria-pressed={visible}
        aria-label={`${visible ? 'Sembunyikan' : 'Tampilkan'} ${label.toLowerCase()}`}
        title={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setVisible(!visible)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
          <circle cx="12" cy="12" r="3"/>
          {visible && <path d="m3 3 18 18"/>}
        </svg>
      </button>
    </span>
    {hint && <small id={`${inputId}-hint`} className="muted">{hint}</small>}
  </div>;
}
