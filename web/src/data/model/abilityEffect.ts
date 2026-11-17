import { EnumDef } from "./enums";

// Local copy of the makeEnum factory from enums.ts (shared file must not be
// edited), extended with a mask parameter: Java byte enums compare (byte)value
// (mask 0xff) while WeaponRequirement compares (short)value (mask 0xffff).
export function makeEnum(entries: [string, number][], fallback: number, mask = 0xff): EnumDef {
  const values = entries.map(([name, value]) => ({ name, value }));
  const byValue = new Map(values.map((v) => [v.value, v]));
  return {
    values,
    fromInteger(v: number): number {
      const u = v & mask;
      return byValue.has(u) ? u : fallback;
    },
    name(v: number): string {
      return byValue.get(v & mask)?.name ?? `0x${(v & mask).toString(16).toUpperCase()}`;
    },
  };
}

// Java enums with dense 0..max values name unnamed slots _0xNN (two uppercase
// hex digits). null entries below reproduce those placeholder names.
export function denseEnum(names: (string | null)[], fallback = 0, mask = 0xff): EnumDef {
  return makeEnum(
    names.map((n, i) => [n ?? `_0x${i.toString(16).toUpperCase().padStart(2, "0")}`, i]),
    fallback,
    mask
  );
}

const targetNames: (string | null)[] = [
  "NONE", "CONTROLLABLE_MONSTER", "TRAP", null, "BLADED_USER",
  null, "ALLIES_FOES", null, "EMPTY_TILE", "RESURRECTED",
  "SELF", "ALLY", "ONLY_ALLIES", null, "FAWN_ASTRA",
  "ALL", "FEMALE_1", null, "LV_QUESTION_OTHER", "LV_QUESTION_SELF",
  "LV_3_OTHER", "LV_3_SELF", "LV_5_ALL", "LV_QUESTION_ALL", "FOE",
  "CRITICAL_FOE", "ALL_ALLIES", "ALL_FOES", "MALE_FOE", "MALE_ALLY",
  "FEMALE_FOE", "FEMALE_ALLY", "EXCEPT_SELF", "NON_UNDEAD", "FEMALE_2",
  "NON_MONSTER", "NON_DRAKE", "UNDEAD", "KOD_UNDEAD", "MONSTER",
  "CRITICAL_DRAKE", "NEUKHIA_STONE", "ALLIES_PHOENIX_ELPE", null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null,
];

export const Targets = denseEnum(targetNames, 0x00);

const effectNames: (string | null)[] = [
  "NONE", "HP_DAMAGE", null, "MP_DAMAGE", null,
  "KNOCKBACK", null, "TARGET", "SWITCH_HP_AND_MP", null,
  null, "HP_AND_MP_DAMAGE", "COUNTER", "KO", "REMOVE",
  "SUMMON", "STALK", "RECOVER_HP", "RECOVER_MP", "REMOVE_POISON",
  "REMOVE_STONE", "REMOVE_SILENCE", "REMOVE_BLIND", "REMOVE_TOAD", "REMOVE_OIL",
  "REMOVE_DISABLE_AND_IMMOBILIZE", null, "REMOVE_ALL_DEBUFFS", "REMOVE_MOST_DEBUFFS", "REMOVE_SOME_DEBUFFS",
  null, "REMOVE_ALL_BUFFS_AND_DEBUFFS", null, "RECOVER_ALL_HP_AND_MP_AND_REMOVE_ALL_DEBUFFS", null,
  "REMOVE_BUFFS", "RECOVER_1_HP", "RECOVER_10_PERCENT_HP", null, "RECOVER_ALL_HP_AND_MP",
  null, null, null, "SLEEP_AND_REMOVE_ALL_DEBUFFS", "DEFEND",
  "INVISIBLE", "CRITICAL_UP", null, "FOCUS", "SHELL",
  null, "PROTECT", null, "RERAISE", "REFLECT",
  "BERSERK", "ASTRA", "REGEN", "HASTE", null,
  null, "NO_DAMAGE", "RANDOM_BUFF", null, "POISON",
  "STONE", "SILENCE", "CONFUSE", "SLEEP", "BLIND",
  null, "TOAD", "OIL", "ADDLE", "SLOW",
  null, "IMMOBILIZE", "DISABLE", "CHARM", "DOOM",
  "STOP", null, "RANDOM_DEBUFF_1", null, null,
  null, "SLOW_PETRIFY_DISABLE_IMMOBILIZE_STOP", "RANDOM_DEBUFF_2", "PETRIFY_IMMOBILIZE_SLEEP", "ATTACK_UP",
  "DEFENSE_UP", "MAGICK_UP", "RESISTANCE_UP", "RESILIENCE_UP", null,
  null, "MOVE_UP", null, "EVASION_UP", null,
  "FORESIGHT", "BUCKSHOT", "SCOPE", "PRIME_CANNONEER", null,
  null, null, "ACCURACY_UP", "ATTACK_DOWN", "DEFENSE_DOWN",
  "RESISTANCE_DOWN", "MAGICK_DOWN", "RESILIENCE_DOWN", "SPEED_DOWN", "STATS_UP",
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, "DESTROY", "STEAL",
  "STEAL_SKY_PIRATE", null, "REVEAL_LOOT_AND_ITEMS", "TRANSFORM_INTO_ITEM", "GAUGE",
  "TRAP", "REVEAL_TRAPS", null, "DELAY_TURN", null,
  "QUICKEN", "NULLIFY_EVASION__1_TURN", null, "IMMOBILE_NEXT_TURN", "PRIME_FLINTLOCK",
  "REVEAL_UNITS", "EXTEND_BUFFS_AND_DEBUFFS", "COVER", null, null,
  null, null, "RANDOM_TELEPORT", "YOWIE_TELEPORT", "DEATH_WALL_TELEPORT",
  "ASK_FOR_ELIXIR", "KILL_SELF", null, null, "ATTACK_AGAIN",
  null, null, "RESTORE_NEUKHIA_WISP_HP", "RELIGHT_NEUKHIA_STONES",
];

