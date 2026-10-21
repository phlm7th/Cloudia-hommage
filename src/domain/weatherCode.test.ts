import { describe, it, expect } from 'vitest';
import { conditionOf, skyStateOf, precipKindOf } from './weatherCode';

describe('WMO code mapping', () => {
  it.each([
    [0, 'clear', 'clear'],
    [1, 'clear', 'clear'],
    [2, 'partlyCloudy', 'cloud'],
    [3, 'cloudy', 'cloud'],
    [45, 'fog', 'cloud'],
    [53, 'drizzle', 'precip'],
    [63, 'rain', 'precip'],
    [81, 'rain', 'precip'],
    [73, 'snow', 'precip'],
    [86, 'snow', 'precip'],
    [95, 'thunder', 'precip'],
  ] as const)('code %i → %s / %s', (code, condition, sky) => {
    expect(conditionOf(code)).toBe(condition);
    expect(skyStateOf(code)).toBe(sky);
  });

  it('returns null for missing codes', () => {
    expect(conditionOf(null)).toBeNull();
    expect(skyStateOf(null)).toBeNull();
  });

  it('maps precipitation kind', () => {
    expect(precipKindOf(95)).toBe('rain');
    expect(precipKindOf(55)).toBe('rain');
    expect(precipKindOf(75)).toBe('snow');
    expect(precipKindOf(3)).toBe('none');
    expect(precipKindOf(null)).toBe('none');
  });
});
