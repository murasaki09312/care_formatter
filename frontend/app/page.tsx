'use client';

import { useEffect, useMemo, useState } from 'react';

type Mode = 'handover' | 'summary' | 'family';
type Tone = 'objective' | 'warm';

type FormatResponse = {
  result: string;
  meta: {
    mode: Mode;
    tone: Tone;
    category_order: string[];
    used_llm: boolean;
  };
};

const DEFAULT_API_BASE = 'http://localhost:3001';
const REQUEST_TIMEOUT_MS = 15000;

export default function HomePage() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('handover');
  const [tone, setTone] = useState<Tone>('objective');
  const [result, setResult] = useState('');
  const [usedLlm, setUsedLlm] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE,
    []
  );

  useEffect(() => {
    const savedTone = window.localStorage.getItem('care_formatter_tone');
    if (savedTone === 'objective' || savedTone === 'warm') {
      setTone(savedTone);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('care_formatter_tone', tone);
  }, [tone]);

  const canSubmit = text.trim().length > 0 && !loading;

  const runFormat = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode, tone }),
        signal: controller.signal
      });

      const payload = (await response.json()) as FormatResponse | { error: string };

      if (!response.ok) {
        const message = 'error' in payload ? payload.error : 'API request failed';
        throw new Error(message);
      }

      if (!('result' in payload)) {
        throw new Error('Invalid API response');
      }

      setResult(payload.result);
      setUsedLlm(payload.meta.used_llm);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message === 'The operation was aborted.') {
        setError('タイムアウトしました。時間をおいて再実行してください。');
      } else {
        setError(message);
      }
    } finally {
      clearTimeout(timer);
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

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <section className="mb-8 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-card backdrop-blur">
        <p className="text-sm font-medium text-brand-700">Care Formatter</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          介護記録 整形/要約ツール
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Rails APIへ送信して、申し送り・要約・家族向け文章を生成します。
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
          <h2 className="text-lg font-semibold text-slate-900">入力</h2>

          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="record-text">
            記録テキスト
          </label>
          <textarea
            id="record-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder="例: 9時10分に体温36.5、血圧128/74。昼食は主菜8割摂取。14時にトイレ誘導し排尿あり。"
            className="mt-2 w-full resize-y rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-brand-500 transition focus:ring-2"
          />

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
                    <span>{value}</span>
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
                    <span>{value}</span>
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

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </article>

        <article className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">結果</h2>
              <p className="mt-1 text-xs text-slate-500">
                used_llm: {usedLlm === null ? '-' : usedLlm ? 'true' : 'false'}
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

          <pre className="mt-4 min-h-[360px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {result || 'ここに結果が表示されます。'}
          </pre>

          {copied && (
            <div className="absolute right-6 top-16 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
              コピーしました
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
