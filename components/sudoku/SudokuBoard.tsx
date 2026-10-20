import React, { useMemo, useState, useEffect } from 'react';
import styles from './sudoku.module.css';
import type { Difficulty, Grid } from '@/lib/sudoku';
import type { ActiveDebuff, BattleToast, GameMode, Locale, NoteGrid, Position } from './types';
import { getNoteCellValue } from './helpers';
import {
  SoloIcon,
  BotIcon,
  SwordIcon,
  ZapIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from './Icons';
import { triggerHaptic } from '@/lib/haptics';
import { DefeatOverlay } from './DefeatOverlay';

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
  isDefeated?: boolean;
  defeatWinnerName?: string;
  onRetry?: () => void;
  onShowDetails?: () => void;
  sharedMatchGateActive: boolean;
  sharedMatchIsCountdown: boolean;
  sharedMatchCountDownSeconds: number | null;
  activeDebuff?: ActiveDebuff;
  battleToast?: BattleToast | null;
  onCellClick: (row: number, col: number) => void;
}

interface InkSplatData {
  id: number;
  top: string;
  left: string;
  width: string;
  height: string;
  transform: string;
  clipPath: string;
  opacity: number;
}

const INK_SHAPES = [
  'polygon(25% 0%, 70% 10%, 100% 45%, 85% 85%, 40% 100%, 0% 75%, 5% 25%)',
  'polygon(15% 10%, 80% 0%, 95% 65%, 60% 95%, 10% 80%, 0% 40%)',
  'polygon(30% 0%, 90% 20%, 100% 80%, 45% 100%, 0% 60%)',
  'polygon(20% 5%, 75% 0%, 98% 30%, 88% 80%, 55% 98%, 15% 88%, 0% 50%)',
  'polygon(40% 0%, 85% 15%, 100% 60%, 70% 95%, 25% 90%, 0% 55%, 10% 20%)',
  'polygon(10% 20%, 65% 5%, 95% 25%, 90% 70%, 50% 95%, 5% 75%)',
  'polygon(50% 0%, 90% 35%, 80% 90%, 20% 85%, 5% 40%)',
  'polygon(35% 5%, 80% 15%, 95% 50%, 80% 85%, 30% 95%, 5% 70%, 10% 30%)',
];

