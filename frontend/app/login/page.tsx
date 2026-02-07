'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { getToken, setToken } from '@/lib/auth';
import { AuthResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace('/');
    }
  }, [router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiRequest<AuthResponse>('/api/v1/auth/sign_in', {
        method: 'POST',
        body: { email, password },
        token: null
      });

      setToken(response.token);
      router.push('/');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'ログインに失敗しました';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center p-6">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <h1 className="text-2xl font-bold text-slate-900">ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">アカウントにログインして整形機能を利用します。</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-700">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? '処理中...' : 'ログイン'}
          </button>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </form>

        <p className="mt-4 text-sm text-slate-600">
          アカウントがない場合は <Link href="/signup" className="text-brand-700 underline">会員登録</Link>
        </p>
      </section>
    </main>
  );
}
