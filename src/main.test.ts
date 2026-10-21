import { describe, it, expect } from 'vitest';
import { APP_NAME } from './main';

describe('app shell', () => {
  it('exports the app name', () => {
    expect(APP_NAME).toBe('Cloudia');
  });
});