function generateRandomInkSplats(): InkSplatData[] {
  // 3 distinct primary ink splatters spread across top, middle, and bottom sectors
  const primaryZones = [
    { topMin: 5, topMax: 28, leftMin: 6, leftMax: 62 },
    { topMin: 32, topMax: 56, leftMin: 12, leftMax: 58 },
    { topMin: 60, topMax: 78, leftMin: 8, leftMax: 65 },
  ];

  const splats: InkSplatData[] = primaryZones.map((zone, idx) => {
    const top = zone.topMin + Math.floor(Math.random() * (zone.topMax - zone.topMin));
    const left = zone.leftMin + Math.floor(Math.random() * (zone.leftMax - zone.leftMin));
    const width = 160 + Math.floor(Math.random() * 85);
    const height = 130 + Math.floor(Math.random() * 75);
    const rotate = Math.floor(Math.random() * 360);
    const shape = INK_SHAPES[idx % INK_SHAPES.length];
    const opacity = 0.92 + Math.random() * 0.06;

    return {
      id: idx + 1,
      top: `${top}%`,
      left: `${left}%`,
      width: `${width}px`,
      height: `${height}px`,
      transform: `rotate(${rotate}deg)`,
      clipPath: shape,
      opacity,
    };
  });

  // 3 smaller scattered ink droplets for realistic splatter effect
  for (let i = 0; i < 3; i++) {
    const top = 8 + Math.floor(Math.random() * 80);
    const left = 8 + Math.floor(Math.random() * 80);
    const size = 35 + Math.floor(Math.random() * 45);
    const rotate = Math.floor(Math.random() * 360);
    const shape = INK_SHAPES[(i + 3) % INK_SHAPES.length];

    splats.push({
      id: i + 10,
      top: `${top}%`,
      left: `${left}%`,
      width: `${size}px`,
      height: `${size}px`,
      transform: `rotate(${rotate}deg)`,
      clipPath: shape,
      opacity: 0.85 + Math.random() * 0.1,
    });
  }

  return splats;
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
  isDefeated = false,
  defeatWinnerName,
  onRetry,
  onShowDetails,
  sharedMatchGateActive,
  sharedMatchIsCountdown,
  sharedMatchCountDownSeconds,
  activeDebuff = null,
  battleToast = null,
  onCellClick,
}) => {
  // If a cell is selected and has a number, highlight all identical numbers across the board
  const selectedNumber = useMemo(() => {
    if (!selected) return null;
    return board[selected.row][selected.col];
  }, [selected, board]);

  const isFrozen = activeDebuff?.type === 'freeze';
  const isQuake = activeDebuff?.type === 'quake';
  const isBlind = activeDebuff?.type === 'blind';
  const isMist = activeDebuff?.type === 'mist';
  const isBoardLocked = sharedMatchGateActive || isFrozen;

  // Generate randomized ink splatter layout for every new blind debuff instance
  const inkSplats = useMemo(() => {
    if (!isBlind) return [];
    return generateRandomInkSplats();
  }, [isBlind, activeDebuff?.endsAt]);

  // Interactive Ink Wiper: wipe away ink splatters with touch or swipe
  const [wipedSplats, setWipedSplats] = useState<Set<number>>(new Set());

  useEffect(() => {
    setWipedSplats(new Set());
  }, [activeDebuff?.endsAt]);

  const handleWipeSplat = (id: number) => {
    if (wipedSplats.has(id)) return;
    triggerHaptic('erase');
    setWipedSplats((prev) => new Set(prev).add(id));
  };

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
              {battleToast.type === 'attack_launched' ? (
                <ZapIcon size={16} color="var(--accent-primary, #ffffff)" />
              ) : battleToast.type === 'attack_received' ? (
                <ShieldAlertIcon size={16} color="#f43f5e" />
              ) : (
                <SparklesIcon size={16} color="#38bdf8" />
              )}
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
              <ShieldAlertIcon size={16} color="#f43f5e" />
            </span>
            <div className={styles.topMessageBoardTexts}>
              <strong className={styles.topMessageBoardTitle} style={{ color: '#fecdd3' }}>
                {locale === 'ko' ? `디버프: ${activeDebuff.label}` : `Active Debuff: ${activeDebuff.label}`}
              </strong>
              <span className={styles.topMessageBoardSubtitle}>
                {locale === 'ko'
                  ? '기믹 효과가 적용되는 동안 침착하게 퍼즐을 풀어나가세요.'
                  : 'Maintain focus while the debuff is active.'}
              </span>
            </div>
          </div>
        ) : isDefeated || isAiWinner ? (
          <div className={styles.topMessageBoardContent}>
            <span className={styles.topMessageBoardIcon}>
              {isAiWinner ? <BotIcon size={16} color="#f43f5e" /> : <SwordIcon size={16} color="#f43f5e" />}
            </span>
            <div className={styles.topMessageBoardTexts}>
              <strong className={styles.topMessageBoardTitle} style={{ color: '#f43f5e' }}>
                {locale === 'ko'
                  ? `${defeatWinnerName || (isAiWinner ? '알파도쿠 AI' : '상대방')} 승리 (패배)`
                  : `${defeatWinnerName || (isAiWinner ? 'Alphadoku AI' : 'Opponent')} Won (Defeat)`}
              </strong>
              <span className={styles.topMessageBoardSubtitle}>
                {locale === 'ko'
                  ? '보드 중앙의 패배 안내 및 대결 결과를 확인하세요.'
                  : 'Check match summary and battle result.'}
              </span>
            </div>
            <span className={styles.topMessageBoardBadge}>
              {locale === 'ko' ? '패배' : 'DEFEAT'}
            </span>
          </div>
        ) : (
          <div className={styles.topMessageBoardContent}>
            <span className={styles.topMessageBoardIcon}>
              {gameMode === 'solo' ? (
                <SoloIcon size={16} color="var(--text-secondary, #a1a1ab)" />
              ) : gameMode === 'vs_ai' ? (
                <BotIcon size={16} color="var(--accent-primary, #ffffff)" />
              ) : (
                <SwordIcon size={16} color="var(--accent-primary, #ffffff)" />
              )}
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

      <div className={`${styles.boardFrame} ${isQuake ? styles.boardQuake : ''} ${isDefeated ? styles.boardFrameDefeated : ''}`}>
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

        <div className={styles.boardCoordinatesWrapper}>
          <div className={styles.boardColCoords} aria-hidden="true">
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((col) => (
              <span key={col} className={styles.coordChar}>
                {col}
              </span>
            ))}
          </div>

          <div className={styles.boardGridWithRowCoords}>
            <div className={styles.boardRowCoords} aria-hidden="true">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((row) => (
                <span key={row} className={styles.coordChar}>
                  {row}
                </span>
              ))}
            </div>

            <div
              className={`${styles.boardGrid} ${
                solved ? (isDefeated ? styles.boardGridDefeated : styles.boardGridSolved) : ''
              } ${sharedMatchGateActive ? styles.boardGridHidden : ''}`}
              role="grid"
              aria-label="Sudoku board"
            >
          {/* Defeat Overlay in Duel / AI Rival Battle */}
          {!sharedMatchGateActive && isDefeated && (
            <DefeatOverlay
              locale={locale}
              winnerName={defeatWinnerName}
              onRetry={onRetry}
              onShowDetails={onShowDetails}
            />
          )}

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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SwordIcon size={36} color="var(--text-muted, #71717c)" />
                  </div>
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
              <div className={styles.wipeInkHint}>
                {locale === 'ko' ? '🖐️ 손가락/마우스로 먹물을 문질러 닦아내세요!' : '🖐️ Swipe ink to wipe it off!'}
              </div>
              {inkSplats.map((splat) => {
                const isWiped = wipedSplats.has(splat.id);
                return (
                  <div
                    key={splat.id}
                    className={`${styles.inkSplat} ${isWiped ? styles.inkSplatWiped : ''}`}
                    style={{
                      top: splat.top,
                      left: splat.left,
                      width: splat.width,
                      height: splat.height,
                      transform: splat.transform,
                      clipPath: splat.clipPath,
                      opacity: isWiped ? 0 : splat.opacity,
                    }}
                    onPointerDown={() => handleWipeSplat(splat.id)}
                    onPointerEnter={(e) => {
                      if (e.buttons > 0) handleWipeSplat(splat.id);
                    }}
                    onTouchMove={() => handleWipeSplat(splat.id)}
                  />
                );
              })}
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

              const isHard = difficulty === 'hard';

              // In Hard mode, do NOT reveal where matching digits or duplicate conflicts are on the board
              const isMatchingDigit =
                !isHard &&
                selectedNumber !== null &&
                cell !== null &&
                cell === selectedNumber &&
                !isSelected;

              const isCheckWrong =
                difficulty === 'easy' && checks.some((item) => item.row === r && item.col === c);
              const isConflict = (!isHard && conflictCells.has(`${r}-${c}`)) || isCheckWrong;
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
                      triggerHaptic('selection');
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
                            !isHard && selectedNumber !== null && val === String(selectedNumber)
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
        </div>
      </div>
    </section>
  );
};
