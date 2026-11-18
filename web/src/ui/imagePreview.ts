import { RomData } from '../data/romData';
import { getUnitSpriteState } from '../data/controllers/sprites';
import { renderFace, renderTopSprite, renderUnitSprite, renderIndexedTexture, type PixelImage } from '../data/render/jobImages';
import { fieldLabel, gameName, t } from './i18n';
import { el, numberInput } from './widgets';
import { fieldMeta } from './schema';
import { Flags } from '../data/model/flags';

type RecordData = Record<string, unknown>;

interface PreviewSource {
  label: string;
  id: number;
  frames: number;
  palettes?: number;
  empty?: string;
  draw(frame: number, palette: number): PixelImage | null;
}

function faceSource(data: RomData, id: number, label: string): PreviewSource {
  // Job portraits use the loaded list index, including its blank first entry.
  const face = data.unitFaces[id];
  return { label, id, frames: 1, draw: () => face ? renderFace(face) : null };
}
function topSource(data: RomData, id: number, label: string): PreviewSource {
  const sprite = data.topSprites[id];
  return { label, id, frames: sprite?.sprites.length ?? 0, draw: (frame) => sprite ? renderTopSprite(sprite, frame) : null };
}
function unitSource(data: RomData, id: number, label: string, palette?: number): PreviewSource {
  const sst = data.unitSstList[id];
  const state = sst ? getUnitSpriteState(sst) : undefined;
  return {
    label, id, frames: state?.spriteData?.spriteMaps.length ?? 0,
    palettes: palette === undefined ? state?.spritePalettes?.palettes.length : undefined,
    draw: (frame, selected) => state ? renderUnitSprite(state, frame, palette ?? selected) : null,
  };
}

function card(source: PreviewSource): HTMLElement {
  const figure = el('figure', { class: 'rom-image-card' });
  const caption = `${source.label} #${source.id}`;
  figure.append(el('figcaption', { text: caption }));
  const viewport = el('div', { class: 'rom-image-viewport' });
  figure.append(viewport);
  let frame = 0;
  let palette = 0;
  const draw = () => {
    viewport.replaceChildren();
    try {
      const pixels = source.draw(frame, palette);
      if (!pixels) {
        viewport.append(el('span', { class: 'hint', text: source.empty ?? t('preview.empty') }));
        return;
      }
      const canvas = el('canvas', { role: 'img', 'aria-label': caption });
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D unavailable');
      const bitmap = ctx.createImageData(pixels.width, pixels.height);
      bitmap.data.set(pixels.pixels);
      ctx.putImageData(bitmap, 0, 0);
      const scale = Math.min(2, 160 / pixels.width, 192 / pixels.height);
      canvas.style.width = `${pixels.width * scale}px`;
      canvas.style.height = `${pixels.height * scale}px`;
      canvas.title = `${pixels.width} × ${pixels.height}`;
      viewport.append(canvas);
    } catch (error) {
      viewport.append(el('span', {
        class: 'hint', text: t('preview.failed'),
        title: error instanceof Error ? error.message : String(error),
      }));
    }
  };
  const controls = el('div', { class: 'rom-image-controls' });
  const selector = (label: string, count: number, update: (value: number) => void) => {
    if (count <= 1) return;
    const input = numberInput(0, (value) => {
      const selected = Math.min(count - 1, Math.max(0, Math.trunc(value)));
      input.value = String(selected);
      update(selected);
      draw();
    }, { min: 0, max: count - 1 });
    input.step = '1';
    controls.append(el('label', {}, [label, input]));
  };
  selector(t('preview.frame'), source.frames, (value) => { frame = value; });
  selector(t('preview.palette'), source.palettes ?? 0, (value) => { palette = value; });
  if (controls.childElementCount) figure.append(controls);
  draw();
  return figure;
}