export const Effect = denseEnum(effectNames, 0x00);

const accuracyNames: (string | null)[] = [
  "NONE", "NORMAL", "DOUBLE_NORMAL", "HALF_NORMAL", null,
  null, "QUARTER_NORMAL", "NORMAL_DEBUFF", null, "PERFECT",
  "ON_BUFFED_DEBUFFED", "PERFECT_NORMAL", "PERFECT_ON_HIT", null, "PERFECT_DEBUFF",
  "NORMAL_DEBUFF_ON_HIT", "HALF_DEBUFF_ON_HIT", null, null, null,
  null, null, null, "QUARTER_DEBUFF_ON_HIT", null,
  "PERFECT_AT_1_HP", "STEAL_ON_ITEM_HOLDER", "STEAL_ON_LOOT_HOLDER", "STEAL_ON_ACCESSORY_HOLDER", "STEAL_ON_SMASH_GAUGE_HOLDER",
  "STEAL_ON_GIL_HOLDER", "PERFECT_ON_HIT_AND_ITEM1", "PERFECT_ON_HIT_AND_GIL_HOLDER", "PERFECT_ON_HIT_AND_ARMOR_HOLDER", "PERFECT_ON_HIT_AND_LOOT_GIL_ITEM_HOLDER",
  "PERFECT_ON_HIT_AND_ITEM2", "THROW", "PERFECT_ON_EYE_CONTACT", null, "DESTRUCTION",
  null, null, null, "SUMMON", null,
  "REMOVE", null, "CONTROL", null, null,
  null, null, null, null, null,
  null, "PERFECT_ON_KILL",
];

export const Accuracy = denseEnum(accuracyNames, 0x00);

const modifierNames: (string | null)[] = [
  "NONE", "NORMAL_DAMAGE", "DOUBLE_DAMAGE", "TRIPLE_DAMAGE", "HALF_DAMAGE",
  "QUARTER_DAMAGE", "DRAIN_DAMAGE", "BYPASS_DEFENSE", null, null,
  "THROWN_ITEM_DAMAGE", null, null, "TOTAL_USER_DEBUFFS", "BACK_SIDE_ATTACK",
  "MAX_HP_MINUS_CURRENT_HP", null, "TOTAL_FEMALE_ALLIES", null, "UNDEAD_DAMAGE",
  null, "FIXED_BONUS_ONLY", null, "MAX_HP", "MAX_MP",
  "HALF_MAX_HP", "QUARTER_MAX_HP", "THREE_QUARTER_CURRENT_HP", "HALF_CURRENT_HP", "CURRENT_HP",
  "CURRENT_USER_HP", "_10_PERCENT_CURRENT_HP", "_20_PERCENT_CURRENT_HP", "_90_PERCENT_CURRENT_HP", null,
  null, null, null, null, null,
  null, "MAX_USER_HP", "LIFE_BOND", "TOTAL_KILLS_X10", null,
  null, "MAX_HP_MINUS_1", null, "_999", "NORMAL_DAMAGE_DEALT",
  "NORMAL_DAMAGE_DEALT_DRAW_IN", "QUARTER_DAMAGE_DEALT", null, null, "PREVIOUS_HP",
  "PREVIOUS_MP", "TOTAL_TARGET_DEBUFFS", "KNOT_OF_RUST", null, "DARK_MATTER",
  null, "QUARTER_MAX_HP_MINUS_CURRENT_HP", "_40", null, null,
  null, "GIL", null, null, "TOTAL_THEFTS",
  "STEAL_SMASH_GAUGE", null, "STEAL_ANY_LOOT", "STEAL_LV_1_LOOT", "STEAL_LV_2_LOOT",
  "STEAL_LV_3_LOOT", "STEAL_LV_4_LOOT", "DESTROY_WEAPON", "DESTROY_SHIELD", "DESTROY_HELMET",
  "DESTROY_ARMOUR", "DESTROY_WEAPON_SHIELD_ARMOUR", "STEAL_ACCESSORY", "STEAL_ITEMS", "STEAL_GIL",
  "STEAL_2X_GIL", "STEAL_ARMOUR", "HP_TRAP", "SILENCE_TRAP", "MP_TRAP",
  "CHARM_TRAP", null, null, null, null,
  null, "FIXED", null, null, "STEAL_LOOT_GIL_ITEMS",
];

export const Modifier = denseEnum(modifierNames, 0x00);

// Pure record port of AbilityEffect: four enum values stored as numbers.
export class AbilityEffect {
  targets: number;
  effect: number;
  accuracy: number;
  modifier: number;

  constructor(targets: number, effect: number, accuracy: number, modifier: number) {
    this.targets = targets;
    this.effect = effect;
    this.accuracy = accuracy;
    this.modifier = modifier;
  }

  copyFrom(source: AbilityEffect): void {
    this.targets = source.targets;
    this.effect = source.effect;
    this.accuracy = source.accuracy;
    this.modifier = source.modifier;
  }

  toBytes(): Uint8Array {
    return new Uint8Array([this.targets, this.effect, this.accuracy, this.modifier]);
  }
}
