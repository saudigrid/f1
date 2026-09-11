'use client';

import { useActionState } from 'react';

import { loginAction } from './actions';

export function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="mx-auto mt-24 w-full max-w-sm">
      <h1 className="text-xl font-bold">لوحة المراجعة</h1>
      <p className="mt-1.5 text-sm text-muted">هذه الصفحة للمحرّر فقط.</p>

      <input
        type="password"
        name="password"
        required
        autoComplete="current-password"
        placeholder="كلمة المرور"
        className="mt-6 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-red"
      />

      {error && <p className="mt-3 text-sm text-red">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-red px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-hover disabled:opacity-60"
      >
        {pending ? 'جارٍ التحقق…' : 'دخول'}
      </button>
    </form>
  );
}
