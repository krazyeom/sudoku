import test from 'node:test';
import assert from 'node:assert/strict';

import { THEME_LIST, getThemeConfig } from '../components/sudoku/theme.ts';

test('THEME_LIST contains seasonal, cosmos, nature, and cyberpunk themes', () => {
  const ids = THEME_LIST.map((t) => t.id);

  assert.ok(ids.includes('classic'), 'Missing classic theme');
  assert.ok(ids.includes('christmas'), 'Missing christmas theme');
  assert.ok(ids.includes('summer'), 'Missing summer theme');
  assert.ok(ids.includes('autumn'), 'Missing autumn theme');
  assert.ok(ids.includes('spring'), 'Missing spring theme');
  assert.ok(ids.includes('space'), 'Missing space theme');
  assert.ok(ids.includes('ocean'), 'Missing ocean theme');
  assert.ok(ids.includes('mountain'), 'Missing mountain theme');
  assert.ok(ids.includes('cyberpunk'), 'Missing cyberpunk theme');
  assert.ok(ids.includes('rainbow'), 'Missing rainbow secret theme');

  assert.equal(THEME_LIST.length >= 10, true);
});

test('getThemeConfig returns valid configuration and fallback', () => {
  const christmas = getThemeConfig('christmas');
  assert.equal(christmas.id, 'christmas');
  assert.equal(christmas.icon, '🎄');
  assert.ok(christmas.accentColor.length > 0);

  const space = getThemeConfig('space');
  assert.equal(space.id, 'space');
  assert.equal(space.icon, '🌌');

  const ocean = getThemeConfig('ocean');
  assert.equal(ocean.id, 'ocean');
  assert.equal(ocean.icon, '🌊');

  const mountain = getThemeConfig('mountain');
  assert.equal(mountain.id, 'mountain');
  assert.equal(mountain.icon, '🌲');

  // Fallback test
  // @ts-expect-error invalid id
  const fallback = getThemeConfig('invalid-theme-id');
  assert.equal(fallback.id, 'classic');
});
