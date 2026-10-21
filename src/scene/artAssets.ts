/**
 * Painted artwork for the scene, read from public/art/watercolor/ (see the README there).
 * Every file is optional: a missing one leaves the procedural drawing in place.
 */

export interface Sprite {
  img: CanvasImageSource;
  width: number;
  height: number;
}

export interface ArtSet {
  /** back to front: far, mid, near (only the ones that exist) */
  landscape: Sprite[];
  clouds: Sprite[];
  storms: Sprite[];
  sun: Sprite | null;
  moon: Sprite | null;
  paper: Sprite | null;
}

export const EMPTY_ART: ArtSet = { landscape: [], clouds: [], storms: [], sun: null, moon: null, paper: null };

export const ART_PATHS = {
  landscape: ['landscape/far.png', 'landscape/mid.png', 'landscape/near.png'],
  clouds: ['clouds/cloud-1.png', 'clouds/cloud-2.png', 'clouds/cloud-3.png', 'clouds/cloud-4.png'],
  storms: ['clouds/storm-1.png', 'clouds/storm-2.png'],
  sun: 'celestial/sun.png',
  moon: 'celestial/moon.png',
  paper: 'paper.png',
};

export function artUrl(path: string, base: string): string {
  return `${base}art/watercolor/${path}`;
}

export function loadImage(url: string): Promise<Sprite | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve({ img, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

type Loader = (url: string) => Promise<Sprite | null>;

export async function loadArt(base: string, load: Loader = loadImage): Promise<ArtSet> {
  const one = (path: string) => load(artUrl(path, base)).catch(() => null);
  const many = async (paths: string[]) =>
    (await Promise.all(paths.map(one))).filter((s): s is Sprite => s !== null);
  const [landscape, clouds, storms, sun, moon, paper] = await Promise.all([
    many(ART_PATHS.landscape),
    many(ART_PATHS.clouds),
    many(ART_PATHS.storms),
    one(ART_PATHS.sun),
    one(ART_PATHS.moon),
    one(ART_PATHS.paper),
  ]);
  return { landscape, clouds, storms, sun, moon, paper };
}

/** Scale a landscape layer to the canvas width and sit it on the bottom edge. */
export function layerRect(s: Pick<Sprite, 'width' | 'height'>, w: number, h: number) {
  const scale = w / s.width;
  const lh = s.height * scale;
  return { x: 0, y: h - lh, w, h: lh };
}

export function pickCloudSprite(
  art: Pick<ArtSet, 'clouds' | 'storms'>,
  index: number,
  stormy: boolean,
): Sprite | null {
  const pool = stormy && art.storms.length ? art.storms : art.clouds;
  return pool.length ? pool[index % pool.length] : null;
}
