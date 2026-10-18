"use client";

import React, { useRef, useState, useEffect } from 'react';
import styles from './sudoku.module.css';
import type { Difficulty, Locale, RankTierInfo } from './types';
import { formatTime } from './share';
import { triggerHaptic } from '@/lib/haptics';

interface VictoryShareCardProps {
  difficulty: Difficulty;
  elapsedSeconds: number;
  locale: Locale;
  rankTierInfo?: RankTierInfo;
  gameMode?: string;
  streak?: number;
  onClose?: () => void;
}

export const VictoryShareCard: React.FC<VictoryShareCardProps> = ({
  difficulty,
  elapsedSeconds,
  locale,
  rankTierInfo,
  gameMode = 'solo',
  streak = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const timeFormatted = formatTime(elapsedSeconds);
  const diffLabel = difficulty === 'hard' ? 'Hard' : difficulty === 'easy' ? 'Easy' : 'Normal';
  const tierBadge = rankTierInfo ? `${rankTierInfo.badge} ${rankTierInfo.nameKo}` : 'Sudoku Duel Master';

  // Render high-resolution Cyber-Obsidian canvas card (1200x630 SNS standard)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient: Deep Cyber Obsidian with Ambient Sapphire Aurora
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090b10');
    bgGrad.addColorStop(0.5, '#0d111a');
    bgGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ambient Glow Orbs
    const radGlow1 = ctx.createRadialGradient(250, 180, 20, 250, 180, 450);
    radGlow1.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    radGlow1.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = radGlow1;
    ctx.beginPath();
    ctx.arc(250, 180, 450, 0, Math.PI * 2);
    ctx.fill();

    const radGlow2 = ctx.createRadialGradient(950, 450, 20, 950, 450, 400);
    radGlow2.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
    radGlow2.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = radGlow2;
    ctx.beginPath();
    ctx.arc(950, 450, 400, 0, Math.PI * 2);
    ctx.fill();

    // Metallic Chamfer Outer Border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Title / Header
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('SUDOKU DUEL • VICTORY CARD', 80, 100);

    // Big Victory Headline
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const headline =
      gameMode === 'vs_ai'
        ? (locale === 'ko' ? 'AI 라이벌 격파 완료!' : 'AI Rival Defeated!')
        : gameMode === 'daily'
          ? (locale === 'ko' ? '오늘의 데일리 챌린지 달성!' : 'Daily Challenge Conquered!')
          : (locale === 'ko' ? '스도쿠 퍼즐 클리어!' : 'Sudoku Puzzle Cleared!');
    ctx.fillText(headline, 80, 190);

    // Stats Grid Container
    ctx.fillStyle = 'rgba(15, 20, 30, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, 250, 1040, 220, 24);
    ctx.fill();
    ctx.stroke();

    // Stat 1: Clear Time
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(locale === 'ko' ? '클리어 타임' : 'CLEAR TIME', 130, 310);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText(timeFormatted, 130, 395);

    // Stat 2: Difficulty
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(locale === 'ko' ? '난이도' : 'DIFFICULTY', 490, 310);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(diffLabel.toUpperCase(), 490, 390);

    // Stat 3: Rank Tier or Streak
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(streak > 0 ? (locale === 'ko' ? '연속 달성 스트릭' : 'DAILY STREAK') : (locale === 'ko' ? '배틀 랭크 티어' : 'RANK TIER'), 800, 310);

    ctx.fillStyle = rankTierInfo?.color || '#fde047';
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const tierText = streak > 0 ? `🔥 ${streak} Days` : tierBadge;
    ctx.fillText(tierText, 800, 390);

    // Footer Watermark
    ctx.fillStyle = '#64748b';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Play now: sudoku-app.vercel.app • Made by krazyeom', 80, 530);

    setDownloadUrl(canvas.toDataURL('image/png'));
  }, [difficulty, elapsedSeconds, locale, rankTierInfo, gameMode, streak, timeFormatted, diffLabel, tierBadge]);

  const handleCopyText = async () => {
    triggerHaptic('success');
    const shareText = `⚔️ [Sudoku Duel] 승리 완료!\n⏱️ 기록: ${timeFormatted}\n🎯 난이도: ${diffLabel}\n🏆 랭크: ${tierBadge}\n지금 도전해보세요: ${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadImage = () => {
    if (!downloadUrl) return;
    triggerHaptic('victory');
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `sudoku-victory-${difficulty}-${timeFormatted}.png`;
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          maxWidth: '460px',
          height: 'auto',
          aspectRatio: '1200 / 630',
          borderRadius: '14px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        }}
      />

      <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '460px' }}>
        <button
          type="button"
          onClick={handleCopyText}
          className={styles.btnSecondary}
          style={{ flex: 1, height: '42px', fontSize: '0.82rem' }}
        >
          <span>📋</span>
          <span>{copied ? (locale === 'ko' ? '복사 완료!' : 'Copied!') : (locale === 'ko' ? '기록 텍스트 복사' : 'Copy Text')}</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadImage}
          className={styles.btnPrimary}
          style={{ flex: 1, height: '42px', fontSize: '0.82rem' }}
        >
          <span>📸</span>
          <span>{locale === 'ko' ? '카드 이미지 저장' : 'Save Image'}</span>
        </button>
      </div>
    </div>
  );
};
