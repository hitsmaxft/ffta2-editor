// Game enums. Java models store the enum object and serialize `.value`; here we
// store the numeric value. fromInteger replicates Java's unknown->fallback mapping.

export interface EnumDef {
  values: { name: string; value: number }[];
  fromInteger(v: number): number;
  name(v: number): string;
}

function makeEnum(entries: [string, number][], fallback: number): EnumDef {
  const values = entries.map(([name, value]) => ({ name, value }));
  const byValue = new Map(values.map((v) => [v.value, v]));
  return {
    values,
    fromInteger(v: number): number {
      const u = v & 0xff;
      return byValue.has(u) ? u : fallback;
    },
    name(v: number): string {
      return byValue.get(v & 0xff)?.name ?? `0x${(v & 0xff).toString(16).toUpperCase()}`;
    },
  };
}

export const JobGender = makeEnum(
  [['MALE', 0x00], ['FEMALE', 0x01], ['UNKNOWN', 0x02]],
  0x00
);

export const Race = makeEnum(
  [
    ['NONE', 0x00], ['HUME', 0x01], ['BANGAA', 0x02], ['NU_MOU', 0x03], ['VIERA', 0x04],
    ['MOOGLE', 0x05], ['SEEQ', 0x06], ['GRIA', 0x07], ['_0x08', 0x08], ['_0x09', 0x09],
    ['BAKNAMY', 0x0a], ['SPRITE', 0x0b], ['LAMIA', 0x0c], ['WOLF', 0x0d], ['DREAMHARE', 0x0e],
    ['WEREWOLF', 0x0f], ['ANTLION', 0x10], ['SHELLING', 0x11], ['MALBORO', 0x12], ['TOMATO', 0x13],
    ['COCKATRICE', 0x14], ['CHOCOBO', 0x15], ['FLAN', 0x16], ['BOMB', 0x17], ['ZOMBIE', 0x18],
    ['GHOST', 0x19], ['DEATHSCYTHE', 0x1a], ['FLOATING_EYE', 0x1b], ['AHRIMAN', 0x1c], ['TONBERRY', 0x1d],
    ['HEADLESS', 0x1e], ['BEHEMOTH', 0x1f], ['MAGICK_POT', 0x20], ['DRAKE', 0x21], ['MIMIC', 0x22],
    ['_0x23', 0x23], ['YOWIE', 0x24], ['RAFFLESIA', 0x25], ['DEMON_WALL', 0x26], ['NEUKHIA', 0x27],
    ['UPSILON', 0x28],
  ],
  0x00
);

export const EquipmentType = makeEnum(
  [
    ['NONE', 0x00], ['KNIFE', 0x01], ['SWORD', 0x02], ['BLADE', 0x03], ['SABER', 0x04],
    ['KNIGHTSWORD', 0x05], ['RAPIER', 0x06], ['GREATSWORD', 0x07], ['BROADSWORD', 0x08], ['KATANA', 0x09],
    ['SPEAR', 0x0a], ['ROD', 0x0b], ['STAFF', 0x0c], ['POLE', 0x0d], ['KNUCKLES', 0x0e],
    ['BOW', 0x0f], ['GREATBOW', 0x10], ['GUN', 0x11], ['INSTRUMENT', 0x12], ['HAND_CANNON', 0x13],
    ['GRENADE', 0x14], ['AXE', 0x15], ['HAMMER', 0x16], ['MACE', 0x17], ['CARD', 0x18],
    ['BOOK', 0x19], ['SHIELD', 0x1a], ['HELM', 0x1b], ['HAIR_ACCESSORY', 0x1c], ['HAT', 0x1d],
    ['HEAVY_ARMOR', 0x1e], ['LIGHT_ARMOR', 0x1f], ['ROBE', 0x20], ['BOOTS', 0x21], ['GLOVES', 0x22],
    ['ACCESSORY', 0x23],
  ],
  0x00
);

