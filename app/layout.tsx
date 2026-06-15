import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZenGrid 스도쿠',
  description: 'Next.js로 만든 깔끔한 스도쿠 게임',
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
