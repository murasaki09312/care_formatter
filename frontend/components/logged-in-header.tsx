'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';

type HeaderLink = {
  href: string;
  label: string;
};

type LoggedInHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  links?: HeaderLink[];
};

export default function LoggedInHeader({ eyebrow, title, description, links = [] }: LoggedInHeaderProps) {
  const router = useRouter();

  const onLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-card backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-700">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={onLogout}
            className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900"
          >
            ログアウト
          </button>
        </div>
      </div>
    </section>
  );
}
