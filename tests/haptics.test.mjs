import { test } from 'node:test';
import assert from 'node:assert/strict';

test('haptics module safely executes without DOM navigator', async () => {
  const { triggerHaptic } = await import('../lib/haptics.ts');
  // In Node environment, window and navigator are undefined, triggerHaptic must no-op without throwing
  assert.doesNotThrow(() => {
    triggerHaptic('selection');
    triggerHaptic('input');
    triggerHaptic('erase');
    triggerHaptic('note');
    triggerHaptic('error');
    triggerHaptic('success');
    triggerHaptic('attack');
    triggerHaptic('victory');
  });
});
