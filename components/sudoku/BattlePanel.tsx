import React from 'react';
import styles from './sudoku.module.css';
import type { BattleMode, BattleSummary, GameMode, Locale, SharedRoomState } from './types';
import type { SharedRoomCellOccupancy } from '@/lib/shared-room';

interface BattlePanelProps {
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  sharedRoom: SharedRoomState | null;
  battleSummary: BattleSummary | null;
  playerProgress?: number;
  aiProgress?: number;
  minimapGrid: SharedRoomCellOccupancy[][];
  roomInput: string;
  battleMode: BattleMode;
  locale: Locale;
  isOnline?: boolean;
  onRoomInputChange: (val: string) => void;
  onBattleModeChange: (mode: BattleMode) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onCopyRoomId: () => void;
  onCopyInviteLink: () => void;
  onDisconnectRoom: () => void;
  onRestartAiBattle?: () => void;
  onNewGame?: () => void;
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
    descKo: '빙결(입력 잠금 1.6s) • 키패드 대혼란(4s) • 짙은 먹물 테러(3.5s) • 글리치 지진 (힌트 1개, 오토필 0개)',
    descEn: 'Freeze (Input lock) • Keypad Chaos • Heavy Ink • Glitch Quake (1 Hint, 0 Auto-fill)',
  },
  {
    id: 'normal',
    labelKo: '중',
    labelEn: 'Normal',
    badge: 'NORMAL',
    descKo: '키패드 셔플(2.5s) • 잉크 블러(2.5s) • 보드 지진(2s) (힌트 2개, 오토필 1개)',
    descEn: 'Keypad Shuffle • Ink Blur • Board Quake (2 Hints, 1 Auto-fill)',
  },
  {
    id: 'easy',
    labelKo: '하',
    labelEn: 'Easy',
    badge: 'EASY',
    descKo: '안개 스모크(1.8s) • 미세 진동(1.4s) (힌트 3개, 오토필 2개)',
    descEn: 'Smoke Mist • Mild Vibration (3 Hints, 2 Auto-fills)',
  },
  {
    id: 'off',
    labelKo: '끄기',
    labelEn: 'Off',
    badge: 'OFF',
    descKo: '방해 기믹 없는 순수 퍼즐 스피드런 대결 (힌트 3개, 오토필 1개)',
    descEn: 'Pure Classic Sudoku Speedrun Duel (3 Hints, 1 Auto-fill)',
  },
];

