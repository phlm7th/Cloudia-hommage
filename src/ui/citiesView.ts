import type { searchPlaces } from '../data/geocoding';
import type { Place } from '../data/types';
import { addPlace, movePlace, removePlace } from '../domain/places';
import { t, type Lang } from '../i18n';

export interface CitiesViewOptions {
  lang: Lang;
  current: Place;
  places: Place[];
  onSelect(p: Place): void;
  onChange(list: Place[]): void;
  onBack(): void;
  search: typeof searchPlaces;
}

const DEBOUNCE_MS = 300;

function button(cls: string, label: string, onClick: () => void, aria?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  if (aria) b.setAttribute('aria-label', aria);
  b.addEventListener('click', onClick);
  return b;
}

function pickButton(p: Place, onClick: () => void): HTMLButtonElement {
  const b = button('pick', p.name, onClick);
  if (p.country) {
    const small = document.createElement('small');
    small.textContent = p.country;
    b.append(small);
  }
  return b;
}

/** PRD F7: search, add, reorder and remove places; the current location is always first. */
export function renderCitiesView(opts: CitiesViewOptions): HTMLElement {
  const { lang, current, onSelect, onChange, onBack, search } = opts;
  let places = opts.places;

  const root = document.createElement('section');
  root.className = 'cities';

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = t(lang, 'cities.title');
  header.append(button('back', '‹', onBack, 'back'), title);

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = t(lang, 'cities.search');
  input.setAttribute('aria-label', t(lang, 'cities.search'));
  input.autocomplete = 'off';

  const results = document.createElement('ul');
  results.className = 'results';
  const saved = document.createElement('ul');
  saved.className = 'saved';

  const update = (next: Place[]) => {
    places = next;
    onChange(places);
    renderSaved();
  };

  const renderSaved = () => {
    const currentItem = document.createElement('li');
    currentItem.className = 'place current';
    currentItem.append(pickButton(current, () => onSelect(current)));
    saved.replaceChildren(
      currentItem,
      ...places.map((p) => {
        const li = document.createElement('li');
        li.className = 'place';
        li.append(
          pickButton(p, () => onSelect(p)),
          button('up', '↑', () => update(movePlace(places, p.id, -1)), 'move up'),
          button('down', '↓', () => update(movePlace(places, p.id, 1)), 'move down'),
          button('remove', '✕', () => update(removePlace(places, p.id)), 'remove'),
        );
        return li;
      }),
    );
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  let seq = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value;
    timer = setTimeout(async () => {
      const mine = ++seq;
      let found: Place[] = [];
      try {
        found = await search(query, lang);
      } catch {
        found = [];
      }
      if (mine !== seq) return;
      results.replaceChildren(
        ...found.map((p) => {
          const li = document.createElement('li');
          li.append(
            pickButton(p, () => {
              update(addPlace(places, p));
              input.value = '';
              results.replaceChildren();
            }),
          );
          return li;
        }),
      );
    }, DEBOUNCE_MS);
  });

  renderSaved();
  root.append(header, input, results, saved);
  return root;
}