function itemSource(data: RomData, id: number): PreviewSource {
  if (!Number.isInteger(id) || id <= 0) return { label: t('tab.equipment'), id: 0, frames: 0, draw: () => null };
  const equipment = data.equipmentList.find((item) => item.id === id);
  const original = data.itemNames.find((entry) => entry.id === id)?.string;
  const label = original ? gameName('item', original) : t('tab.equipment');
  if (equipment) {
    // Retail shields/armor/accessories carry zero in this battle-sprite field;
    // rendering unit zero would show a soldier as the item's artwork.
    if (equipment.sprite <= 0) return { label, id, frames: 0, draw: () => null };
    const source = unitSource(data, equipment.sprite, label, equipment.palette & 255);
    return { ...source, id };
  }
  return { label, id, frames: 0, empty: t('preview.unmapped'), draw: () => null };
}

// Follow only declared item references, including nested reward/recipe records.
// IDs remain in their original namespace; no image is inferred from item order.
function referencedItems(data: RomData, tab: string, record: RecordData): number[] {
  const ids = new Set<number>();
  const visited = new Set<unknown>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object' || value instanceof Uint8Array || value instanceof Flags || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) { value.forEach(visit); return; }
    for (const [key, field] of Object.entries(value)) {
      const ref = fieldMeta(tab, key)?.ref;
      if (typeof field === 'number' && field > 0) {
        if (ref === 'item' || ref === 'equipment' || ref === 'loot') ids.add(field);
        if (ref === 'itemTable') visit(data.itemTableList.find((entry) => entry.id === field));
      } else visit(field);
    }
  };
  visit(record);
  return [...ids];
}

const ITEM_TABS = new Set(['itemTables', 'lawBonuses', 'bazaar', 'bazaarRecipes', 'auctionPrizes', 'auctionGrandPrizes', 'formations', 'quests']);

export function imagePreviews(data: RomData, tab: string, record: RecordData, index: number): {
  element: HTMLElement;
  refresh(): void;
} | null {
  if (!['jobs', 'characters', 'equipment', 'consumables', 'loot', 'maps', 'faces', 'topSprites', 'unitSprites'].includes(tab) && !ITEM_TABS.has(tab)) return null;
  const element = el('section', { class: 'rom-image-previews', 'aria-label': t('preview.title') });
  const refresh = () => {
    const sources: PreviewSource[] = [];
    if (tab === 'jobs' || tab === 'characters') {
      for (const side of ['unit', 'enemy']) {
        const label = (field: string) => {
          const words = field.replace(/([a-z])([A-Z])/g, '$1 $2');
          return fieldLabel(field, words[0].toUpperCase() + words.slice(1));
        };
        const palette = Number(record[`${side}Palette`]);
        sources.push(faceSource(data, Number(record[`${side}Portrait`]), label(`${side}Portrait`)));
        for (const suffix of ['Sprite', 'AlternateSprite']) {
          const field = `${side}${suffix}`;
          sources.push(unitSource(data, Number(record[field]), label(field), palette));
        }
        sources.push(topSource(data, Number(record[`${side}TopSprite`]), label(`${side}TopSprite`)));
      }
    } else if (['equipment', 'consumables', 'loot'].includes(tab)) {
      sources.push(itemSource(data, Number(record.id)));
    } else if (ITEM_TABS.has(tab)) {
      for (const id of referencedItems(data, tab, record)) sources.push(itemSource(data, id));
    } else if (tab === 'maps') {
      const map = data.maps[index];
      sources.push({ label: t('preview.mapTexture'), id: map?.id ?? index, frames: 1, palettes: map?.palettes.length,
        draw: (_, palette) => map && map.palettes[palette] ? renderIndexedTexture(map.width, map.height, map.texture, map.palettes[palette]) : null });
    } else if (tab === 'faces') sources.push(faceSource(data, index, t('tab.faces')));
    else if (tab === 'topSprites') sources.push(topSource(data, index, t('tab.topSprites')));
    else sources.push(unitSource(data, index, t('tab.unitSprites')));
    element.replaceChildren(...sources.map(card));
  };
  refresh();
  return { element, refresh };
}
