import test from 'node:test';
import assert from 'node:assert/strict';

function checkDefeatStatus({
  gameMode,
  solved,
  viewerId,
  sharedRoom,
  sharedCompletionSummary,
}) {
  const isAiDefeat =
    gameMode === 'vs_ai' &&
    sharedCompletionSummary?.completedBy === 'ai-rival-alphadoku';
  const isSharedDefeat = Boolean(
    sharedRoom &&
      sharedCompletionSummary &&
      sharedCompletionSummary.completedBy !== (sharedRoom.participantId ?? viewerId)
  );
  const isDefeated = Boolean(solved && (isAiDefeat || isSharedDefeat));

  return { isAiDefeat, isSharedDefeat, isDefeated };
}

function getDefeatWinnerName(isAiDefeat, sharedCompletionSummary, locale = 'ko') {
  if (isAiDefeat) return locale === 'ko' ? '알파도쿠 AI' : 'Alphadoku AI';
  if (sharedCompletionSummary) {
    const role = sharedCompletionSummary.completedByRole;
    if (role === 'host') return locale === 'ko' ? '방장' : 'Host';
    if (role === 'guest') return locale === 'ko' ? '도전자' : 'Guest';
    return locale === 'ko' ? '상대방' : 'Opponent';
  }
  return locale === 'ko' ? '상대방' : 'Opponent';
}

test('Defeat Detection: AI rival match defeat correctly identified', () => {
  const result = checkDefeatStatus({
    gameMode: 'vs_ai',
    solved: true,
    viewerId: 'player-1',
    sharedRoom: null,
    sharedCompletionSummary: {
      completedBy: 'ai-rival-alphadoku',
      completedByRole: 'guest',
    },
  });

  assert.equal(result.isAiDefeat, true);
  assert.equal(result.isDefeated, true);

  const nameKo = getDefeatWinnerName(result.isAiDefeat, { completedByRole: 'guest' }, 'ko');
  const nameEn = getDefeatWinnerName(result.isAiDefeat, { completedByRole: 'guest' }, 'en');
  assert.equal(nameKo, '알파도쿠 AI');
  assert.equal(nameEn, 'Alphadoku AI');
});

test('Defeat Detection: AI rival player victory does not trigger defeat', () => {
  const result = checkDefeatStatus({
    gameMode: 'vs_ai',
    solved: true,
    viewerId: 'player-1',
    sharedRoom: null,
    sharedCompletionSummary: {
      completedBy: 'player-1',
      completedByRole: 'host',
    },
  });

  assert.equal(result.isAiDefeat, false);
  assert.equal(result.isDefeated, false);
});

test('Defeat Detection: 1v1 PvP duel defeat correctly identified', () => {
  const result = checkDefeatStatus({
    gameMode: 'battle',
    solved: true,
    viewerId: 'guest-user-123',
    sharedRoom: {
      roomId: 'room-abc',
      participantId: 'guest-user-123',
    },
    sharedCompletionSummary: {
      completedBy: 'host-user-999',
      completedByRole: 'host',
    },
  });

  assert.equal(result.isSharedDefeat, true);
  assert.equal(result.isDefeated, true);

  const nameKo = getDefeatWinnerName(result.isAiDefeat, { completedByRole: 'host' }, 'ko');
  const nameEn = getDefeatWinnerName(result.isAiDefeat, { completedByRole: 'host' }, 'en');
  assert.equal(nameKo, '방장');
  assert.equal(nameEn, 'Host');
});

test('Defeat Detection: Solo mode victory does not trigger defeat', () => {
  const result = checkDefeatStatus({
    gameMode: 'solo',
    solved: true,
    viewerId: 'solo-player',
    sharedRoom: null,
    sharedCompletionSummary: null,
  });

  assert.equal(result.isDefeated, false);
});
