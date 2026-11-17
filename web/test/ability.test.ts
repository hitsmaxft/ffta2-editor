import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import { ActiveAbilityData, SPAbilityData } from '../src/data/model/abilityData';
import { AbilityAnimation } from '../src/data/model/abilityAnimation';
import { AbilityEffect, Targets, Effect, Accuracy, Modifier } from '../src/data/model/abilityEffect';
import { SpecialRequirement, WeaponRequirement } from '../src/data/model/abilityRequirements';
import { AbilityId } from '../src/data/model/abilityId';
import { AbilityElement, RangeAOEType, AbilityMenuRoutine, Race } from '../src/data/model/enums';
import { fixture, fixtureJson, tsOutput, assertBytesEqual, fixturesDir } from './helpers';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface ActiveCase {
  name: string;
  helpTextCount: number;
  parsed: {
    id: number;
    abilityHelp: number;
    abilityElement: number;
    mpCost: number;
    _0x4: number;
    _0x5: number;
    power: number;
    weaponRequirement: number;
    specialRequirement: number;
    rangeAOEType: number;
    range: number;
    radius: number;
    heightDifference: number;
    menuRoutine: number;
    effects: [number, number, number, number][];
    flags: boolean[];
    raceAp: [number, number][];
    _0x30: number;
    _0x31: number;
    learnedAbilityId: number;
    learnedAbility: number;
  };
}
interface SpCase {
  name: string;
  parsed: { id: number; maxAP: number; apIndex: number; padding: number };
}
interface AnimationCase {
  name: string;
  default: boolean;
  parsed: Record<string, number>;
}
interface EffectCase {
  name: string;
  parsed: [number, number, number, number];
}
interface Manifest {
  active: ActiveCase[];
  sp: SpCase[];
  animations: AnimationCase[];
  effects: EffectCase[];
}
interface EnumMaps {
  targets: number[];
  effect: number[];
  accuracy: number[];
  modifier: number[];
  specialRequirement: number[];
  abilityElement: number[];
  rangeAOEType: number[];
  abilityMenuRoutine: number[];
  race: number[];
  weaponRequirement: number[];
  weaponRequirementExtra: [number, number][];
}

const manifest = fixtureJson<Manifest>('ability/manifest.json');
const enumMaps = fixtureJson<EnumMaps>('ability/enummaps.json');

const FLAG_NAMES = [
  'masteredByDefault', 'targetSelf', 'invertedOnUndead', 'isMagickal',
  'learnableByBlueMagick', 'counterable', 'bypassReactions', 'reflectable',
  'usableWithMagickFrenzyAndDoublecast', 'ignoreSilence', 'usableByAI',
  'activatesBonecrusher_Maybe', 'magickCounterable', 'throwsItem',
  'activatesAbsorbMP', 'caughtByStickyFingers',
  'usableWithMix', 'mirrorItem', 'antiCounter', 'canTargetEmptySquare',
  'spawnsObject', 'attackWithSecondWeapon', 'isItem', 'bit_23',
  'AICheckDamage_Maybe', 'AICheckHealingBuff_Maybe', 'AICheckDebuff_Maybe',
  'elpe_UnburdenSoul', 'back_Side_DamageModifier', 'counterable_Maybe',
  'bit_30', 'bit_31',
] as const;

