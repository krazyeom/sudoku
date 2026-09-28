import type { CompletionSummary, Locale } from './types';
import { getDifficultyLabel } from './helpers';

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function buildShareText(summary: CompletionSummary, locale: Locale): string {
  const difficultyLabel = getDifficultyLabel(locale, summary.difficulty);
  return locale === 'ko'
    ? [
        'SudokuDuo 완료 기록 🏆',
        `난이도: ${difficultyLabel}`,
        `시간: ${formatTime(summary.elapsedSeconds)}`,
        `주어진 힌트: ${summary.clueCount}개`,
        `랭킹: ${summary.rank}/${summary.total}`,
      ].join('\n')
    : [
        'SudokuDuo Victory 🏆',
        `Difficulty: ${difficultyLabel}`,
        `Time: ${formatTime(summary.elapsedSeconds)}`,
        `Clues: ${summary.clueCount}`,
        `Rank: #${summary.rank}/${summary.total}`,
      ].join('\n');
}

export function buildShareCardSvg(summary: CompletionSummary, locale: Locale): string {
  const difficultyLabel = getDifficultyLabel(locale, summary.difficulty);
  const title = locale === 'ko' ? 'SudokuDuo 챔피언 결과' : 'SudokuDuo Victory Result';
  const subtitle = locale === 'ko' ? `${difficultyLabel} 난이도 클리어!` : `${difficultyLabel} Cleared!`;

  const lines = [
    { label: locale === 'ko' ? '소요 시간' : 'Time', val: formatTime(summary.elapsedSeconds) },
    { label: locale === 'ko' ? '초기 힌트' : 'Clues', val: `${summary.clueCount} cells` },
    { label: locale === 'ko' ? '내 랭킹' : 'Rank', val: `#${summary.rank} of ${summary.total}` },
  ];

  const statsSvg = lines
    .map(
      (item, i) => `
    <g transform="translate(${80 + i * 340}, 300)">
      <rect width="300" height="120" rx="20" fill="rgba(30, 41, 59, 0.6)" stroke="rgba(255, 255, 255, 0.08)"/>
      <text x="24" y="44" fill="#94a3b8" font-size="20" font-weight="600" font-family="Inter, sans-serif">${escapeXml(item.label)}</text>
      <text x="24" y="92" fill="#38bdf8" font-size="34" font-weight="800" font-family="Inter, sans-serif">${escapeXml(item.val)}</text>
    </g>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="mesh" cx="10%" cy="10%" r="80%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#9333ea" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#030712" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="card-border" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4"/>
      <stop offset="50%" stop-color="#818cf8" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#c084fc" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="title-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="60%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#030712"/>
  <rect width="1200" height="630" fill="url(#mesh)"/>
  <rect x="40" y="40" width="1120" height="550" rx="36" fill="rgba(15, 23, 42, 0.75)" stroke="url(#card-border)" stroke-width="2"/>
  
  <rect x="80" y="80" width="140" height="34" rx="17" fill="rgba(56, 189, 248, 0.15)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="150" y="103" fill="#7dd3fc" font-size="16" font-weight="700" text-anchor="middle" font-family="Inter, sans-serif">SUDOKUDUO</text>
  
  <text x="80" y="180" fill="url(#title-grad)" font-size="52" font-weight="900" font-family="Inter, sans-serif">${escapeXml(title)}</text>
  <text x="80" y="232" fill="#cbd5e1" font-size="28" font-weight="500" font-family="Inter, sans-serif">${escapeXml(subtitle)}</text>
  
  ${statsSvg}

  <text x="80" y="520" fill="#64748b" font-size="20" font-family="Inter, sans-serif">Single-solution verified • 1v1 Real-time Duel • SudokuDuo</text>
</svg>`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // continue to fallback
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}
