import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import { EquipmentData, ConsumableData, LootData, ItemTable, LawBonus } from '../src/data/model/item';
import { BazaarRecipe, BazaarSet } from '../src/data/model/bazaar';
import { fixture, fixtureJson, tsOutput, assertBytesEqual } from './helpers';

interface EquipmentParsed {
  id: number;
  equipmentType: number;
  notName: number;
  element: number;
  range: number;
  equipmentLocation: number;
  palette: number;
  sprite: number;
  attackEffect: number;
  hitEffect: number;
  hitSound: number;
  buy: number;
  sell: number;
  bonusEffect: number;
  attack: number;
  defense: number;
  magick: number;
  resistance: number;
  speed: number;
  evasion: number;
  move: number;
  jump: number;
  jobGroup1: number;
  jobGroup2: number;
  jobGroup3: number;
  ability1: number;
  ability2: number;
  ability3: number;
  propertyFlags: number[];
  propertyBits: boolean[];
}
interface ConsumableParsed {
  id: number;
  buy: number;
  sell: number;
  _0x4: number;
  storyProgress: number;
}
interface LootParsed {
  id: number;
  buy: number;
  sell: number;
  category: number;
  rank: number;
  _0x6: number;
}
interface ItemTableParsed {
  id: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
}
interface LawBonusParsed {
  id: number;
  item1: number;
  item2: number;
  item3: number;
  padding: number;
}
interface BazaarRecipeParsed {
  id: number;
  item: number;
  loot1: number;
  loot2: number;
  loot3: number;
  _0x6: number;
}
interface BazaarSetParsed {
  id: number;
  storyRequirement: number;
  flagRequirement: number;
  items: { item: number; grade: number; unused: number }[];
}
interface Entry<T> {
  id: number;
  parsed: T;
}
interface Manifest {
  equipment: Entry<EquipmentParsed>[];
  consumables: Entry<ConsumableParsed>[];
  loot: Entry<LootParsed>[];
  itemTables: Entry<ItemTableParsed>[];
  lawBonuses: Entry<LawBonusParsed>[];
  bazaarRecipes: Entry<BazaarRecipeParsed>[];
  bazaarSets: Entry<BazaarSetParsed>[];
}

const manifest = fixtureJson<Manifest>('item/manifest.json');

function checkEquipment(e: EquipmentData, p: EquipmentParsed): void {
  expect(e.id).toBe(p.id);
  expect(e.equipmentType).toBe(p.equipmentType);
  expect(e.notName).toBe(p.notName);
  expect(e.element).toBe(p.element);
  expect(e.range).toBe(p.range);
  expect(e.equipmentLocation).toBe(p.equipmentLocation);
  expect(e.palette).toBe(p.palette);
  expect(e.sprite).toBe(p.sprite);
  expect(e.attackEffect).toBe(p.attackEffect);
  expect(e.hitEffect).toBe(p.hitEffect);
  expect(e.hitSound).toBe(p.hitSound);
  expect(e.buy).toBe(p.buy);
  expect(e.sell).toBe(p.sell);
  expect(e.bonusEffect).toBe(p.bonusEffect);
  expect(e.attack).toBe(p.attack);
  expect(e.defense).toBe(p.defense);
  expect(e.magick).toBe(p.magick);
  expect(e.resistance).toBe(p.resistance);
  expect(e.speed).toBe(p.speed);
  expect(e.evasion).toBe(p.evasion);
  expect(e.move).toBe(p.move);
  expect(e.jump).toBe(p.jump);
  expect(e.jobGroup1).toBe(p.jobGroup1);
  expect(e.jobGroup2).toBe(p.jobGroup2);
  expect(e.jobGroup3).toBe(p.jobGroup3);
  expect(e.ability1).toBe(p.ability1);
  expect(e.ability2).toBe(p.ability2);
  expect(e.ability3).toBe(p.ability3);
  expect(Array.from(e.propertyFlags.toBytes())).toEqual(p.propertyFlags);
  expect(e.propertyFlags.bits).toEqual(p.propertyBits);
}

