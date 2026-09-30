import React, { useMemo } from 'react';
import styles from './sudoku.module.css';
import type { Difficulty, Grid } from '@/lib/sudoku';
import type { ActiveDebuff, BattleToast, GameMode, Locale, NoteGrid, Position } from './types';
import { getNoteCellValue } from './helpers';

interface SudokuBoardProps {
  board: Grid;
  notes: NoteGrid;
  fixedCells: boolean[][];
  selected: Position;
  solved: boolean;
  conflictCells: Set<string>;
  checks: { row: number; col: number }[];
  hintPreview: { row: number; col: number; value: number } | null;
  difficulty: Difficulty;
  locale: Locale;
  gameMode?: GameMode;
  isAiWinner?: boolean;
  sharedMatchGateActive: boolean;
  sharedMatchIsCountdown: boolean;
  sharedMatchCountDownSeconds: number | null;
  activeDebuff?: ActiveDebuff;
  battleToast?: BattleToast | null;
  onCellClick: (row: number, col: number) => void;
}

export const SudokuBoard: React.FC<SudokuBoardProps> = ({
  board,
  notes,
  fixedCells,
  selected,
  solved,
  conflictCells,
  checks,
  hintPreview,
  difficulty,
  locale,
  gameMode = 'solo',
  isAiWinner = false,
  sharedMatchGateActive,
  sharedMatchIsCountdown,
  sharedMatchCountDownSeconds,
  activeDebuff = null,
  battleToast = null,
  onCellClick,
}) => {
  // If a cell is selected and has a number, highlight all identical numbers across the board!
  const selectedNumber = useMemo(() => {
    if (!selected) return null;
    return board[selected.row][selected.col];
  }, [selected, board]);

  const isFrozen = activeDebuff?.type === 'freeze';
  const isQuake = activeDebuff?.type === 'quake';
  const isBlind = activeDebuff?.type === 'blind';
  const isMist = activeDebuff?.type === 'mist';
  const isBoardLocked = sharedMatchGateActive || isFrozen;

  return (
    <section className={styles.boardSection}>
      {/* Permanent Fixed-Height Tactical Message Board (CLS-Free) */}
      <div
        className={`${styles.topMessageBoard} ${
          battleToast
            ? styles[`topMessageBoard_${battleToast.type}`]
            : activeDebuff
              ? styles.topMessageBoard_debuff
              : styles.topMessageBoard_idle
        }`}
        role="status"
        aria-live="polite"
      >
        {battleToast ? (
          <div className={styles.topMessageBoardContent}>
            <span className={styles.topMessageBoardIcon}>
              {battleToast.type === 'attack_launched'
                ? '⚡'
                : battleToast.type === 'attack_received'
                  ? '🚨'
                  : '✨'}
            </span>
            <div className={styles.topMessageBoardTexts}>
              <strong className={styles.topMessageBoardTitle}>{battleToast.title}</strong>
              <span className={styles.topMessageBoardSubtitle}>{battleToast.subtitle}</span>
            </div>
            {battleToast.debuffType && (
              <span className={styles.topMessageBoardBadge}>
                {battleToast.debuffType.toUpperCase()}
              </span>
            )}
          </div>
        ) : activeDebuff ? (
          <div className={styles.topMessageBoardContent}>
            <span className={styles.topMessageBoardIcon}>
              {activeDebuff.type === 'freeze'
                ? '❄️'
                : activeDebuff.type === 'scramble'
                  ? '🌀'
                  : activeDebuff.type === 'blind'
                    ? '🌑'
                    : activeDebuff.type === 'mist'
                      ? '🌫️'
                      : '📳'}
            </span>
            <div className={styles.topMessageBoardTexts}>
              <strong className={styles.topMessageBoardTitle}>
                {locale === 'ko' ? `🚨 디버프 발동: ${activeDebuff.label}` : `🚨 Active Debuff: ${activeDebuff.label}`}
              </strong>
              <span className={styles.topMessageBoardSubtitle}>
                {locale === 'ko'
                  ? '기믹 효과가 적용되는 동안 침착하게 퍼즐을 풀어나가세요!'
                  : 'Maintain your focus while the debuff is active!'}
              </span>
            </div>
          </div>
        ) : isAiWinner ? (
          <div className={styles.topMessageBoardContent}>
            <span className={styles.topMessageBoardIcon}>🤖</span>
            <div className={styles.topMessageBoardTexts}>
              <strong className={styles.topMessageBoardTitle} style={{ color: '#f43f5e' }}>
                {locale === 'ko' ? '알파도쿠 AI 승리 (패배)' : 'Alphadoku AI Wins (Defeat)'}
              </strong>
              <span className={styles.topMessageBoardSubtitle}>
                {locale === 'ko'
                  ? '좌측 하단 패널에서 대결 결과 및 완성도를 확인하세요.'
                  : 'Check match results in the bottom-left panel.'}
              </span>
            </div>
            <span className={styles.topMessageBoardBadge}>
              {locale === 'ko' ? '패배' : 'DEFEAT'}
            </span>
          </div>
        ) : (
          <div className={styles.topMessageBoardContent}>
            <span className={styles.topMessageBoardIcon}>
              {gameMode === 'solo' ? '🧘' : gameMode === 'vs_ai' ? '🤖' : '⚔️'}
            </span>
            <div className={styles.topMessageBoardTexts}>
              <strong className={styles.topMessageBoardTitle}>
                {gameMode === 'solo'
                  ? locale === 'ko' ? '싱글 집중 모드' : 'Solo Focus Mode'
                  : gameMode === 'vs_ai'
                    ? locale === 'ko' ? '알파도쿠 AI 배틀' : 'AI Rival Duel'
                    : locale === 'ko' ? '실시간 1v1 배틀' : 'Live 1v1 Battle'}
              </strong>
              <span className={styles.topMessageBoardSubtitle}>
                {gameMode === 'solo'
                  ? locale === 'ko'
                    ? '기믹 공격 없이 순수 두뇌 스피드런 및 퍼즐 해결에 집중합니다.'
                    : 'Focus on pure classic Sudoku speedrun without battle gimmicks.'
                  : locale === 'ko'
                    ? '가로/세로/3x3 완성 또는 빠른 연속 정답 시 상대에게 기믹 공격 발동!'
                    : 'Complete lines, 3x3 boxes or rapid combos to strike your rival!'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={`${styles.boardFrame} ${isQuake ? styles.boardQuake : ''}`}>
        <div className={styles.boardTopInfo}>
          <div className={styles.legendBar}>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${styles.legendDotGiven}`} />
              {locale === 'ko' ? '단서' : 'Given'}
            </span>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${styles.legendDotUser}`} />
              {locale === 'ko' ? '입력' : 'Input'}
            </span>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${styles.legendDotNote}`} />
              {locale === 'ko' ? '메모' : 'Notes'}
            </span>
          </div>
          <span className={styles.boardControlHint}>
            {locale === 'ko' ? '방향키 & 1~9 지원' : 'Arrows & 1-9 Keys'}
          </span>
        </div>

        <div
          className={`${styles.boardGrid} ${solved ? styles.boardGridSolved : ''} ${
            sharedMatchGateActive ? styles.boardGridHidden : ''
          } ${isBlind ? styles.boardBlind : ''} ${isMist ? styles.boardMist : ''}`}
          role="grid"
          aria-label="Sudoku board"
        >
          {/* Match Gate Overlay in Shared Battle */}
          {sharedMatchGateActive && (
            <div className={styles.boardGateOverlay} role="status" aria-live="polite">
              {sharedMatchIsCountdown ? (
                <>
                  <div className={styles.countdownNumber}>
                    {sharedMatchCountDownSeconds ?? 5}
                  </div>
                  <h3 className={styles.gateTitle}>
                    {locale === 'ko' ? '대전이 곧 시작됩니다!' : 'Duel starting soon!'}
                  </h3>
                  <p className={styles.gateSubtitle}>
                    {locale === 'ko'
                      ? '카운트다운이 끝나면 양 플레이어에게 보드가 동시에 공개됩니다.'
                      : 'The board will be revealed to both players simultaneously.'}
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '3rem' }}>⏳</div>
                  <h3 className={styles.gateTitle}>
                    {locale === 'ko' ? '상대방 참가 대기 중…' : 'Waiting for opponent…'}
                  </h3>
                  <p className={styles.gateSubtitle}>
                    {locale === 'ko'
                      ? '두 번째 플레이어가 방에 접속하면 5초 카운트다운 후 경기가 시작됩니다.'
                      : 'When the rival joins, a 5-second countdown will begin.'}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Frozen Debuff Overlay */}
          {!sharedMatchGateActive && isFrozen && (
            <div className={styles.freezeOverlay} role="status">
              <span className={styles.freezeIcon}>❄️</span>
              <strong className={styles.freezeTitle}>
                {locale === 'ko' ? '보드 빙결!' : 'Board Frozen!'}
              </strong>
              <span className={styles.freezeSubtitle}>
                {locale === 'ko' ? '잠시 동안 숫자를 입력할 수 없습니다.' : 'Input temporarily locked.'}
              </span>
            </div>
          )}

          {/* Blind Ink Splatters */}
          {!sharedMatchGateActive && isBlind && (
            <div className={styles.blindInkContainer} aria-hidden="true">
              <div className={`${styles.inkSplat} ${styles.inkSplat1}`} />
              <div className={`${styles.inkSplat} ${styles.inkSplat2}`} />
              <div className={`${styles.inkSplat} ${styles.inkSplat3}`} />
            </div>
          )}

          {/* Smoke Mist Overlay */}
          {!sharedMatchGateActive && isMist && (
            <div className={styles.mistOverlay} aria-hidden="true" />
          )}

          {/* 81 Cells */}
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isFixed = fixedCells[r][c];
              const isSelected = selected?.row === r && selected?.col === c;
              const isRelated =
                selected !== null &&
                !isSelected &&
                (selected.row === r ||
                  selected.col === c ||
                  (Math.floor(selected.row / 3) === Math.floor(r / 3) &&
                    Math.floor(selected.col / 3) === Math.floor(c / 3)));

              const isMatchingDigit =
                selectedNumber !== null && cell !== null && cell === selectedNumber && !isSelected;

              const isCheckWrong =
                difficulty === 'easy' && checks.some((item) => item.row === r && item.col === c);
              const isConflict = isCheckWrong || conflictCells.has(`${r}-${c}`);
              const isHint = hintPreview?.row === r && hintPreview?.col === c;

              const isColBreak = c === 2 || c === 5;
              const isRowBreak = r === 2 || r === 5;
              const isLastCol = c === 8;
              const isLastRow = r === 8;

              const noteDigits = notes[r][c];

              const cellClasses = [
                styles.cell,
                isColBreak ? styles.cellColBreak : '',
                isRowBreak ? styles.cellRowBreak : '',
                isLastCol ? styles.cellNoRightBorder : '',
                isLastRow ? styles.cellNoBottomBorder : '',
                isRelated ? styles.cellRelated : '',
                isMatchingDigit ? styles.cellMatchingDigit : '',
                isSelected ? styles.cellSelected : '',
                isConflict ? styles.cellConflict : '',
                isHint ? styles.cellHintPreview : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  role="gridcell"
                  aria-label={`row ${r + 1} column ${c + 1}`}
                  className={cellClasses}
                  onClick={() => {
                    if (!isBoardLocked) {
                      onCellClick(r, c);
                    }
                  }}
                  disabled={isBoardLocked}
                >
                  {!sharedMatchGateActive && cell !== null ? (
                    <span
                      className={`${isFixed ? styles.givenDigit : styles.userDigit} ${
                        isConflict ? styles.conflictDigit : ''
                      }`}
                    >
                      {cell}
                    </span>
                  ) : !sharedMatchGateActive && noteDigits.length > 0 ? (
                    <div className={styles.notesGrid}>
                      {getNoteCellValue(noteDigits).map((val, idx) => (
                        <span
                          key={idx}
                          className={`${styles.noteSlot} ${
                            selectedNumber !== null && val === String(selectedNumber)
                              ? styles.noteSlotMatching
                              : ''
                          }`}
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
