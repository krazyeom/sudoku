import { type RankProfile, type RankTier, getRankTierInfo } from '../components/sudoku/types';

export const DEFAULT_RANK_PROFILE: RankProfile = {
  rp: 150, // Starting in Bronze
  tier: 'bronze',
  wins: 0,
  losses: 0,
  winStreak: 0,
};

export function calculateRpChange(
  current: RankProfile,
  won: boolean,
  battleMode: string = 'normal'
): { nextProfile: RankProfile; diff: number; promoted: boolean; demoted: boolean } {
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

    // Iron & early Bronze have demotion protection
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
