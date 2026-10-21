import { describe, it, expect } from 'vitest';
import { detectLang, t } from './i18n';

describe('i18n', () => {
  it('detects Korean and falls back to English', () => {
    expect(detectLang('ko-KR')).toBe('ko');
    expect(detectLang('ko')).toBe('ko');
    expect(detectLang('en-US')).toBe('en');
    expect(detectLang('ja-JP')).toBe('en');
  });

  it('fills template variables', () => {
    expect(t('ko', 'cmp.warmer', { d: 3 })).toBe('어제보다 3° 따뜻해요');
    expect(t('en', 'cmp.cooler', { d: 5 })).toBe('5° cooler than yesterday.');
    expect(t('ko', 'label.myLocation')).toBe('내 위치');
  });

  it('returns plain strings', () => {
    expect(t('ko', 'cond.partlyCloudy')).toBe('구름 조금');
    expect(t('en', 'label.yday')).toBe("Y'day");
  });
});