describe('ActiveAbilityData', () => {
  for (const c of manifest.active) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const bytes = Bytes.wrap(fixture(`ability/${c.name}.in.bin`));
      const a = new ActiveAbilityData(bytes, c.parsed.id, c.helpTextCount);
      expect(bytes.position()).toBe(0x34);
      const p = c.parsed;
      expect(a.id).toBe(p.id);
      expect(a.abilityHelp).toBe(p.abilityHelp);
      expect(a.abilityElement).toBe(p.abilityElement);
      expect(a.mpCost).toBe(p.mpCost);
      expect(a._0x4).toBe(p._0x4);
      expect(a._0x5).toBe(p._0x5);
      expect(a.power).toBe(p.power);
      expect(a.weaponRequirement).toBe(p.weaponRequirement);
      expect(a.specialRequirement).toBe(p.specialRequirement);
      expect(a.rangeAOEType).toBe(p.rangeAOEType);
      expect(a.range).toBe(p.range);
      expect(a.radius).toBe(p.radius);
      expect(a.heightDifference).toBe(p.heightDifference);
      expect(a.menuRoutine).toBe(p.menuRoutine);
      const effects = [a.effect1, a.effect2, a.effect3, a.effect4].map(
        (e) => [e.targets, e.effect, e.accuracy, e.modifier]
      );
      expect(effects).toEqual(p.effects);
      expect(FLAG_NAMES.map((n) => a.abilityFlags[n])).toEqual(p.flags);
      const raceAp = [
        [a.race1, a.apIndex1], [a.race2, a.apIndex2], [a.race3, a.apIndex3],
        [a.race4, a.apIndex4], [a.race5, a.apIndex5], [a.race6, a.apIndex6],
      ];
      expect(raceAp).toEqual(p.raceAp);
      expect(a._0x30).toBe(p._0x30);
      expect(a._0x31).toBe(p._0x31);
      expect(a.learnedAbilityId).toBe(p.learnedAbilityId);
      expect(a.learnedAbility).toBe(p.learnedAbility);

      const out = a.toBytes();
      expect(out.length).toBe(0x34);
      assertBytesEqual(out, fixture(`ability/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`ability/${c.name}.out.bin`, out);
    });
  }

  it('id 0 always serializes to zeroes even with nonzero fields (Java quirk)', () => {
    const a = new ActiveAbilityData(Bytes.wrap(fixture('ability/active_01.in.bin')), 0, 512);
    expect(a.mpCost).not.toBe(0);
    expect(Array.from(a.toBytes())).toEqual(new Array(0x34).fill(0));
  });

  it('learnableByBlueMagick follows learnedAbility on serialize (Java binding)', () => {
    const a = new ActiveAbilityData(Bytes.wrap(fixture('ability/active_09.in.bin')), 3, 512);
    expect(a.abilityFlags.learnableByBlueMagick).toBe(false);
    a.learnedAbility = 7;
    const out = a.toBytes();
    expect((out[0x20] & 0x10) !== 0).toBe(true);
    a.learnedAbility = 0;
    expect((a.toBytes()[0x20] & 0x10) !== 0).toBe(false);
  });
});

describe('SPAbilityData', () => {
  for (const c of manifest.sp) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const bytes = Bytes.wrap(fixture(`ability/${c.name}.in.bin`));
      const sp = new SPAbilityData(bytes, c.parsed.id);
      expect(bytes.position()).toBe(4);
      expect(sp.id).toBe(c.parsed.id);
      expect(sp.maxAP).toBe(c.parsed.maxAP);
      expect(sp.apIndex).toBe(c.parsed.apIndex);
      expect(sp.padding).toBe(c.parsed.padding);
      const out = sp.toBytes();
      assertBytesEqual(out, fixture(`ability/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`ability/${c.name}.out.bin`, out);
    });
  }
});

describe('AbilityAnimation', () => {
  for (const c of manifest.animations) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const a = c.default
        ? new AbilityAnimation()
        : new AbilityAnimation(Bytes.wrap(fixture(`ability/${c.name}.in.bin`)));
      for (const [key, value] of Object.entries(c.parsed)) {
        expect((a as unknown as Record<string, number>)[key], key).toBe(value);
      }
      const out = a.toBytes();
      expect(out.length).toBe(0x18);
      assertBytesEqual(out, fixture(`ability/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`ability/${c.name}.out.bin`, out);
    });
  }

  it('copyFrom copies every field', () => {
    const src = new AbilityAnimation(Bytes.wrap(fixture('ability/anim_03.in.bin')));
    const dst = new AbilityAnimation();
    dst.copyFrom(src);
    assertBytesEqual(dst.toBytes(), src.toBytes(), 'animation copyFrom');
  });
});

describe('AbilityEffect', () => {
  for (const c of manifest.effects) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const b = Bytes.wrap(fixture(`ability/${c.name}.in.bin`));
      const e = new AbilityEffect(
        Targets.fromInteger(b.get()), Effect.fromInteger(b.get()),
        Accuracy.fromInteger(b.get()), Modifier.fromInteger(b.get())
      );
      expect([e.targets, e.effect, e.accuracy, e.modifier]).toEqual(c.parsed);
      const out = e.toBytes();
      assertBytesEqual(out, fixture(`ability/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`ability/${c.name}.out.bin`, out);
    });
  }
});

