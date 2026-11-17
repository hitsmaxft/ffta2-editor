import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import { Flags } from '../src/data/model/flags';
import { Quest, QuestData, QuestInfo } from '../src/data/model/quest';
import { FormationData, FormationHeader, FormationUnit } from '../src/data/model/formation';
import { AuctionInfo, AuctionPrizeTable, AuctionVanillaData } from '../src/data/model/auction';
import { fixture, fixtureJson, tsOutput, assertBytesEqual } from './helpers';

interface Case {
  name: string;
  parsed: Record<string, unknown>;
}
interface Manifest {
  questData: Case[];
  questInfo: Case[];
  quests: Case[];
  formationHeaders: Case[];
  formationUnits: Case[];
  formations: Case[];
  auctionPrizeTables: Case[];
  auctionInfos: Case[];
  vanillaGrandPrizes: number[][][];
}

const manifest = fixtureJson<Manifest>('quest/manifest.json');

// Recursively compares a TS model against the Java field dump. Only keys present
// in the Java JSON are checked (TS may carry extra bookkeeping fields like unit ids).
function matchJson(actual: unknown, expected: unknown, path: string): void {
  if (actual instanceof Flags) {
    // Java RegionFlags dumps as the unsigned value of its single byte.
    expect(actual.toBytes().length, `${path}.length`).toBe(1);
    expect(actual.toBytes()[0], path).toBe(expected);
    return;
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), `${path} should be an array`).toBe(true);
    const arr = actual as unknown[];
    expect(arr.length, `${path}.length`).toBe(expected.length);
    expected.forEach((v, i) => matchJson(arr[i], v, `${path}[${i}]`));
    return;
  }
  if (expected !== null && typeof expected === 'object') {
    expect(actual, path).toBeTruthy();
    for (const [k, v] of Object.entries(expected)) {
      matchJson((actual as Record<string, unknown>)[k], v, `${path}.${k}`);
    }
    return;
  }
  expect(actual, path).toBe(expected);
}

describe('QuestData', () => {
  for (const c of manifest.questData) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const qd = new QuestData(Bytes.wrap(fixture(`quest/${c.name}.in.bin`)));
      matchJson(qd, c.parsed, c.name);
      const out = qd.toBytes();
      assertBytesEqual(out, fixture(`quest/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`quest/${c.name}.out.bin`, out);
    });
  }

  it('dispatch byte 2 parses false and serializes 0 (Java quirk)', () => {
    const blob = new Uint8Array(0x64);
    blob[0x2a] = 2;
    const qd = new QuestData(Bytes.wrap(blob));
    expect(qd.dispatch).toBe(false);
    expect(qd.toBytes()[0x2a]).toBe(0);
  });

  it('item reward amount is a signed byte from data >>> 10', () => {
    const blob = new Uint8Array(0x64);
    const view = new DataView(blob.buffer);
    view.setInt16(0x50, -32768, true); // itemReward1: item 0, amount -32
    view.setInt16(0x52, -1, true); // itemReward2: item 1023, amount -1
    const qd = new QuestData(Bytes.wrap(blob));
    expect(qd.itemReward1.item).toBe(0);
    expect(qd.itemReward1.amount).toBe(-32);
    expect(qd.itemReward2.item).toBe(1023);
    expect(qd.itemReward2.amount).toBe(-1);
    expect(qd.itemReward1.toShort()).toBe(-32768);
    expect(qd.itemReward2.toShort()).toBe(-1);
  });
});

describe('QuestInfo', () => {
  for (const c of manifest.questInfo) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const qi = new QuestInfo(Bytes.wrap(fixture(`quest/${c.name}.in.bin`)));
      matchJson(qi, c.parsed, c.name);
      const out = qi.toBytes();
      assertBytesEqual(out, fixture(`quest/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`quest/${c.name}.out.bin`, out);
    });
  }
});

describe('Quest', () => {
  for (const c of manifest.quests) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const q = new Quest(
        Bytes.wrap(fixture(`quest/${c.name}.info.in.bin`)),
        Bytes.wrap(fixture(`quest/${c.name}.data.in.bin`)),
        (c.parsed as { id: number }).id
      );
      matchJson(q, c.parsed, c.name);
      const [infoOut, dataOut] = q.toBytes();
      assertBytesEqual(infoOut, fixture(`quest/${c.name}.info.out.bin`), `${c.name} info out`);
      assertBytesEqual(dataOut, fixture(`quest/${c.name}.data.out.bin`), `${c.name} data out`);
      tsOutput(`quest/${c.name}.info.out.bin`, infoOut);
      tsOutput(`quest/${c.name}.data.out.bin`, dataOut);
    });
  }
});

describe('FormationHeader', () => {
  for (const c of manifest.formationHeaders) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const h = new FormationHeader(Bytes.wrap(fixture(`quest/${c.name}.in.bin`)));
      matchJson(h, c.parsed, c.name);
      const out = h.toBytes();
      assertBytesEqual(out, fixture(`quest/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`quest/${c.name}.out.bin`, out);
    });
  }
});

describe('FormationUnit', () => {
  for (const c of manifest.formationUnits) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const u = new FormationUnit(Bytes.wrap(fixture(`quest/${c.name}.in.bin`)), 0, 7);
      matchJson(u, c.parsed, c.name);
      const out = u.toBytes();
      assertBytesEqual(out, fixture(`quest/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`quest/${c.name}.out.bin`, out);
    });
  }

  it('secondaryAbilitySet short write clobbers _0x1b (Java quirk)', () => {
    const blob = new Uint8Array(0x3c);
    blob[0x1a] = 5;
    blob[0x1b] = 0xab;
    const u = new FormationUnit(Bytes.wrap(blob), 0, 0);
    expect(u.secondaryAbilitySet).toBe(5);
    expect(u._0x1b).toBe(-85);
    const out = u.toBytes();
    expect(out[0x1a]).toBe(5);
    expect(out[0x1b]).toBe(0); // overwritten by the high byte of the short
  });
});

