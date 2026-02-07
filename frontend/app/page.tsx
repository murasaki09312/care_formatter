'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import { BillingMeResponse, FormatResponse, LimitStats, Mode, Tone } from '@/lib/types';
import LoggedInHeader from '@/components/logged-in-header';

const MODE_LABELS: Record<Mode, string> = {
  handover: '申し送り',
  summary: '要約',
  family: '家族向け'
};

const TONE_LABELS: Record<Tone, string> = {
  objective: '客観',
  warm: '温かみ'
};

export default function HomePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('handover');
  const [tone, setTone] = useState<Tone>('objective');
  const [result, setResult] = useState('');
  const [meta, setMeta] = useState<FormatResponse['meta'] | null>(null);
  const [limits, setLimits] = useState<LimitStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedTone = window.localStorage.getItem('care_formatter_tone');
    if (savedTone === 'objective' || savedTone === 'warm') {
      setTone(savedTone);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('care_formatter_tone', tone);
  }, [tone]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchBilling = async () => {
      try {
        const billing = await apiRequest<BillingMeResponse>('/api/v1/billing/me');
        setLimits(billing.limits);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          clearToken();
          router.replace('/login');
          return;
        }
        setError(e instanceof ApiError ? e.message : '利用情報の取得に失敗しました');
      } finally {
        setInitialLoading(false);
      }
    };

    void fetchBilling();
  }, [router]);

  const maxInputChars = limits?.max_input_chars ?? 1000;
  const isTooLong = text.length > maxInputChars;
  const canSubmit = text.trim().length > 0 && !loading && !isTooLong;

  const runFormat = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiRequest<FormatResponse>('/api/v1/format', {
        method: 'POST',
        body: { text, mode, tone }
      });

      setResult(response.result);
      setMeta(response.meta);
      setLimits({
        plan: response.meta.plan,
        monthly_used: response.meta.monthly_used,
        monthly_limit: response.meta.monthly_limit,
        remaining: response.meta.remaining,
        max_input_chars: response.meta.max_input_chars,
        model_name: response.meta.model_name
      });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          clearToken();
          router.push('/login');
          return;
        }

        if (e.errorCode === 'MONTHLY_LIMIT_EXCEEDED') {
          setError('今月の回数上限に達しました。プラン変更 or 来月まで待つ');
        } else if (e.errorCode === 'TEXT_TOO_LONG') {
          setError('文字数上限を超えています。分割してください');
        } else {
          setError(e.message);
        }
      } else {
        setError('整形に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setError('コピーに失敗しました。ブラウザの権限を確認してください。');
    }
  };

  const usageSummary = useMemo(() => {
    if (!limits) return '-';
    return `${limits.monthly_used}/${limits.monthly_limit} (残り ${limits.remaining})`;
  }, [limits]);

  if (initialLoading) {
    return (
      <main className="mx-auto max-w-6xl p-4 md:p-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <p className="text-sm text-slate-600">読み込み中...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <LoggedInHeader
        eyebrow="Care Formatter"
        title="介護記録 整形/要約ツール"
        description="ログイン中プランに応じて利用回数と文字数上限を自動適用します。"
        links={[{ href: '/account', label: 'アカウント' }]}
      />
      <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-card">
        <div className="grid gap-2 md:grid-cols-3">
          <p>現在プラン: <span className="font-semibold uppercase">{limits?.plan || 'basic'}</span></p>
          <p>利用回数: <span className="font-semibold">{usageSummary}</span></p>
          <p>入力上限: <span className="font-semibold">{maxInputChars}文字</span></p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
          <h2 className="text-lg font-semibold text-slate-900">入力</h2>

          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="record-text">記録テキスト</label>
          <textarea
            id="record-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder="例: 9時10分に体温36.5、血圧128/74。昼食は主菜8割摂取。14時にトイレ誘導し排尿あり。"
            className="mt-2 w-full resize-y rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-brand-500 transition focus:ring-2"
          />
          <p className={`mt-2 text-xs ${isTooLong ? 'text-red-600' : 'text-slate-500'}`}>{text.length}/{maxInputChars}</p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">モード</legend>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                {(['handover', 'summary', 'family'] as const).map((value) => (
                  <label key={value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      value={value}
                      checked={mode === value}
                      onChange={() => setMode(value)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <span>{MODE_LABELS[value]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">文体</legend>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                {(['objective', 'warm'] as const).map((value) => (
                  <label key={value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tone"
                      value={value}
                      checked={tone === value}
                      onChange={() => setTone(value)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <span>{TONE_LABELS[value]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <button
            type="button"
            onClick={runFormat}
            disabled={!canSubmit}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? '整形中...' : '整形を実行'}
          </button>

          {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </article>

        <article className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">結果</h2>
              <p className="mt-1 text-xs text-slate-500">
                used_llm: {meta ? (meta.used_llm ? 'true' : 'false') : '-'} / model: {meta?.model_name || '-'}
              </p>
            </div>
            <button
              type="button"
              onClick={copyResult}
              disabled={!result}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              コピー
            </button>
          </div>

          <pre className="mt-4 min-h-[260px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">{result || 'ここに結果が表示されます。'}</pre>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p>plan: {meta?.plan || limits?.plan || '-'}</p>
            <p>monthly: {meta ? `${meta.monthly_used}/${meta.monthly_limit}` : limits ? `${limits.monthly_used}/${limits.monthly_limit}` : '-'}</p>
            <p>remaining: {meta?.remaining ?? limits?.remaining ?? '-'}</p>
            <p>max_input_chars: {meta?.max_input_chars ?? limits?.max_input_chars ?? '-'}</p>
          </div>

          {copied && (
            <div className="absolute right-6 top-16 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">コピーしました</div>
          )}
        </article>
      </section>
    </main>
  );
}
