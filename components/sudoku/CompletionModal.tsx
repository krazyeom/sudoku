import React from 'react';
import styles from './sudoku.module.css';
import type {
  CompletionSummary,
  ConfettiPiece,
  Locale,
  SharedCompletionSummary,
} from './types';
import { formatTime } from './share';
import { getDifficultyLabel } from './helpers';

interface CompletionModalProps {
  isOpen: boolean;
  completionSummary: CompletionSummary | null;
  sharedCompletionSummary: SharedCompletionSummary | null;
  confettiPieces: ConfettiPiece[];
  locale: Locale;
  onClose: () => void;
  onNewGame: () => void;
  onShare: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  isOpen,
  completionSummary,
  sharedCompletionSummary,
  confettiPieces,
  locale,
  onClose,
  onNewGame,
  onShare,
}) => {
  if (!isOpen) return null;

  const isShared = Boolean(sharedCompletionSummary);
  const diff = sharedCompletionSummary?.difficulty ?? completionSummary?.difficulty ?? 'medium';
  const elapsed = sharedCompletionSummary?.elapsedSeconds ?? completionSummary?.elapsedSeconds ?? 0;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" onClick={onClose}>
      {/* Confetti Layer */}
      <div className={styles.confettiContainer} aria-hidden="true">
        {confettiPieces.map((piece, index) => (
          <span
            key={index}
            className={styles.confettiPiece}
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              width: `${piece.size}px`,
              height: `${piece.size * 0.5}px`,
              background: `hsl(${piece.hue} 95% 62%)`,
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
      </div>

      {/* Modal Dialog Card */}
      <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIcon}>{isShared ? '⚔️' : '🏆'}</div>

        <h3 className={styles.modalTitle}>
          {isShared
            ? locale === 'ko'
              ? '전투에서 승리했습니다!'
              : 'Duel Victorious!'
            : locale === 'ko'
              ? '퍼즐 클리어 완료!'
              : 'Puzzle Complete!'}
        </h3>

        <p className={styles.modalSubtitle}>
          {isShared
            ? locale === 'ko'
              ? `${
                  sharedCompletionSummary?.completedByRole === 'host'
                    ? '방장'
                    : sharedCompletionSummary?.completedByRole === 'guest'
                      ? '도전자'
                      : '플레이어'
                }가 퍼즐을 먼저 풀어 승리를 거머쥐었습니다!`
              : `${
                  sharedCompletionSummary?.completedByRole === 'host'
                    ? 'Host'
                    : sharedCompletionSummary?.completedByRole === 'guest'
                      ? 'Guest'
                      : 'Player'
                } completed the puzzle first and claimed victory!`
            : locale === 'ko'
              ? '모든 숫자를 오류 없이 완벽하게 채웠습니다.'
              : 'All numbers have been placed accurately without conflicts.'}
        </p>

        {/* Summary Card */}
        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>{locale === 'ko' ? '난이도' : 'Difficulty'}</span>
            <span className={styles.summaryValue}>{getDifficultyLabel(locale, diff)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>{locale === 'ko' ? '소요 시간' : 'Time Taken'}</span>
            <span className={styles.summaryValue} style={{ color: '#38bdf8' }}>
              {formatTime(elapsed)}
            </span>
          </div>
          {completionSummary && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{locale === 'ko' ? '내 랭킹' : 'Personal Rank'}</span>
              <span className={styles.summaryValue} style={{ color: '#a855f7' }}>
                #{completionSummary.rank} / {completionSummary.total}
              </span>
            </div>
          )}
        </div>

        {/* Modal Buttons */}
        <div className={styles.modalActions}>
          <button type="button" className={styles.btnPrimary} onClick={onNewGame}>
            <span>⚡ {locale === 'ko' ? '새 게임 시작' : 'Play Again'}</span>
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button type="button" className={styles.btnSecondary} onClick={onShare}>
              <span>📤 {locale === 'ko' ? '기록 공유' : 'Share'}</span>
            </button>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              <span>{locale === 'ko' ? '보드 보기' : 'View Board'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