describe('FormationData', () => {
  for (const c of manifest.formations.filter((x) => x.name !== 'formation_mod')) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const fd = new FormationData(
        Bytes.wrap(fixture(`quest/${c.name}.header.in.bin`)),
        Bytes.wrap(fixture(`quest/${c.name}.units.in.bin`)),
        (c.parsed as { id: number }).id
      );
      matchJson(fd, c.parsed, c.name);
      const [headerOut, unitsOut] = fd.toBytes();
      assertBytesEqual(headerOut, fixture(`quest/${c.name}.header.out.bin`), `${c.name} header out`);
      assertBytesEqual(unitsOut, fixture(`quest/${c.name}.units.out.bin`), `${c.name} units out`);
      tsOutput(`quest/${c.name}.header.out.bin`, headerOut);
      tsOutput(`quest/${c.name}.units.out.bin`, unitsOut);
    });
  }

  it('formation_mod: removing a unit updates header.numUnits on serialize', () => {
    const c = manifest.formations.find((x) => x.name === 'formation_mod')!;
    const fd = new FormationData(
      Bytes.wrap(fixture('quest/formation_mod.header.in.bin')),
      Bytes.wrap(fixture('quest/formation_mod.units.in.bin')),
      (c.parsed as { id: number }).id
    );
    matchJson(fd, c.parsed, 'formation_mod parsed');
    expect(fd.units.length).toBe(3);
    fd.units.splice(1, 1);
    const [headerOut, unitsOut] = fd.toBytes();
    expect(fd.header.numUnits).toBe(2);
    assertBytesEqual(headerOut, fixture('quest/formation_mod.header.out.bin'), 'formation_mod header out');
    assertBytesEqual(unitsOut, fixture('quest/formation_mod.units.out.bin'), 'formation_mod units out');
    tsOutput('quest/formation_mod.header.out.bin', headerOut);
    tsOutput('quest/formation_mod.units.out.bin', unitsOut);
  });
});

describe('AuctionPrizeTable', () => {
  for (const c of manifest.auctionPrizeTables) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const t = new AuctionPrizeTable(
        Bytes.wrap(fixture(`quest/${c.name}.in.bin`)),
        (c.parsed as { id: number }).id
      );
      matchJson(t, c.parsed, c.name);
      const out = t.toBytes();
      assertBytesEqual(out, fixture(`quest/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`quest/${c.name}.out.bin`, out);
    });
  }
});

describe('AuctionInfo', () => {
  for (const c of manifest.auctionInfos.filter((x) => x.name !== 'auction_mod')) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const ai = new AuctionInfo(
        Bytes.wrap(fixture(`quest/${c.name}.in.bin`)),
        (c.parsed as { id: number }).id
      );
      // Java resolves grandPrizeTable = auctionGrandPrizeTableList[id]; it is a
      // controller-level lookup, not part of the serialized record.
      const { grandPrizeTable, ...fields } = c.parsed as { grandPrizeTable: number };
      matchJson(ai, fields, c.name);
      expect(grandPrizeTable).toBe(ai.id);
      const out = ai.toBytes();
      assertBytesEqual(out, fixture(`quest/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`quest/${c.name}.out.bin`, out);
    });
  }

  it('auction_mod: missing prize tables are zero-padded on serialize', () => {
    const c = manifest.auctionInfos.find((x) => x.name === 'auction_mod')!;
    const ai = new AuctionInfo(Bytes.wrap(fixture('quest/auction_mod.in.bin')), 3);
    const { grandPrizeTable: _gpt, ...fields } = c.parsed as { grandPrizeTable: number };
    matchJson(ai, fields, 'auction_mod parsed');
    ai.prizeTables.splice(2, 2);
    const out = ai.toBytes();
    expect(out[10]).toBe(0);
    expect(out[11]).toBe(0);
    assertBytesEqual(out, fixture('quest/auction_mod.out.bin'), 'auction_mod out');
    tsOutput('quest/auction_mod.out.bin', out);
  });
});

describe('AuctionVanillaData', () => {
  it('grandPrizes table matches Java constant', () => {
    expect(AuctionVanillaData.grandPrizes).toEqual(manifest.vanillaGrandPrizes);
  });

  for (let i = 0; i < manifest.vanillaGrandPrizes.length; i++) {
    it(`vanilla grand prize table ${i} serializes byte-for-byte vs Java`, () => {
      // Build the input blob from the vanilla constant, parse, reserialize.
      const blob = new Uint8Array(0x20);
      const view = new DataView(blob.buffer);
      manifest.vanillaGrandPrizes[i].forEach(([item, flag], j) => {
        view.setInt16(j * 4, item, true);
        view.setInt16(j * 4 + 2, flag, true);
      });
      const t = new AuctionPrizeTable(Bytes.wrap(blob), i);
      const out = t.toBytes();
      assertBytesEqual(out, fixture(`quest/vanilla_${i}.out.bin`), `vanilla_${i} out`);
      tsOutput(`quest/vanilla_${i}.out.bin`, out);
    });
  }
});