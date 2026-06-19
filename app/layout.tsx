import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '스도쿠 듀얼',
  description: '1:1로 겨루는 스도쿠 듀얼 게임',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
