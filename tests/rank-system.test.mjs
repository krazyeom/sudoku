import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RANK_PROFILE, calculateRpChange, getRankTierInfo } from '../lib/rankSystem.js';

test('rankSystem: getRankTierInfo correctly categorizes RP', () => {
  assert.equal(getRankTierInfo(50).tier, 'iron');
  assert.equal(getRankTierInfo(150).tier, 'bronze');
  assert.equal(getRankTierInfo(350).tier, 'silver');
  assert.equal(getRankTierInfo(700).tier, 'gold');
  assert.equal(getRankTierInfo(1200).tier, 'platinum');
  assert.equal(getRankTierInfo(1900).tier, 'diamond');
  assert.equal(getRankTierInfo(2500).tier, 'master');
});

test('rankSystem: calculateRpChange awards RP and tracks win streaks', () => {
  const initial = { ...DEFAULT_RANK_PROFILE };
  const res1 = calculateRpChange(initial, true, 'normal');

  assert.equal(res1.diff, 25);
  assert.equal(res1.nextProfile.rp, 175);
  assert.equal(res1.nextProfile.wins, 1);
  assert.equal(res1.nextProfile.winStreak, 1);

  // Win streak bonus check on second consecutive win
  const res2 = calculateRpChange(res1.nextProfile, true, 'normal');
  assert.equal(res2.diff, 25); // winStreak was 1 (< 2), no bonus yet

  const res3 = calculateRpChange(res2.nextProfile, true, 'normal');
  // winStreak was 2 (>= 2), +10 streak bonus
  assert.equal(res3.diff, 35);
  assert.equal(res3.nextProfile.winStreak, 3);
});

test('rankSystem: calculateRpChange handles losses and resets win streaks', () => {
  const profile = {
    rp: 400,
    tier: 'silver',
    wins: 5,
    losses: 1,
    winStreak: 3,
  };

  const lossRes = calculateRpChange(profile, false, 'normal');
  assert.equal(lossRes.diff, -15);
  assert.equal(lossRes.nextProfile.rp, 385);
  assert.equal(lossRes.nextProfile.winStreak, 0);
  assert.equal(lossRes.nextProfile.losses, 2);
});

test('rankSystem: handles demotion and promotion flags correctly', () => {
  const nearPromotion = {
    rp: 335,
    tier: 'bronze',
    wins: 4,
    losses: 1,
    winStreak: 1,
  };

  const promoRes = calculateRpChange(nearPromotion, true, 'normal');
  assert.equal(promoRes.promoted, true);
  assert.equal(promoRes.nextProfile.tier, 'silver');

  const nearDemotion = {
    rp: 355,
    tier: 'silver',
    wins: 4,
    losses: 1,
    winStreak: 0,
  };

  const demoRes = calculateRpChange(nearDemotion, false, 'normal');
  assert.equal(demoRes.demoted, true);
  assert.equal(demoRes.nextProfile.tier, 'bronze');
});
