import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '배틀 스도쿠 | Battle Sudoku',
  description: '1v1 실시간 대결과 다채로운 방해 기믹, 오프라인 모드를 완벽 지원하는 배틀 스도쿠 게임',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '배틀 스도쿠',
  },
};

export const viewport = {
  themeColor: '#0a0c10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