export const BattlePanel: React.FC<BattlePanelProps> = ({
  gameMode,
  onGameModeChange,
  sharedRoom,
  battleSummary,
  playerProgress = 0,
  aiProgress = 0,
  minimapGrid,
  roomInput,
  battleMode,
  locale,
  isOnline = true,
  onRoomInputChange,
  onBattleModeChange,
  onCreateRoom,
  onJoinRoom,
  onCopyRoomId,
  onCopyInviteLink,
  onDisconnectRoom,
  onRestartAiBattle,
  onNewGame,
}) => {
  const currentModeInfo = BATTLE_MODES.find((m) => m.id === battleMode) ?? BATTLE_MODES[1];
  const canChangeMode = !sharedRoom || sharedRoom.role === 'host';

  return (
    <div className={styles.battleContainer}>
      {/* Game Mode Selector Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#f8fafc', fontSize: '0.88rem', letterSpacing: '-0.01em' }}>
            {locale === 'ko' ? '🕹️ 게임 모드 선택' : '🕹️ Select Game Mode'}
          </strong>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            {gameMode === 'solo'
              ? locale === 'ko' ? '싱글' : 'Solo'
              : gameMode === 'vs_ai'
                ? locale === 'ko' ? 'AI 대결' : 'vs AI'
                : locale === 'ko' ? '온라인 1v1' : 'Online'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          <button
            type="button"
            className={`${styles.modeBtn} ${gameMode === 'solo' ? styles.modeBtnActive : ''}`}
            onClick={() => onGameModeChange('solo')}
          >
            <span>🎮 {locale === 'ko' ? '싱글' : 'Solo'}</span>
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${gameMode === 'vs_ai' ? styles.modeBtnActive : ''}`}
            onClick={() => onGameModeChange('vs_ai')}
          >
            <span>🤖 {locale === 'ko' ? 'vs AI' : 'vs AI'}</span>
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${gameMode === 'online' ? styles.modeBtnActive : ''}`}
            onClick={() => onGameModeChange('online')}
          >
            <span>⚔️ {locale === 'ko' ? '1v1 배틀' : '1v1 Battle'}</span>
          </button>
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

      {/* Solo Mode View */}
      {gameMode === 'solo' && (
        <div
          style={{
            padding: '14px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#cbd5e1',
            minHeight: '74px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
            🧘 {locale === 'ko' ? '온리 싱글 퍼즐 모드' : 'Classic Solo Mode'}
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.4 }}>
            {locale === 'ko'
              ? '방해 기믹 없이 차분하게 두뇌 트레이닝과 기록 단축에 집중하는 모드입니다.'
              : 'Focus on pure Sudoku puzzle solving and speedrunning without attacks.'}
          </p>

          <div
            style={{
              marginTop: '10px',
              padding: '6px 10px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
            }}
          >
            <span style={{ color: '#94a3b8' }}>{locale === 'ko' ? '기믹 공격' : 'Attacks'}</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>
              {locale === 'ko' ? '비활성화 (평화 모드)' : 'Disabled (Peaceful)'}
            </span>
          </div>

          {onNewGame && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onNewGame}
              style={{ marginTop: '10px', width: '100%', padding: '9px 12px' }}
            >
              <span>🎲 {locale === 'ko' ? '새 싱글 퍼즐 시작' : 'Start New Solo Puzzle'}</span>
            </button>
          )}
        </div>
      )}

      {/* VS Computer AI Mode View */}
      {gameMode === 'vs_ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Battle Mode Level Selector */}
          <div className={styles.battleModeSection}>
            <div className={styles.battleModeHeader}>
              <span className={styles.battleModeTitle}>
                {locale === 'ko' ? 'AI 배틀 난이도' : 'AI Battle Difficulty'}
              </span>
              <span className={styles.battleModeBadge}>{currentModeInfo.badge}</span>
            </div>

            <div className={styles.battleModeSegment}>
              {BATTLE_MODES.map((mode) => {
                const isSelected = battleMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`${styles.modeBtn} ${isSelected ? styles.modeBtnActive : ''}`}
                    onClick={() => onBattleModeChange(mode.id)}
                    title={locale === 'ko' ? mode.descKo : mode.descEn}
                  >
                    <span>{locale === 'ko' ? mode.labelKo : mode.labelEn}</span>
                  </button>
                );
              })}
            </div>
            <div className={styles.battleModeDesc}>
              {locale === 'ko' ? currentModeInfo.descKo : currentModeInfo.descEn}
            </div>
          </div>

          {/* AI Rival Duel Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className={styles.battleDuelPills}>
              <span className={styles.playerPillSelf}>
                {locale === 'ko' ? '나' : 'You'}: {playerProgress}%
              </span>
              <span style={{ color: '#64748b', fontWeight: 700 }}>VS</span>
              <span className={styles.playerPillOther}>
                🤖 {locale === 'ko' ? '알파도쿠 AI' : 'Alphadoku AI'}: {aiProgress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className={styles.battleProgressBar}>
              <div
                className={styles.barSelf}
                style={{ width: `${Math.min(50, playerProgress / 2)}%` }}
              />
              <div
                className={styles.barOther}
                style={{ width: `${Math.min(50, aiProgress / 2)}%` }}
              />
            </div>

            {/* 9x9 Minimap */}
            <div className={styles.minimapGrid} aria-label="AI Battle Minimap">
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

            {onRestartAiBattle && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onRestartAiBattle}
                style={{ marginTop: '4px' }}
              >
                <span>🔄 {locale === 'ko' ? 'AI 대결 재시작' : 'Restart AI Match'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Online 1v1 Battle View */}
      {gameMode === 'online' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className={styles.battleHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🌐</span>
              <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>
                {locale === 'ko' ? '온라인 1v1 대결' : 'Online 1v1 Duel'}
              </strong>
            </div>
            {sharedRoom && (
              <span className={styles.badge}>
                {sharedRoom.role === 'host'
                  ? locale === 'ko' ? '방장' : 'Host'
                  : sharedRoom.role === 'guest'
                    ? locale === 'ko' ? '참가자' : 'Challenger'
                    : locale === 'ko' ? '관전자' : 'Spectator'}
              </span>
            )}
          </div>

          {/* Battle Mode Level Selector (상 / 중 / 하 / 끄기) */}
          <div className={styles.battleModeSection}>
            <div className={styles.battleModeHeader}>
              <span className={styles.battleModeTitle}>
                {locale === 'ko' ? '배틀 모드 강도' : 'Battle Mode Level'}
              </span>
              <span className={styles.battleModeBadge}>{currentModeInfo.badge}</span>
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
              {locale === 'ko' ? currentModeInfo.descKo : currentModeInfo.descEn}
            </div>
          </div>

          {sharedRoom ? (
            /* Active Room Details */
            <>
              <div className={styles.battleControls}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <span className={styles.badge} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    #{sharedRoom.roomId}
                  </span>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={onCopyRoomId}
                    title={locale === 'ko' ? '방 ID 복사' : 'Copy Room ID'}
                  >
                    📋
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
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
          ) : !isOnline ? (
            /* Offline Notice in Battle Panel */
            <div
              style={{
                padding: '14px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.82rem',
                color: '#fbbf24',
                lineHeight: 1.45,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <span>✈️</span>
                <span>{locale === 'ko' ? '오프라인(비행기) 모드 실행 중' : 'Offline (Airplane) Mode Active'}</span>
              </div>
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.78rem' }}>
                {locale === 'ko'
                  ? '현재 네트워크에 연결되어 있지 않습니다. 1v1 온라인 대결을 제외한 온리 싱글 모드 및 vs 컴퓨터 AI 모드는 오프라인에서도 완전하게 동작합니다.'
                  : 'You are currently offline. Solo and vs AI modes work 100% without internet.'}
              </p>
            </div>
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
      )}
    </div>
  );
};
