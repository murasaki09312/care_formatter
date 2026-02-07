import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '介護記録フォーマッター',
  description: '介護記録の整形/要約ツール'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
