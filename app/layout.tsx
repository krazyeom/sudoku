import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '배틀 스도쿠 | 1v1 배틀 퍼즐',
  description: '1v1 실시간 대결과 다채로운 방해 기믹이 펼쳐지는 배틀 스도쿠 게임',
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
