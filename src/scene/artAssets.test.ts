import { describe, it, expect, vi } from 'vitest';
import { artUrl, ART_PATHS, layerRect, loadArt, pickCloudSprite, type Sprite } from './artAssets';

const sprite = (width: number, height: number): Sprite => ({ img: {} as CanvasImageSource, width, height });

describe('artUrl', () => {
  it('resolves under the app base path (GitHub Pages sub-path)', () => {
    expect(artUrl('landscape/far.png', '/cloudia/')).toBe('/cloudia/art/watercolor/landscape/far.png');
    expect(artUrl('paper.png', '/')).toBe('/art/watercolor/paper.png');
  });
});

describe('ART_PATHS', () => {
  it('lists the files documented in the README', () => {
    expect(ART_PATHS).toEqual({
      landscape: ['landscape/far.png', 'landscape/mid.png', 'landscape/near.png'],
      clouds: ['clouds/cloud-1.png', 'clouds/cloud-2.png', 'clouds/cloud-3.png', 'clouds/cloud-4.png'],
      storms: ['clouds/storm-1.png', 'clouds/storm-2.png'],
      sun: 'celestial/sun.png',
      moon: 'celestial/moon.png',
      paper: 'paper.png',
    });
  });
});

describe('loadArt', () => {
  it('keeps the files that load and drops missing ones', async () => {
    const present = new Set(['/art/watercolor/landscape/near.png', '/art/watercolor/clouds/cloud-2.png', '/art/watercolor/celestial/sun.png']);
    const load = vi.fn(async (url: string) => (present.has(url) ? sprite(1080, 900) : null));
    const art = await loadArt('/', load);
    expect(load).toHaveBeenCalledTimes(12);
    expect(art.landscape).toHaveLength(1);
    expect(art.clouds).toHaveLength(1);
    expect(art.storms).toHaveLength(0);
    expect(art.sun).not.toBeNull();
    expect(art.moon).toBeNull();
    expect(art.paper).toBeNull();
  });

  it('keeps landscape layers in back-to-front order', async () => {
    const load = async (url: string) => sprite(url.includes('far') ? 1 : url.includes('mid') ? 2 : 3, 1);
    const art = await loadArt('/', load);
    expect(art.landscape.map((s) => s.width)).toEqual([1, 2, 3]);
  });
});

describe('layerRect', () => {
  it('fits the layer to the canvas width and anchors it to the bottom', () => {
    expect(layerRect(sprite(1080, 900), 360, 780)).toEqual({ x: 0, y: 480, w: 360, h: 300 });
  });
});

describe('pickCloudSprite', () => {
  const art = { clouds: [sprite(1, 1), sprite(2, 1)], storms: [sprite(9, 1)] };

  it('cycles through fair-weather clouds', () => {
    expect(pickCloudSprite(art, 0, false)?.width).toBe(1);
    expect(pickCloudSprite(art, 3, false)?.width).toBe(2);
  });

  it('uses storm clouds when it rains, falling back to fair clouds', () => {
    expect(pickCloudSprite(art, 1, true)?.width).toBe(9);
    expect(pickCloudSprite({ clouds: art.clouds, storms: [] }, 1, true)?.width).toBe(2);
  });

  it('returns null when there are no cloud images', () => {
    expect(pickCloudSprite({ clouds: [], storms: [] }, 0, false)).toBeNull();
  });
});
