'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import { BillingMeResponse } from '@/lib/types';
import LoggedInHeader from '@/components/logged-in-header';

const PLANS = [
  { key: 'basic', price: '¥300/月', model: 'gpt-4o-mini', monthly: 30, chars: 1000 },
  { key: 'standard', price: '¥500/月', model: 'gpt-4.1-mini', monthly: 100, chars: 1000 },
  { key: 'pro', price: '¥1000/月', model: 'gpt-4.1-mini', monthly: 500, chars: 3000 }
] as const;

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<BillingMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchMe = async () => {
      try {
        const response = await apiRequest<BillingMeResponse>('/api/v1/billing/me');
        setData(response);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          clearToken();
          router.replace('/login');
          return;
        }
        setError(e instanceof ApiError ? e.message : 'プラン情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    void fetchMe();
  }, [router]);

  const currentPlan = useMemo(() => data?.plan || 'basic', [data]);

  const onCheckout = async (plan: 'basic' | 'standard' | 'pro') => {
    setCheckoutLoadingPlan(plan);
    setError('');

    try {
      const response = await apiRequest<{ url: string }>('/api/v1/billing/checkout_session', {
        method: 'POST',
        body: { plan }
      });
      window.location.href = response.url;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }
      setError(e instanceof ApiError ? e.message : '決済ページの作成に失敗しました');
      setCheckoutLoadingPlan(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <LoggedInHeader
        eyebrow="Account"
        title="プラン管理"
        description="現在の利用状況を確認し、必要に応じてアップグレードしてください。"
        links={[{ href: '/', label: '整形ページへ' }]}
      />

      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-card">読み込み中...</p>}

      {!loading && data && (
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-slate-900">現在の契約</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <p>プラン: <span className="font-semibold uppercase">{data.plan}</span></p>
            <p>契約状態: <span className="font-semibold">{data.subscription_status}</span></p>
            <p>使用回数: <span className="font-semibold">{data.limits.monthly_used}/{data.limits.monthly_limit}</span></p>
            <p>残回数: <span className="font-semibold">{data.limits.remaining}</span></p>
            <p>文字数上限: <span className="font-semibold">{data.limits.max_input_chars}</span></p>
            <p>利用モデル: <span className="font-semibold">{data.limits.model_name}</span></p>
          </div>
        </section>
      )}

      {error && <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <article key={plan.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{plan.key}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{plan.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>モデル: {plan.model}</li>
                <li>月間回数: {plan.monthly}回</li>
                <li>入力上限: {plan.chars}文字</li>
              </ul>
              <button
                onClick={() => onCheckout(plan.key)}
                disabled={isCurrent || checkoutLoadingPlan !== null}
                className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isCurrent ? '現在のプラン' : checkoutLoadingPlan === plan.key ? '遷移中...' : 'このプランにする'}
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