export const EquipmentLocation = makeEnum(
  [['NONE', 0x00], ['HANDS', 0x01], ['HEAD', 0x02], ['ARMOR', 0x03], ['BOOTS', 0x04], ['GLOVES', 0x05], ['ACCESSORY', 0x06]],
  0x00
);

export const LootCategory = makeEnum(
  [['NONE', 0], ['MAGICITE', 1], ['METALS', 2], ['SKINS', 3], ['BONES', 4], ['FLORA', 5], ['TIMBER', 6], ['PHILTRES', 7], ['CLOTH', 8]],
  0
);

export const LootRank = makeEnum(
  [['ZERO_STAR', 2], ['ONE_STAR', 3], ['TWO_STAR', 4], ['THREE_STAR', 5]],
  2
);

export const JobMoveType = makeEnum(
  [['NONE', 0x00], ['GROUNDED', 0x01], ['FLYING', 0x02], ['TELEPORT', 0x03]],
  0x00
);

export const JobMovablePlaces = makeEnum(
  [['NONE', 0x00], ['CANNOT_ENTER_WATER', 0x01], ['CAN_STAND_IN_WATER', 0x02], ['CAN_STAND_ON_WATER', 0x03], ['CAN_FLOAT_OVER_WATER', 0x04], ['DUMMY', 0x05]],
  0x01
);

export const JobElementalResistance = makeEnum(
  [['WEAK', 0x00], ['NEUTRAL', 0x01], ['HALF', 0x02], ['NULL', 0x03], ['ABSORB', 0x04]],
  0x01
);

export const AbilityElement = makeEnum(
  [['NONE', 0x00], ['FIRE', 0x01], ['WIND', 0x02], ['EARTH', 0x03], ['WATER', 0x04], ['ICE', 0x05], ['THUNDER', 0x06], ['HOLY', 0x07], ['DARK', 0x08]],
  0x00
);

export const RangeAOEType = makeEnum(
  [
    ['NONE', 0x00], ['INFINITE_LINE', 0x01], ['LINE', 0x02], ['_0x03', 0x03], ['SURROUNDING_CROSS', 0x04],
    ['ALL_UNITS', 0x05], ['CONE', 0x06], ['WEAPON', 0x07], ['SELF', 0x08], ['DEMON_WALL_LINE', 0x09],
    ['NEUKHIA_POD_LINE', 0x0a], ['NEUKHIA_STONE_CROSS', 0x0b], ['NEUKHIA_WISPS', 0x0c], ['YOWIE_ADJACENT', 0x0d],
    ['RAFFLESIA_ADJACENT', 0x0e], ['RAFFLESIA_CLOUD', 0x0f], ['HUGE_FRONT', 0x10], ['WIDE_LINE', 0x11],
    ['NEUKHIA_BLUE_STONES', 0x12], ['SUMMON', 0x13],
  ],
  0x00
);

export const AbilityMenuRoutine = makeEnum(
  [['NONE', 0x0], ['REVIVE', 0x1], ['MAGICK_FRENZY', 0x2], ['NATURAL_SELECTION', 0x3], ['MIX_MAYBE', 0x4], ['_0x5', 0x5], ['THROW_ITEM', 0x6], ['GIL_TOSS', 0x7], ['MIRROR_ITEM', 0x8], ['DOUBLECAST', 0x9], ['CONTROL_MONSTER', 0xa]],
  0x0
);

export const FFTA2Month = makeEnum(
  [['NONE', 0], ['BLACKFROST', 1], ['SKYFROST', 2], ['GREENFIRE', 3], ['BLOODFIRE', 4], ['ROSEFIRE', 5], ['COPPERSUN', 6], ['GOLDSUN', 7], ['SILVERSUN', 8], ['ASHLEAF', 9], ['MISTLEAF', 10], ['EMBERLEAF', 11], ['PLUMFROST', 12]],
  0
);