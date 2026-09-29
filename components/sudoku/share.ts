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
        '배틀 스도쿠 완료 기록 🏆',
        `난이도: ${difficultyLabel}`,
        `시간: ${formatTime(summary.elapsedSeconds)}`,
        `주어진 힌트: ${summary.clueCount}개`,
        `랭킹: ${summary.rank}/${summary.total}`,
      ].join('\n')
    : [
        'Battle Sudoku Victory 🏆',
        `Difficulty: ${difficultyLabel}`,
        `Time: ${formatTime(summary.elapsedSeconds)}`,
        `Clues: ${summary.clueCount}`,
        `Rank: #${summary.rank}/${summary.total}`,
      ].join('\n');
}

export function buildShareCardSvg(summary: CompletionSummary, locale: Locale): string {
  const difficultyLabel = getDifficultyLabel(locale, summary.difficulty);
  const title = locale === 'ko' ? '배틀 스도쿠 챔피언 결과' : 'Battle Sudoku Victory Result';
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
      <rect width="300" height="120" rx="0" fill="#18181b" stroke="#27272a"/>
      <text x="24" y="44" fill="#71717a" font-size="18" font-weight="700" font-family="-apple-system, sans-serif">${escapeXml(item.label)}</text>
      <text x="24" y="92" fill="#ffffff" font-size="34" font-weight="900" font-family="-apple-system, sans-serif">${escapeXml(item.val)}</text>
    </g>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#09090b"/>
  <rect x="40" y="40" width="1120" height="550" rx="0" fill="#121215" stroke="#27272a" stroke-width="2"/>
  
  <rect x="80" y="80" width="160" height="32" rx="0" fill="#18181b" stroke="#3f3f46"/>
  <text x="160" y="102" fill="#ffffff" font-size="14" font-weight="800" text-anchor="middle" font-family="-apple-system, sans-serif">BATTLE SUDOKU</text>
  
  <text x="80" y="180" fill="#ffffff" font-size="52" font-weight="900" font-family="-apple-system, sans-serif">${escapeXml(title)}</text>
  <text x="80" y="232" fill="#a1a1aa" font-size="26" font-weight="600" font-family="-apple-system, sans-serif">${escapeXml(subtitle)}</text>
  
  ${statsSvg}

  <text x="80" y="520" fill="#52525b" font-size="18" font-family="-apple-system, sans-serif">Single-solution verified • 1v1 Real-time Duel • Battle Sudoku</text>
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