describe('enum fromInteger maps vs Java', () => {
  const byteEnums: [string, { fromInteger(v: number): number }, number[]][] = [
    ['Targets', Targets, enumMaps.targets],
    ['Effect', Effect, enumMaps.effect],
    ['Accuracy', Accuracy, enumMaps.accuracy],
    ['Modifier', Modifier, enumMaps.modifier],
    ['SpecialRequirement', SpecialRequirement, enumMaps.specialRequirement],
    ['AbilityElement', AbilityElement, enumMaps.abilityElement],
    ['RangeAOEType', RangeAOEType, enumMaps.rangeAOEType],
    ['AbilityMenuRoutine', AbilityMenuRoutine, enumMaps.abilityMenuRoutine],
    ['Race', Race, enumMaps.race],
  ];
  for (const [name, def, map] of byteEnums) {
    it(`${name} matches Java for all 256 byte inputs (signed and unsigned)`, () => {
      for (let v = 0; v < 256; v++) {
        expect(def.fromInteger(v), `${name}(${v})`).toBe(map[v]);
        expect(def.fromInteger(v - 256), `${name}(${v - 256})`).toBe(map[v]);
      }
    });
  }

  it('WeaponRequirement matches Java for short inputs 0..0x2FF', () => {
    for (let v = 0; v <= 0x2ff; v++) {
      expect(WeaponRequirement.fromInteger(v), `WeaponRequirement(${v})`).toBe(enumMaps.weaponRequirement[v]);
    }
  });

  it('WeaponRequirement short quirk: values above 0xFF do not wrap to byte enums', () => {
    for (const [input, output] of enumMaps.weaponRequirementExtra) {
      expect(WeaponRequirement.fromInteger(input), `WeaponRequirement(${input})`).toBe(output);
      // signed-short form of the same input
      const signed = input > 0x7fff ? input - 0x10000 : input;
      expect(WeaponRequirement.fromInteger(signed), `WeaponRequirement(${signed})`).toBe(output);
    }
    expect(WeaponRequirement.fromInteger(0x0101)).toBe(0); // NOT KNIFE(1)
  });
});

const abilityIdFixture = join(fixturesDir, 'ability/abilityId.json');

// This fixture contains game-derived ability names and is intentionally not
// distributed in git. Without it, only these parity checks are skipped.
describe.skipIf(!existsSync(abilityIdFixture))('AbilityId data tables', () => {
  const data = fixtureJson<{ vanillaAbilityHelp: number[]; abilityNames: string[] }>('ability/abilityId.json');

  it('vanillaAbilityHelp matches Java exactly', () => {
    expect(AbilityId.vanillaAbilityHelp.length).toBe(822);
    expect(AbilityId.vanillaAbilityHelp).toEqual(data.vanillaAbilityHelp);
  });

  it('abilityNames matches Java exactly', () => {
    expect(AbilityId.abilityNames.length).toBe(891);
    expect(AbilityId.abilityNames).toEqual(data.abilityNames);
  });

  it('AbilityId record holds id/name and toString returns name', () => {
    const a = new AbilityId(0x123, 'Potion');
    expect(a.id).toBe(0x123);
    expect(a.name).toBe('Potion');
    expect(a.toString()).toBe('Potion');
  });
});