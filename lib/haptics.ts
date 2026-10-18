/**
 * Mobile Native Tactile Haptics Engine
 * Provides subtle, satisfying vibration feedback for touch devices (iOS/Android)
 * Gracefully no-ops on unsupported platforms or during user gesture restrictions.
 */

export type HapticType =
  | 'selection'    // Light tap when selecting a cell or tab
  | 'input'        // Crisp tap when entering a valid number
  | 'erase'        // Quick double tap when clearing a cell
  | 'note'         // Subtle tick when toggling notes
  | 'error'        // Buzz pattern when cell conflicts or input invalid
  | 'success'      // Joyful chime vibration for row/col/box completion
  | 'attack'       // Impactful double pulse when launching/receiving battle attack
  | 'victory';     // Grand multi-pulse celebration for puzzle solve

export function triggerHaptic(type: HapticType): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  // Check Navigator Vibration API support
  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') return;

  try {
    switch (type) {
      case 'selection':
        navigator.vibrate(8);
        break;
      case 'note':
        navigator.vibrate(12);
        break;
      case 'input':
        navigator.vibrate(18);
        break;
      case 'erase':
        navigator.vibrate([10, 30, 10]);
        break;
      case 'error':
        navigator.vibrate([35, 40, 35, 40, 50]);
        break;
      case 'success':
        navigator.vibrate([20, 40, 30, 40, 45]);
        break;
      case 'attack':
        navigator.vibrate([50, 60, 70]);
        break;
      case 'victory':
        navigator.vibrate([40, 50, 40, 50, 60, 60, 80]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // Ignore any browser vibration permission restrictions
  }
}
