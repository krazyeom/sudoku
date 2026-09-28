import React, { useMemo } from 'react';
import styles from './sudoku.module.css';
import type { Difficulty, Grid } from '@/lib/sudoku';
import type { Locale, NoteGrid, Position } from './types';
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
  sharedMatchGateActive: boolean;
  sharedMatchIsCountdown: boolean;
  sharedMatchCountDownSeconds: number | null;
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
  sharedMatchGateActive,
  sharedMatchIsCountdown,
  sharedMatchCountDownSeconds,
  onCellClick,
}) => {
  // If a cell is selected and has a number, highlight all identical numbers across the board!
  const selectedNumber = useMemo(() => {
    if (!selected) return null;
    return board[selected.row][selected.col];
  }, [selected, board]);

  return (
    <section className={styles.boardSection}>
      <div className={styles.boardFrame}>
        <div className={styles.boardTopInfo}>
          <div className={styles.legendBar}>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${styles.legendDotGiven}`} />
              {locale === 'ko' ? '기본 단서' : 'Given'}
            </span>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${styles.legendDotUser}`} />
              {locale === 'ko' ? '입력한 숫자' : 'User input'}
            </span>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${styles.legendDotNote}`} />
              {locale === 'ko' ? '메모' : 'Notes'}
            </span>
          </div>
          <span>
            {locale === 'ko' ? '방향키 & 1~9 입력 지원' : 'Keyboard 1-9 & Arrows supported'}
          </span>
        </div>

        <div
          className={`${styles.boardGrid} ${solved ? styles.boardGridSolved : ''}`}
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
                  onClick={() => onCellClick(r, c)}
                >
                  {cell !== null ? (
                    <span
                      className={`${isFixed ? styles.givenDigit : styles.userDigit} ${
                        isConflict ? styles.conflictDigit : ''
                      }`}
                    >
                      {cell}
                    </span>
                  ) : noteDigits.length > 0 ? (
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
