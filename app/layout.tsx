import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sudoku.krazyeom.com'),
  title: '배틀 스도쿠 | Battle Sudoku 1v1',
  description: '1v1 실시간 대결과 다채로운 방해 기믹, 오프라인 모드를 완벽 지원하는 차세대 배틀 스도쿠',
  alternates: {
    canonical: 'https://sudoku.krazyeom.com',
  },
  openGraph: {
    title: '배틀 스도쿠 | Battle Sudoku 1v1',
    description: '1v1 실시간 대결과 다채로운 방해 기믹, 오프라인 모드를 완벽 지원하는 차세대 배틀 스도쿠',
    url: 'https://sudoku.krazyeom.com',
    siteName: 'Sudoku Duel',
  },
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
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    { media: '(prefers-color-scheme: light)', color: '#09090b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="chess">
      <body>{children}</body>
    </html>
  );
}
