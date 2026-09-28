import React from 'react';
import styles from './sudoku.module.css';
import type { BattleSummary, Locale, SharedRoomState } from './types';
import type { SharedRoomCellOccupancy } from '@/lib/shared-room';

interface BattlePanelProps {
  sharedRoom: SharedRoomState | null;
  battleSummary: BattleSummary | null;
  minimapGrid: SharedRoomCellOccupancy[][];
  roomInput: string;
  locale: Locale;
  onRoomInputChange: (val: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onCopyRoomId: () => void;
  onCopyInviteLink: () => void;
  onDisconnectRoom: () => void;
}

export const BattlePanel: React.FC<BattlePanelProps> = ({
  sharedRoom,
  battleSummary,
  minimapGrid,
  roomInput,
  locale,
  onRoomInputChange,
  onCreateRoom,
  onJoinRoom,
  onCopyRoomId,
  onCopyInviteLink,
  onDisconnectRoom,
}) => {
  return (
    <div className={styles.battleContainer}>
      <div className={styles.battleHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>⚔️</span>
          <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>
            {locale === 'ko' ? '1v1 실시간 대결' : '1v1 Live Duel'}
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
