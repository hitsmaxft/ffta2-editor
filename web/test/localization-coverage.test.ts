// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import * as enums from '../src/data/model/enums';
import { Targets, Effect, Accuracy, Modifier } from '../src/data/model/abilityEffect';
import { SpecialRequirement, WeaponRequirement } from '../src/data/model/abilityRequirements';
import { AbilityFlags } from '../src/data/model/abilityData';
import { RomData } from '../src/data/romData';
import { Flags } from '../src/data/model/flags';
import { enumLabel, fieldLabel, gameName, setLanguage } from '../src/ui/i18n';
import { flagLabel } from '../src/ui/flagLabels';
import { refOptions } from '../src/ui/schema';
import { makeModelTab } from '../src/ui/modelEditor';

afterEach(() => setLanguage('en'));

describe('extended Chinese UI', () => {
  it('covers every enum option and named ability flag, preserving uncertainty', () => {
    setLanguage('zh-CN');
    for (const enumeration of [...Object.values(enums), Targets, Effect, Accuracy, Modifier, SpecialRequirement, WeaponRequirement]) {
      for (const entry of enumeration.values) {
        expect(enumLabel(entry.name, entry.name), entry.name).not.toBe(entry.name);
      }
    }
    for (const key of Object.keys(new AbilityFlags()).filter((key) => key !== 'flags')) {
      expect(fieldLabel(key, key), key).not.toBe(key);
    }
    expect(enumLabel('TARGET_HUME_MAYBE', '')).toBe('目标：修姆（推测）');
    expect(enumLabel('_0xAB', '')).toBe('未知 0xAB');
    expect(fieldLabel('ability_0xa', '')).toBe('未知 0xa');
    expect(fieldLabel('futureField', 'futureField')).toBe('futureField');
  });

  it('translates exact names by category without replacing custom or Chinese names', () => {
    setLanguage('zh-CN');
    expect(gameName('job', 'Soldier')).toBe('士兵（Soldier）');
    expect(gameName('ability', 'Bonecrusher')).toBe('肉斩骨断（Bonecrusher）');
    expect(gameName('item', 'Knot of Rust')).toBe('锈铁块（Knot of Rust）');
    expect(gameName('bazaar', 'Apprentice Weapons')).toBe('见习装备（Apprentice Weapons）');
    expect(gameName('quest', 'A Bride for Montblanc')).toBe('莫布兰的新娘（A Bride for Montblanc）');
    expect(gameName('job', 'constructor')).toBe('constructor');
    expect(gameName('job', '士兵')).toBe('士兵');
    expect(gameName('job', 'Soldier MOD')).toBe('Soldier MOD');
    expect(gameName('item', 'Soldier')).toBe('Soldier');
    setLanguage('en');
    expect(gameName('job', 'Soldier')).toBe('Soldier');
  });

  it('refreshes references after language changes and text edits without changing IDs', () => {
    const data = new RomData();
    data.jobNames = [{ id: 1, string: 'Soldier' }];
    expect(refOptions(data, 'job')).toEqual([{ id: 1, name: 'Soldier' }]);
    setLanguage('zh-CN');
    expect(refOptions(data, 'job')).toEqual([{ id: 1, name: '士兵（Soldier）' }]);
    data.jobNames[0].string = 'Thief';
    expect(refOptions(data, 'job')).toEqual([{ id: 1, name: '盗贼（Thief）' }]);
    data.unitFaces = [{ id: 2 }] as RomData['unitFaces'];
    expect(refOptions(data, 'face')).toEqual([{ id: 2, name: '头像 #2' }]);
    setLanguage('en');
    expect(refOptions(data, 'face')).toEqual([{ id: 2, name: 'Face #2' }]);
  });

  it('renders translated nested cards and flags, and edits the original bit', () => {
    setLanguage('zh-CN');
    const propertyFlags = new Flags(4);
    const before = propertyFlags.toBytes();
    const record = { id: 0, propertyFlags, items: [{ amount: 1 }] };
    const tab = makeModelTab({ id: 'equipment', label: () => '装备', list: () => [record] });
    const container = document.createElement('div');
    let dirty = 0;
    tab.render(container, new RomData(), () => { dirty++; });
    expect(container.querySelector('.array-item summary')?.textContent).toBe('项目 #0');
    expect(container.textContent).toContain('1 · 可二刀流');
    expect(propertyFlags.toBytes()).toEqual(before);
    const checkbox = container.querySelectorAll<HTMLInputElement>('.flag input')[1];
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(propertyFlags.toBytes()).toEqual(new Uint8Array([2, 0, 0, 0]));
    expect(dirty).toBe(1);
    expect(flagLabel('jobs', 'equipFlags', 2)).toBe('2 · 剑');
    expect(flagLabel('jobs', 'propertyFlags', 0)).toBe('0 · 未知');
  });
});
