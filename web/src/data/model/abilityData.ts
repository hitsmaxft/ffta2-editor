import { Bytes, toUnsignedShort } from '../../core/binary';
import { Flags } from './flags';
import { Race, AbilityElement, RangeAOEType, AbilityMenuRoutine } from './enums';
import { AbilityEffect, Targets, Effect, Accuracy, Modifier } from './abilityEffect';
import { SpecialRequirement, WeaponRequirement } from './abilityRequirements';
import { AbilityId } from './abilityId';

// Pure record ports of ActiveAbilityData / SPAbilityData. Reference fields store
// raw numeric indices; name/description resolution happens in the controller.
//
// abilityHelp resolution mirrors the Java constructor literally and therefore
// needs App.abilityHelpText.size(); the controller passes it as
// abilityHelpTextCount (0 when no help table is loaded).
//
// learnedAbility stores the raw unsigned ability-list index (Java resolves the
// object in AbilityController.loadAbilities; abilityList[u].id === u, so the
// index alone reproduces toBytes). The learnableByBlueMagick flag is a live
// binding in Java (learnedAbility != null && id != 0); here it is recomputed
// from learnedAbility whenever flags are serialized.

const ABILITY_FLAG_NAMES = [
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

export type AbilityFlagName = (typeof ABILITY_FLAG_NAMES)[number];

export class AbilityFlags {
  flags: Flags;
  masteredByDefault = false;
  targetSelf = false;
  invertedOnUndead = false;
  isMagickal = false;
  learnableByBlueMagick = false;
  counterable = false;
  bypassReactions = false;
  reflectable = false;
  usableWithMagickFrenzyAndDoublecast = false;
  ignoreSilence = false;
  usableByAI = false;
  activatesBonecrusher_Maybe = false;
  magickCounterable = false;
  throwsItem = false;
  activatesAbsorbMP = false;
  caughtByStickyFingers = false;
  usableWithMix = false;
  mirrorItem = false;
  antiCounter = false;
  canTargetEmptySquare = false;
  spawnsObject = false;
  attackWithSecondWeapon = false;
  isItem = false;
  bit_23 = false;
  AICheckDamage_Maybe = false;
  AICheckHealingBuff_Maybe = false;
  AICheckDebuff_Maybe = false;
  elpe_UnburdenSoul = false;
  back_Side_DamageModifier = false;
  counterable_Maybe = false;
  bit_30 = false;
  bit_31 = false;

  // Java has AbilityFlags() (length 4, all false) and AbilityFlags(byte[]).
  constructor(source: Uint8Array | number = 4) {
    this.flags = new Flags(source);
    if (typeof source !== 'number') {
      for (let i = 0; i < ABILITY_FLAG_NAMES.length && i < this.flags.bits.length; i++) {
        this[ABILITY_FLAG_NAMES[i]] = this.flags.get(i);
      }
    }
  }

  copyFrom(source: AbilityFlags): void {
    for (const name of ABILITY_FLAG_NAMES) {
      // Java skips learnableByBlueMagick here because it is bound.
      if (name === 'learnableByBlueMagick') continue;
      this[name] = source[name];
    }
  }

  toBytes(): Uint8Array {
    for (let i = 0; i < ABILITY_FLAG_NAMES.length; i++) {
      this.flags.set(i, this[ABILITY_FLAG_NAMES[i]]);
    }
    // Java pads BitSet.toByteArray() (trailing zero bytes trimmed) back to the
    // fixed length; Flags.toBytes() always emits the fixed length, and all 32
    // bits are explicitly controlled, so the output is identical.
    return this.flags.toBytes();
  }
}

export class ActiveAbilityData {
  id: number;
  abilityHelp = 0;
  abilityElement = 0;
  mpCost = 0;
  _0x4 = 0;
  _0x5 = 0;
  power = 0;
  weaponRequirement = 0;
  specialRequirement = 0;
  rangeAOEType = 0;
  range = 0;
  radius = 0;
  heightDifference = 0;
  menuRoutine = 0;
  effect1: AbilityEffect;
  effect2: AbilityEffect;
  effect3: AbilityEffect;
  effect4: AbilityEffect;
  abilityFlags: AbilityFlags;
  race1 = 0;
  apIndex1 = 0;
  race2 = 0;
  apIndex2 = 0;
  race3 = 0;
  apIndex3 = 0;
  race4 = 0;
  apIndex4 = 0;
  race5 = 0;
  apIndex5 = 0;
  race6 = 0;
  apIndex6 = 0;
  _0x30 = 0;
  _0x31 = 0;
  learnedAbilityId = 0;
  learnedAbility = 0;

  constructor(bytes: Bytes, id: number, abilityHelpTextCount = 0) {
    this.id = id;
    const abilityHelpId = bytes.getU16() - 0xb798;
    if (0 <= abilityHelpId && abilityHelpId < abilityHelpTextCount) {
      this.abilityHelp = abilityHelpId;
    } else if (0 <= this.id && this.id < AbilityId.vanillaAbilityHelp.length) {
      this.abilityHelp = AbilityId.vanillaAbilityHelp[this.id];
    } else {
      this.abilityHelp = 0;
    }
    this.abilityElement = AbilityElement.fromInteger(bytes.get());
    this.mpCost = bytes.get();
    this._0x4 = bytes.get();
    this._0x5 = bytes.get();
    this.power = bytes.getShort();
    this.weaponRequirement = WeaponRequirement.fromInteger(bytes.getShort());
    this.specialRequirement = SpecialRequirement.fromInteger(bytes.get());
    this.rangeAOEType = RangeAOEType.fromInteger(bytes.get());
    this.range = bytes.get();
    this.radius = bytes.get();
    this.heightDifference = bytes.get();
    this.menuRoutine = AbilityMenuRoutine.fromInteger(bytes.get());
    this.effect1 = new AbilityEffect(Targets.fromInteger(bytes.get()), Effect.fromInteger(bytes.get()), Accuracy.fromInteger(bytes.get()), Modifier.fromInteger(bytes.get()));
    this.effect2 = new AbilityEffect(Targets.fromInteger(bytes.get()), Effect.fromInteger(bytes.get()), Accuracy.fromInteger(bytes.get()), Modifier.fromInteger(bytes.get()));
    this.effect3 = new AbilityEffect(Targets.fromInteger(bytes.get()), Effect.fromInteger(bytes.get()), Accuracy.fromInteger(bytes.get()), Modifier.fromInteger(bytes.get()));
    this.effect4 = new AbilityEffect(Targets.fromInteger(bytes.get()), Effect.fromInteger(bytes.get()), Accuracy.fromInteger(bytes.get()), Modifier.fromInteger(bytes.get()));
    this.abilityFlags = new AbilityFlags(bytes.getBytesAt(bytes.position(), 4));
    bytes.position(bytes.position() + 4);
    this.race1 = Race.fromInteger(bytes.get());
    this.apIndex1 = bytes.get();
    this.race2 = Race.fromInteger(bytes.get());
    this.apIndex2 = bytes.get();
    this.race3 = Race.fromInteger(bytes.get());
    this.apIndex3 = bytes.get();
    this.race4 = Race.fromInteger(bytes.get());
    this.apIndex4 = bytes.get();
    this.race5 = Race.fromInteger(bytes.get());
    this.apIndex5 = bytes.get();
    this.race6 = Race.fromInteger(bytes.get());
    this.apIndex6 = bytes.get();
    this._0x30 = bytes.get();
    this._0x31 = bytes.get();
    this.learnedAbilityId = bytes.getShort();
    // Java leaves learnedAbility null until the controller resolves it against
    // App.abilityList; the list index equals the ability id, so store the index.
    this.learnedAbility = toUnsignedShort(this.learnedAbilityId);
    // Initial evaluation of Java's learnableByBlueMagick binding.
    this.abilityFlags.learnableByBlueMagick = this.learnedAbility !== 0;
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x34);
    // Java quirk: ability 0 serializes as an all-zero record.
    if (this.id === 0) return b.toUint8Array();

    b.putShort(this.abilityHelp + 0xb798);
    b.putU8(this.abilityElement);
    b.putU8(this.mpCost);
    b.putU8(this._0x4);
    b.putU8(this._0x5);
    b.putShort(this.power);
    b.putShort(this.weaponRequirement);
    b.putU8(this.specialRequirement);
    b.putU8(this.rangeAOEType);
    b.putU8(this.range);
    b.putU8(this.radius);
    b.putU8(this.heightDifference);
    b.putU8(this.menuRoutine);
    b.putBytes(this.effect1.toBytes());
    b.putBytes(this.effect2.toBytes());
    b.putBytes(this.effect3.toBytes());
    b.putBytes(this.effect4.toBytes());
    // Java's learnableByBlueMagick is bound to learnedAbility != null && id != 0.
    this.abilityFlags.learnableByBlueMagick = this.learnedAbility !== 0;
    b.putBytes(this.abilityFlags.toBytes());
    b.putU8(this.race1);
    b.putU8(this.apIndex1);
    b.putU8(this.race2);
    b.putU8(this.apIndex2);
    b.putU8(this.race3);
    b.putU8(this.apIndex3);
    b.putU8(this.race4);
    b.putU8(this.apIndex4);
    b.putU8(this.race5);
    b.putU8(this.apIndex5);
    b.putU8(this.race6);
    b.putU8(this.apIndex6);
    b.putU8(this._0x30);
    b.putU8(this._0x31);
    b.putShort(this.learnedAbility);
    return b.toUint8Array();
  }
}

export class SPAbilityData {
  id: number;
  maxAP = 0;
  apIndex = 0;
  padding = 0;

  constructor(bytes: Bytes, id: number) {
    this.id = id;
    this.maxAP = bytes.get();
    this.apIndex = bytes.get();
    this.padding = bytes.getShort();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x04);
    b.putU8(this.maxAP);
    b.putU8(this.apIndex);
    b.putShort(this.padding);
    return b.toUint8Array();
  }
}