describe('EquipmentData', () => {
  const input = fixture('item/equipment.in.bin');
  const expected = fixture('item/equipment.out.bin');
  const records: EquipmentData[] = [];

  for (const entry of manifest.equipment) {
    it(`parses and reserializes equipment record ${entry.id} byte-for-byte vs Java`, () => {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x28);
      const e = new EquipmentData(bytes, entry.id);
      expect(bytes.position()).toBe((entry.id + 1) * 0x28);
      checkEquipment(e, entry.parsed);
      records[entry.id] = e;

      const out = e.toBytes();
      assertBytesEqual(out, expected.slice(entry.id * 0x28, (entry.id + 1) * 0x28), `equipment ${entry.id}`);
      tsOutput(`item/equipment_${entry.id}.out.bin`, out);
    });
  }

  it('concatenated serialization matches Java blob', () => {
    const all = Bytes.alloc(manifest.equipment.length * 0x28);
    for (const entry of manifest.equipment) {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x28);
      all.putBytes(new EquipmentData(bytes, entry.id).toBytes());
    }
    assertBytesEqual(all.toUint8Array(), expected, 'equipment blob');
    tsOutput('item/equipment.out.bin', all.toUint8Array());
  });

  it('modified equipment matches Java after edits', () => {
    const bytes = Bytes.wrap(input);
    bytes.position(5 * 0x28);
    const e = new EquipmentData(bytes, 5);
    e.sprite = -1;
    e.buy = 12345;
    e.attack = -7;
    e.equipmentType = 0x0f; // EquipmentType.BOW
    e.ability2 = 1000;
    e.propertyFlags.set(0, !e.propertyFlags.get(0));
    e.propertyFlags.set(31, true);
    const out = e.toBytes();
    assertBytesEqual(out, fixture('item/equipment_modified.out.bin'), 'equipment modified');
    tsOutput('item/equipment_modified.out.bin', out);
  });

  it('equipmentType short quirk: 0x0123 parses to low byte and serializes as 0x0023', () => {
    const bytes = Bytes.wrap(input);
    bytes.position(1 * 0x28);
    const e = new EquipmentData(bytes, 1);
    expect(e.equipmentType).toBe(0x23);
    const out = e.toBytes();
    expect(out[0]).toBe(0x23);
    expect(out[1]).toBe(0x00);
  });
});

describe('ConsumableData', () => {
  const input = fixture('item/consumables.in.bin');
  const expected = fixture('item/consumables.out.bin');

  for (const entry of manifest.consumables) {
    it(`parses and reserializes consumable record ${entry.id} byte-for-byte vs Java`, () => {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      const d = new ConsumableData(bytes, entry.id);
      expect(bytes.position()).toBe((entry.id + 1) * 0x8);
      expect(d.id).toBe(entry.parsed.id);
      expect(d.buy).toBe(entry.parsed.buy);
      expect(d.sell).toBe(entry.parsed.sell);
      expect(d._0x4).toBe(entry.parsed._0x4);
      expect(d.storyProgress).toBe(entry.parsed.storyProgress);

      const out = d.toBytes();
      assertBytesEqual(out, expected.slice(entry.id * 0x8, (entry.id + 1) * 0x8), `consumable ${entry.id}`);
      tsOutput(`item/consumable_${entry.id}.out.bin`, out);
    });
  }

  it('concatenated serialization matches Java blob', () => {
    const all = Bytes.alloc(manifest.consumables.length * 0x8);
    for (const entry of manifest.consumables) {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      all.putBytes(new ConsumableData(bytes, entry.id).toBytes());
    }
    assertBytesEqual(all.toUint8Array(), expected, 'consumables blob');
    tsOutput('item/consumables.out.bin', all.toUint8Array());
  });
});

