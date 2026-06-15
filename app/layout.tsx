import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZenGrid Sudoku',
  description: 'Modern Sudoku game built with Next.js',
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
