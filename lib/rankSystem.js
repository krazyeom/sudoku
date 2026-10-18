export const DEFAULT_RANK_PROFILE = {
  rp: 150, // Starting in Bronze
  tier: 'bronze',
  wins: 0,
  losses: 0,
  winStreak: 0,
};

export function getRankTierInfo(rp) {
  if (rp >= 2400) {
    return {
      tier: 'master',
      nameKo: '마스터',
      nameEn: 'Master',
      color: '#a855f7',
      badge: '👑',
      minRp: 2400,
      maxRp: 9999,
      nextTier: null,
    };
  }
  if (rp >= 1800) {
    return {
      tier: 'diamond',
      nameKo: '다이아몬드',
      nameEn: 'Diamond',
      color: '#3b82f6',
      badge: '💎',
      minRp: 1800,
      maxRp: 2399,
      nextTier: '마스터 (2,400 RP)',
    };
  }
  if (rp >= 1100) {
    return {
      tier: 'platinum',
      nameKo: '플래티넘',
      nameEn: 'Platinum',
      color: '#06b6d4',
      badge: '💠',
      minRp: 1100,
      maxRp: 1499,
      nextTier: '다이아몬드 (1,500 RP)',
    };
  }
  if (rp >= 700) {
    return {
      tier: 'gold',
      nameKo: '골드',
      nameEn: 'Gold',
      color: '#eab308',
      badge: '🥇',
      minRp: 700,
      maxRp: 1099,
      nextTier: '플래티넘 (1,100 RP)',
    };
  }
  if (rp >= 350) {
    return {
      tier: 'silver',
      nameKo: '실버',
      nameEn: 'Silver',
      color: '#94a3b8',
      badge: '🥈',
      minRp: 350,
      maxRp: 699,
      nextTier: '골드 (700 RP)',
    };
  }
  if (rp >= 100) {
    return {
      tier: 'bronze',
      nameKo: '브론즈',
      nameEn: 'Bronze',
      color: '#d97706',
      badge: '🥉',
      minRp: 100,
      maxRp: 349,
      nextTier: '실버 (350 RP)',
    };
  }
  return {
    tier: 'iron',
    nameKo: '아이언',
    nameEn: 'Iron',
    color: '#64748b',
    badge: '🛡️',
    minRp: 0,
    maxRp: 99,
    nextTier: '브론즈 (100 RP)',
  };
}

export function calculateRpChange(current, won, battleMode = 'normal') {
  const oldTier = current.tier;
  let diff = 0;

  if (won) {
    let baseGain = 25;
    if (battleMode === 'hard') baseGain = 35;
    else if (battleMode === 'easy') baseGain = 20;

    // Win streak bonus
    const streakBonus = current.winStreak >= 2 ? Math.min(15, current.winStreak * 5) : 0;
    diff = baseGain + streakBonus;

    const newRp = current.rp + diff;
    const newTierInfo = getRankTierInfo(newRp);
    const promoted = newTierInfo.tier !== oldTier && newRp > current.rp;

    return {
      nextProfile: {
        rp: newRp,
        tier: newTierInfo.tier,
        wins: current.wins + 1,
        losses: current.losses,
        winStreak: current.winStreak + 1,
      },
      diff,
      promoted,
      demoted: false,
    };
  } else {
    // Loss penalty
    let baseLoss = 15;
    if (battleMode === 'easy') baseLoss = 10;
    else if (battleMode === 'hard') baseLoss = 18;

    // Demotion protection
    if (current.rp < 100) baseLoss = 5;

    diff = -baseLoss;
    const newRp = Math.max(0, current.rp - baseLoss);
    const newTierInfo = getRankTierInfo(newRp);
    const demoted = newTierInfo.tier !== oldTier && newRp < current.rp;

    return {
      nextProfile: {
        rp: newRp,
        tier: newTierInfo.tier,
        wins: current.wins,
        losses: current.losses + 1,
        winStreak: 0,
      },
      diff,
      promoted: false,
      demoted,
    };
  }
}
