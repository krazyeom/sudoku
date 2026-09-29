import React from 'react';
import styles from './sudoku.module.css';
import type { BattleMode, BattleSummary, Locale, SharedRoomState } from './types';
import type { SharedRoomCellOccupancy } from '@/lib/shared-room';

interface BattlePanelProps {
  sharedRoom: SharedRoomState | null;
  battleSummary: BattleSummary | null;
  minimapGrid: SharedRoomCellOccupancy[][];
  roomInput: string;
  battleMode: BattleMode;
  locale: Locale;
  onRoomInputChange: (val: string) => void;
  onBattleModeChange: (mode: BattleMode) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onCopyRoomId: () => void;
  onCopyInviteLink: () => void;
  onDisconnectRoom: () => void;
}

const BATTLE_MODES: {
  id: BattleMode;
  labelKo: string;
  labelEn: string;
  badge: string;
  descKo: string;
  descEn: string;
}[] = [
  {
    id: 'hard',
    labelKo: '상',
    labelEn: 'Hard',
    badge: 'HARD',
    descKo: '빙결(입력 잠금 1.6s) • 키패드 대혼란(4s) • 짙은 먹물 테러(3.5s) • 글리치 지진',
    descEn: 'Freeze (Input lock) • Keypad Chaos • Heavy Ink • Glitch Quake',
  },
  {
    id: 'normal',
    labelKo: '중',
    labelEn: 'Normal',
    badge: 'NORMAL',
    descKo: '키패드 셔플(2.5s) • 잉크 블러(2.5s) • 보드 지진(2s)',
    descEn: 'Keypad Shuffle • Ink Blur • Board Quake',
  },
  {
    id: 'easy',
    labelKo: '하',
    labelEn: 'Easy',
    badge: 'EASY',
    descKo: '안개 스모크(1.8s) • 미세 진동(1.4s) (입력/키패드 방해 없음)',
    descEn: 'Smoke Mist • Mild Vibration (No input lock)',
  },
  {
    id: 'off',
    labelKo: '끄기',
    labelEn: 'Off',
    badge: 'OFF',
    descKo: '방해 기믹 없는 순수 퍼즐 스피드런 대결',
    descEn: 'Pure Classic Sudoku Speedrun Duel',
  },
];

export const BattlePanel: React.FC<BattlePanelProps> = ({
  sharedRoom,
  battleSummary,
  minimapGrid,
  roomInput,
  battleMode,
  locale,
  onRoomInputChange,
  onBattleModeChange,
  onCreateRoom,
  onJoinRoom,
  onCopyRoomId,
  onCopyInviteLink,
  onDisconnectRoom,
}) => {
  const currentModeInfo = BATTLE_MODES.find((m) => m.id === battleMode) ?? BATTLE_MODES[1];
  const canChangeMode = !sharedRoom || sharedRoom.role === 'host';

  return (
    <div className={styles.battleContainer}>
      <div className={styles.battleHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>⚔️</span>
          <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>
            {locale === 'ko' ? '1v1 실시간 배틀' : '1v1 Live Battle'}
          </strong>
        </div>
        {sharedRoom && (
          <span className={styles.badge}>
            {sharedRoom.role === 'host'
              ? locale === 'ko'
                ? '방장'
                : 'Host'
              : sharedRoom.role === 'guest'
                ? locale === 'ko'
                  ? '참가자'
                  : 'Challenger'
                : locale === 'ko'
                  ? '관전자'
                  : 'Spectator'}
          </span>
        )}
      </div>

      {/* Battle Mode Level Selector (상 / 중 / 하 / 끄기) */}
      <div className={styles.battleModeSection}>
        <div className={styles.battleModeHeader}>
          <span className={styles.battleModeTitle}>
            {locale === 'ko' ? '배틀 모드 강도' : 'Battle Mode Level'}
          </span>
          <span className={styles.battleModeBadge}>
            {currentModeInfo.badge}
          </span>
        </div>

        <div className={styles.battleModeSegment}>
          {BATTLE_MODES.map((mode) => {
            const isSelected = battleMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                className={`${styles.modeBtn} ${isSelected ? styles.modeBtnActive : ''}`}
                onClick={() => {
                  if (canChangeMode) {
                    onBattleModeChange(mode.id);
                  }
                }}
                disabled={!canChangeMode}
                title={locale === 'ko' ? mode.descKo : mode.descEn}
              >
                <span>{locale === 'ko' ? mode.labelKo : mode.labelEn}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.battleModeDesc}>
          <span className={styles.battleModeDescIcon}>⚡</span>
          <span>{locale === 'ko' ? currentModeInfo.descKo : currentModeInfo.descEn}</span>
        </div>
      </div>

      {sharedRoom ? (
        <>
          {/* Active Room Info & Sharing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ flex: 1 }}
                onClick={onCopyRoomId}
              >
                <span>📋 {sharedRoom.roomId}</span>
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onCopyInviteLink}
                title={locale === 'ko' ? '초대 링크 복사' : 'Copy Invite Link'}
              >
                🔗
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' }}
                onClick={onDisconnectRoom}
                title={locale === 'ko' ? '방 나가기' : 'Leave Room'}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Duel Progress & Minimap */}
          {battleSummary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className={styles.battleDuelPills}>
                <span className={styles.playerPillSelf}>
                  {locale === 'ko' ? '나' : 'You'}: {battleSummary.selfProgress}%
                </span>
                <span style={{ color: '#64748b' }}>VS</span>
                <span className={styles.playerPillOther}>
                  {locale === 'ko' ? '상대' : 'Rival'}: {battleSummary.otherProgress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className={styles.battleProgressBar}>
                <div
                  className={styles.barSelf}
                  style={{ width: `${battleSummary.selfProgress / 2}%` }}
                />
                <div
                  className={styles.barOther}
                  style={{ width: `${battleSummary.otherProgress / 2}%` }}
                />
              </div>

              {/* 9x9 Minimap */}
              <div className={styles.minimapGrid} aria-label="Battle Minimap">
                {minimapGrid.flatMap((row, r) =>
                  row.map((cell, c) => {
                    const cellClass =
                      cell === 'clue'
                        ? styles.miniCellClue
                        : cell === 'self'
                          ? styles.miniCellSelf
                          : cell === 'other'
                            ? styles.miniCellOther
                            : cell === 'both'
                              ? styles.miniCellBoth
                              : styles.miniCellEmpty;

                    return <span key={`${r}-${c}`} className={`${styles.miniCell} ${cellClass}`} />;
                  })
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Create or Join Room UI */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={onCreateRoom}
          >
            <span>⚔️ {locale === 'ko' ? '대결 방 만들기' : 'Create 1v1 Room'}</span>
          </button>

          <div className={styles.battleRoomInputRow}>
            <input
              type="text"
              className={styles.roomInput}
              placeholder={locale === 'ko' ? '방 ID 또는 링크 입력' : 'Enter Room ID / Link'}
              value={roomInput}
              onChange={(e) => onRoomInputChange(e.target.value)}
            />
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onJoinRoom}
              disabled={!roomInput.trim()}
            >
              <span>{locale === 'ko' ? '참가' : 'Join'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

