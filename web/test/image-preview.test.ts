// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RomData } from '../src/data/romData';
import { UnitFace, TopSprite } from '../src/data/model/sprites';
import { imagePreviews } from '../src/ui/imagePreview';
import { makeModelTab } from '../src/ui/modelEditor';
import { refOptions } from '../src/ui/schema';
import { setLanguage } from '../src/ui/i18n';
import { EquipmentData } from '../src/data/model/item';
import { Bytes } from '../src/core/binary';

let draws: Uint8ClampedArray[];
beforeEach(() => {
  setLanguage('en');
  draws = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (bitmap: ImageData) => { draws.push(bitmap.data.slice()); },
  }) as unknown as CanvasRenderingContext2D);
});
afterEach(() => { vi.restoreAllMocks(); setLanguage('en'); });

function dataWithImages(): RomData {
  const data = new RomData();
  data.unitFaces = [new UnitFace(0), ...[31, 0x3e0].map((color) => {
    const face = new UnitFace(0); // Duplicate Java IDs; ROM references are list indices.
    face.width = 1; face.height = 1; face.image = new Uint8Array([1]);
    face.palette = new Uint8Array(512); face.palette[2] = color & 255; face.palette[3] = color >> 8;
    face.pieces = [{ sourceX: 0, sourceY: 0, sourceWidth: 1, sourceHeight: 1, offsetX: 0, offsetY: 0, targetWidth: 1, targetHeight: 1 }];
    return face;
  })];
  const top = new TopSprite(1); top.palette = new Uint8Array(32); top.palette[2] = 31;
  top.sprites = [new Uint8Array(640).fill(0x01), new Uint8Array(640).fill(0x10)];
  data.topSprites = [new TopSprite(0), top];
  return data;
}

describe('runtime ROM image previews', () => {
  it('renders portrait references using loaded indices rather than duplicate file IDs', () => {
    const data = dataWithImages();
    expect(refOptions(data, 'face').map((option) => option.id)).toEqual([0, 1, 2]);
    const view = imagePreviews(data, 'faces', {}, 1)!;
    expect(view.element.querySelector('canvas')?.width).toBe(1);
    expect([...draws[0]]).toEqual([255, 0, 0, 255]);
  });

  it('updates the job preview when a portrait reference changes, without changing image bytes', () => {
    const data = dataWithImages();
    const record = { id: 1, unitPortrait: 1, enemyPortrait: 2, unitSprite: -1, enemySprite: -1,
      unitAlternateSprite: -1, enemyAlternateSprite: -1, unitPalette: 0, enemyPalette: 0,
      unitTopSprite: 1, enemyTopSprite: 1 };
    const tab = makeModelTab({ id: 'jobs', label: () => 'Jobs', list: () => [record] });
    let dirty = 0;
    const container = document.createElement('div');
    tab.render(container, data, () => { dirty++; });
    expect(container.querySelectorAll('canvas')).toHaveLength(4);
    expect(dirty).toBe(0);
    const label = container.querySelector('label[title="unitPortrait"]')!;
    const control = label.nextElementSibling!;
    control.querySelector('input')!.dispatchEvent(new Event('focus'));
    const option = [...control.querySelectorAll('li')].find((node) => node.textContent?.startsWith('#2 '))!;
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(record.unitPortrait).toBe(2);
    expect(container.querySelector('canvas[aria-label="Unit Portrait #2"]')).not.toBeNull();
    expect(dirty).toBe(1);
    expect(data.unitFaces.every((face) => !face.hasChanged)).toBe(true);
    expect(data.topSprites.every((top) => !top.hasChanged)).toBe(true);
  });

  it('changes preview frames without modifying the ROM or creating asset URLs', () => {
    const data = dataWithImages();
    const before = data.topSprites[1].toBytes();
    const view = imagePreviews(data, 'topSprites', {}, 1)!;
    const first = draws.at(-1)!.slice();
    const input = view.element.querySelector('input')!;
    input.value = '1'; input.dispatchEvent(new Event('change'));
    expect(draws.at(-1)).not.toEqual(first);
    expect(data.topSprites[1].toBytes()).toEqual(before);
    expect(view.element.querySelector('[src]')).toBeNull();
  });

  it('contains bad data in its card and translates empty placeholders', () => {
    setLanguage('zh-CN');
    const data = dataWithImages(); data.unitFaces[1].palette = new Uint8Array(0);
    expect(imagePreviews(data, 'faces', {}, 1)!.element.textContent).toContain('预览不可用');
    expect(imagePreviews(data, 'faces', {}, 0)!.element.textContent).toContain('无图片');
    expect(imagePreviews(data, 'abilities', {}, 0)).toBeNull();
  });
  it('shows equipment and nested reward item previews using their actual sprite references', () => {
    const data = dataWithImages();
    const equipment = new EquipmentData(Bytes.alloc(40), 7);
    equipment.sprite = -1;
    data.equipmentList = [equipment];
    data.itemNames = [{ id: 7, string: 'Test sword' }, { id: 8, string: 'Potion' }];
    const direct = imagePreviews(data, 'equipment', equipment as unknown as Record<string, unknown>, 0)!;
    expect(direct.element.textContent).toContain('Test sword #7');
    expect(direct.element.querySelector('canvas')).toBeNull();
    equipment.sprite = 0;
    direct.refresh();
    expect(direct.element.querySelector('canvas')).toBeNull();
    const nested = imagePreviews(data, 'quests', { data: { itemReward1: { item: 7, amount: 1 }, itemReward2: { item: 8, amount: 1 } } }, 0)!;
    expect(nested.element.querySelectorAll('figure')).toHaveLength(2);
    expect(nested.element.textContent).toContain('Potion #8');
    expect(nested.element.textContent).toContain('Image mapping unconfirmed');
    expect(equipment.hasOwnProperty('hasChanged')).toBe(false);
  });

  it('does not infer consumable images from item IDs and includes character previews', () => {
    const data = dataWithImages();
    data.itemNames = [{ id: 412, string: 'Potion' }];
    const consumable = imagePreviews(data, 'consumables', { id: 412 }, 1)!;
    expect(consumable.element.textContent).toContain('Image mapping unconfirmed');
    expect(consumable.element.querySelector('canvas')).toBeNull();
    const character = imagePreviews(data, 'characters', { unitPortrait: 1, enemyPortrait: 2 }, 1)!;
    expect(character.element.querySelectorAll('canvas')).toHaveLength(2);
  });

});
