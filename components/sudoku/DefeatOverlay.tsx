import React, { useMemo, useState } from 'react';
import styles from './sudoku.module.css';
import type { Locale } from './types';
import { triggerHaptic } from '@/lib/haptics';
import { PlayIcon, TrophyIcon } from './Icons';

interface DefeatOverlayProps {
  locale: Locale;
  winnerName?: string;
  onRetry?: () => void;
  onShowDetails?: () => void;
}

interface EmberParticle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  opacity: number;
}

export const DefeatOverlay: React.FC<DefeatOverlayProps> = ({
  locale,
  winnerName,
  onRetry,
  onShowDetails,
}) => {
  const [minimized, setMinimized] = useState(false);

  // Fallen ash / burning ember particles for dramatic defeat atmosphere
  const embers = useMemo<EmberParticle[]>(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 2.0,
      size: 3 + Math.random() * 5,
      drift: (Math.random() - 0.5) * 40,
      opacity: 0.4 + Math.random() * 0.5,
    }));
  }, []);

  const displayName = winnerName || (locale === 'ko' ? '상대방' : 'Opponent');

  if (minimized) {
    return (
      <div className={styles.defeatMinimizedBadge}>
        <span className={styles.defeatMiniIcon}>💀</span>
        <span className={styles.defeatMiniText}>
          {locale === 'ko' ? '패배' : 'DEFEAT'}
        </span>
        <button
          type="button"
          className={styles.defeatMiniExpandBtn}
          onClick={() => {
            triggerHaptic('selection');
            setMinimized(false);
          }}
        >
          {locale === 'ko' ? '안내 보기' : 'Show Details'}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.defeatOverlay} role="alert" aria-live="assertive">
      {/* Background Dark Vignette & Smoke Ambient */}
      <div className={styles.defeatBackdrop} />

      {/* Floating Ember / Falling Ash Particles */}
      <div className={styles.defeatEmberContainer} aria-hidden="true">
        {embers.map((p) => (
          <span
            key={p.id}
            className={styles.defeatEmber}
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              ['--drift' as string]: `${p.drift}px`,
            }}
          />
        ))}
      </div>

      {/* Center Defeat Card */}
      <div className={styles.defeatContent}>
        {/* Animated Defeat Emblem */}
        <div className={styles.defeatIconWrapper}>
          <div className={styles.defeatIconGlow} />
          <span className={styles.defeatIcon}>💀</span>
        </div>

        {/* Large Defeat Title */}
        <h2 className={styles.defeatTitle}>
          {locale === 'ko' ? '패배했습니다' : 'DEFEATED'}
        </h2>

        {/* Subtitle / Match summary */}
        <p className={styles.defeatSubtitle}>
          {locale === 'ko'
            ? `${displayName}이(가) 먼저 퍼즐을 완성했습니다.`
            : `${displayName} completed the puzzle first.`}
        </p>

        <p className={styles.defeatEncourage}>
          {locale === 'ko'
            ? '다음 판에서 상대의 허점을 찔러 승리를 쟁취하세요!'
            : 'Sharpen your tactics and reclaim victory next round!'}
        </p>

        {/* Action Buttons */}
        <div className={styles.defeatActions}>
          {onRetry && (
            <button
              type="button"
              className={styles.defeatBtnPrimary}
              onClick={() => {
                triggerHaptic('selection');
                onRetry();
              }}
            >
              <PlayIcon size={16} color="currentColor" />
              <span>{locale === 'ko' ? '다시 도전하기' : 'Try Again'}</span>
            </button>
          )}

          {onShowDetails && (
            <button
              type="button"
              className={styles.defeatBtnSecondary}
              onClick={() => {
                triggerHaptic('selection');
                onShowDetails();
              }}
            >
              <TrophyIcon size={16} color="currentColor" />
              <span>{locale === 'ko' ? '결과 상세 보기' : 'Match Summary'}</span>
            </button>
          )}
        </div>

        {/* Toggle to peek at board */}
        <button
          type="button"
          className={styles.defeatPeekBtn}
          onClick={() => {
            triggerHaptic('selection');
            setMinimized(true);
          }}
        >
          {locale === 'ko' ? '👁️ 퍼즐 보드 확인하기' : '👁️ View Completed Board'}
        </button>
      </div>
    </div>
  );
};