describe('LootData', () => {
  const input = fixture('item/loot.in.bin');
  const expected = fixture('item/loot.out.bin');

  for (const entry of manifest.loot) {
    it(`parses and reserializes loot record ${entry.id} byte-for-byte vs Java`, () => {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      const d = new LootData(bytes, entry.id);
      expect(bytes.position()).toBe((entry.id + 1) * 0x8);
      expect(d.id).toBe(entry.parsed.id);
      expect(d.buy).toBe(entry.parsed.buy);
      expect(d.sell).toBe(entry.parsed.sell);
      expect(d.category).toBe(entry.parsed.category);
      expect(d.rank).toBe(entry.parsed.rank);
      expect(d._0x6).toBe(entry.parsed._0x6);

      const out = d.toBytes();
      assertBytesEqual(out, expected.slice(entry.id * 0x8, (entry.id + 1) * 0x8), `loot ${entry.id}`);
      tsOutput(`item/loot_${entry.id}.out.bin`, out);
    });
  }

  it('rank 0/1 inputs fall back to ZERO_STAR (2) on serialization', () => {
    const bytes = Bytes.wrap(input);
    const d0 = new LootData(bytes, 0);
    expect(d0.rank).toBe(2);
    expect(d0.toBytes()[5]).toBe(2);
    bytes.position(3 * 0x8);
    const d3 = new LootData(bytes, 3);
    expect(d3.category).toBe(0);
    expect(d3.rank).toBe(2);
  });

  it('concatenated serialization matches Java blob', () => {
    const all = Bytes.alloc(manifest.loot.length * 0x8);
    for (const entry of manifest.loot) {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      all.putBytes(new LootData(bytes, entry.id).toBytes());
    }
    assertBytesEqual(all.toUint8Array(), expected, 'loot blob');
    tsOutput('item/loot.out.bin', all.toUint8Array());
  });
});

describe('ItemTable', () => {
  const input = fixture('item/itemTables.in.bin');
  const expected = fixture('item/itemTables.out.bin');

  for (const entry of manifest.itemTables) {
    it(`parses and reserializes item table record ${entry.id} byte-for-byte vs Java`, () => {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      const t = new ItemTable(bytes, entry.id);
      expect(bytes.position()).toBe((entry.id + 1) * 0x8);
      expect(t.id).toBe(entry.parsed.id);
      expect(t.item1).toBe(entry.parsed.item1);
      expect(t.item2).toBe(entry.parsed.item2);
      expect(t.item3).toBe(entry.parsed.item3);
      expect(t.item4).toBe(entry.parsed.item4);

      const out = t.toBytes();
      assertBytesEqual(out, expected.slice(entry.id * 0x8, (entry.id + 1) * 0x8), `itemTable ${entry.id}`);
      tsOutput(`item/itemTable_${entry.id}.out.bin`, out);
    });
  }

  it('concatenated serialization matches Java blob', () => {
    const all = Bytes.alloc(manifest.itemTables.length * 0x8);
    for (const entry of manifest.itemTables) {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      all.putBytes(new ItemTable(bytes, entry.id).toBytes());
    }
    assertBytesEqual(all.toUint8Array(), expected, 'itemTables blob');
    tsOutput('item/itemTables.out.bin', all.toUint8Array());
  });
});

describe('LawBonus', () => {
  const input = fixture('item/lawBonuses.in.bin');
  const expected = fixture('item/lawBonuses.out.bin');

  for (const entry of manifest.lawBonuses) {
    it(`parses and reserializes law bonus record ${entry.id} byte-for-byte vs Java`, () => {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      const l = new LawBonus(bytes, entry.id);
      expect(bytes.position()).toBe((entry.id + 1) * 0x8);
      expect(l.id).toBe(entry.parsed.id);
      expect(l.item1).toBe(entry.parsed.item1);
      expect(l.item2).toBe(entry.parsed.item2);
      expect(l.item3).toBe(entry.parsed.item3);
      expect(l.padding).toBe(entry.parsed.padding);

      const out = l.toBytes();
      assertBytesEqual(out, expected.slice(entry.id * 0x8, (entry.id + 1) * 0x8), `lawBonus ${entry.id}`);
      tsOutput(`item/lawBonus_${entry.id}.out.bin`, out);
    });
  }

  it('concatenated serialization matches Java blob', () => {
    const all = Bytes.alloc(manifest.lawBonuses.length * 0x8);
    for (const entry of manifest.lawBonuses) {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      all.putBytes(new LawBonus(bytes, entry.id).toBytes());
    }
    assertBytesEqual(all.toUint8Array(), expected, 'lawBonuses blob');
    tsOutput('item/lawBonuses.out.bin', all.toUint8Array());
  });
});

