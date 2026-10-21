import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Place } from '../data/types';
import { renderCitiesView } from './citiesView';

const here: Place = { id: 'current', name: '현재 위치', lat: 37.5, lon: 127, isCurrent: true };
const tokyo: Place = { id: 'geo-1', name: '도쿄', lat: 35.7, lon: 139.7, country: '일본' };
const paris: Place = { id: 'geo-2', name: '파리', lat: 48.9, lon: 2.35, country: '프랑스' };

afterEach(() => vi.useRealTimers());

const view = (over: Partial<Parameters<typeof renderCitiesView>[0]> = {}) => {
  const opts = {
    lang: 'ko' as const,
    current: here,
    places: [tokyo, paris],
    onSelect: vi.fn(),
    onChange: vi.fn(),
    onBack: vi.fn(),
    search: vi.fn(async () => [tokyo]),
    ...over,
  };
  return { el: renderCitiesView(opts), opts };
};

describe('renderCitiesView', () => {
  it('lists the current location first, then saved places', () => {
    const { el } = view();
    expect([...el.querySelectorAll('.saved .pick')].map((b) => b.textContent)).toEqual(['현재 위치', '도쿄일본', '파리프랑스']);
    expect(el.querySelector('.saved .current .remove')).toBeNull();
  });

  it('selects a place', () => {
    const { el, opts } = view();
    el.querySelectorAll<HTMLButtonElement>('.saved .pick')[1].click();
    expect(opts.onSelect).toHaveBeenCalledWith(tokyo);
  });

  it('moves and removes saved places', () => {
    const { el, opts } = view();
    el.querySelectorAll<HTMLButtonElement>('.saved .up')[1].click();
    expect(opts.onChange).toHaveBeenLastCalledWith([paris, tokyo]);
    el.querySelectorAll<HTMLButtonElement>('.saved .remove')[0].click(); // first row is now Paris
    expect(opts.onChange).toHaveBeenLastCalledWith([tokyo]);
  });

  it('searches after a 300ms pause and adds the picked result', async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => [{ id: 'geo-9', name: '뉴욕', lat: 40.7, lon: -74, country: '미국' }]);
    const { el, opts } = view({ search, places: [] });
    const input = el.querySelector<HTMLInputElement>('input')!;
    input.value = '뉴욕';
    input.dispatchEvent(new Event('input'));
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(search).toHaveBeenCalledWith('뉴욕', 'ko');
    el.querySelector<HTMLButtonElement>('.results button')!.click();
    expect(opts.onChange).toHaveBeenLastCalledWith([{ id: 'geo-9', name: '뉴욕', lat: 40.7, lon: -74, country: '미국' }]);
  });

  it('goes back', () => {
    const { el, opts } = view();
    el.querySelector<HTMLButtonElement>('.back')!.click();
    expect(opts.onBack).toHaveBeenCalled();
  });
});
