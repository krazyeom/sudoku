import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dual Sudoku',
  description: 'A 1v1 Sudoku duel game',
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