describe('BazaarRecipe', () => {
  const input = fixture('item/bazaarRecipes.in.bin');
  const expected = fixture('item/bazaarRecipes.out.bin');

  for (const entry of manifest.bazaarRecipes) {
    it(`parses and reserializes bazaar recipe record ${entry.id} byte-for-byte vs Java`, () => {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      const r = new BazaarRecipe(bytes, entry.id);
      expect(bytes.position()).toBe((entry.id + 1) * 0x8);
      expect(r.id).toBe(entry.parsed.id);
      expect(r.item).toBe(entry.parsed.item);
      expect(r.loot1).toBe(entry.parsed.loot1);
      expect(r.loot2).toBe(entry.parsed.loot2);
      expect(r.loot3).toBe(entry.parsed.loot3);
      expect(r._0x6).toBe(entry.parsed._0x6);

      const out = r.toBytes();
      assertBytesEqual(out, expected.slice(entry.id * 0x8, (entry.id + 1) * 0x8), `bazaarRecipe ${entry.id}`);
      tsOutput(`item/bazaarRecipe_${entry.id}.out.bin`, out);
    });
  }

  it('zero loot indices stay 0 (dummy lootList[0].id == 0)', () => {
    const r = new BazaarRecipe(Bytes.wrap(input), 0);
    expect(r.loot1).toBe(0);
    expect(r.loot2).toBe(0);
    expect(r.loot3).toBe(0);
    assertBytesEqual(r.toBytes(), new Uint8Array(8), 'bazaarRecipe zero');
  });

  it('concatenated serialization matches Java blob', () => {
    const all = Bytes.alloc(manifest.bazaarRecipes.length * 0x8);
    for (const entry of manifest.bazaarRecipes) {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x8);
      all.putBytes(new BazaarRecipe(bytes, entry.id).toBytes());
    }
    assertBytesEqual(all.toUint8Array(), expected, 'bazaarRecipes blob');
    tsOutput('item/bazaarRecipes.out.bin', all.toUint8Array());
  });
});

describe('BazaarSet', () => {
  const input = fixture('item/bazaarSets.in.bin');
  const expected = fixture('item/bazaarSets.out.bin');

  for (const entry of manifest.bazaarSets) {
    it(`parses and reserializes bazaar set record ${entry.id} byte-for-byte vs Java`, () => {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x2c);
      const s = new BazaarSet(bytes, entry.id);
      expect(bytes.position()).toBe((entry.id + 1) * 0x2c);
      expect(s.id).toBe(entry.parsed.id);
      expect(s.storyRequirement).toBe(entry.parsed.storyRequirement);
      expect(s.flagRequirement).toBe(entry.parsed.flagRequirement);
      expect(s.items.length).toBe(10);
      expect(s.items.map((it) => ({ item: it.item, grade: it.grade, unused: it.unused }))).toEqual(entry.parsed.items);

      const out = s.toBytes();
      assertBytesEqual(out, expected.slice(entry.id * 0x2c, (entry.id + 1) * 0x2c), `bazaarSet ${entry.id}`);
      tsOutput(`item/bazaarSet_${entry.id}.out.bin`, out);
    });
  }

  it('modified bazaar set matches Java after edits', () => {
    const bytes = Bytes.wrap(input);
    bytes.position(1 * 0x2c);
    const s = new BazaarSet(bytes, 1);
    s.storyRequirement = 777;
    s.items[0].item = 5;
    s.items[0].grade = -3;
    s.items[9].unused = 0;
    const out = s.toBytes();
    assertBytesEqual(out, fixture('item/bazaarSet_modified.out.bin'), 'bazaarSet modified');
    tsOutput('item/bazaarSet_modified.out.bin', out);
  });

  it('concatenated serialization matches Java blob', () => {
    const all = Bytes.alloc(manifest.bazaarSets.length * 0x2c);
    for (const entry of manifest.bazaarSets) {
      const bytes = Bytes.wrap(input);
      bytes.position(entry.id * 0x2c);
      all.putBytes(new BazaarSet(bytes, entry.id).toBytes());
    }
    assertBytesEqual(all.toUint8Array(), expected, 'bazaarSets blob');
    tsOutput('item/bazaarSets.out.bin', all.toUint8Array());
  });
});