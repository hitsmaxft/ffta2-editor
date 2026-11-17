import { Bytes } from '../../core/binary';
import { Flags } from './flags';
import { EquipmentType, EquipmentLocation, AbilityElement, LootCategory, LootRank } from './enums';

// Pure record ports of org.ruru.ffta2editor.model.item.*. Reference fields store
// raw numeric indices (App.*.get(i).id == i in the controllers); name/description
// resolution and list-size defaults happen in the controller layer (RomData).
//
// PatchesController.patchedSignedEquipmentStats only swaps UI byte converters and
// patches ARM9 code; it does NOT change EquipmentData's record layout, so no
// patch boolean is needed here. Signed stat bytes are preserved as signed numbers.

// Java ItemData is abstract with name/description StringProperties resolved from
// App.itemNames/itemDescriptions; those belong to the controller layer.
export abstract class ItemData {
  id: number;

  constructor(id: number) {
    this.id = id;
  }

  abstract toBytes(): Uint8Array;
}

export class EquipmentData extends ItemData {
  equipmentType = 0;
  notName = 0;
  element = 0;
  range = 0;
  equipmentLocation = 0;
  palette = 0;
  // Nullable sprite index: signed short, -1 (null sprite) stays -1.
  sprite = -1;
  attackEffect = 0;
  hitEffect = 0;
  hitSound = 0;
  buy = 0;
  sell = 0;
  bonusEffect = 0; // table 0x12: offset 0x75
  attack = 0;
  defense = 0;
  magick = 0;
  resistance = 0;
  speed = 0;
  evasion = 0;
  move = 0;
  jump = 0;
  jobGroup1 = 0;
  jobGroup2 = 0;
  jobGroup3 = 0;
  ability1 = 0;
  ability2 = 0;
  ability3 = 0;
  // Java PropertyFlags: 32 named booleans over a 4-byte BitSet.
  // Bit order: 0 isTwoHanded, 1 isDualWieldable, 2 isMeleeOneHanded, 3 isMeleeTwoHanded,
  // 4 isSellable, 5 isLimitedStock, 6 startsInShop, 7 isBow, 8 isBladed, 9 isPiercing,
  // 10 isBlunt, 11 isRanged, 12 isInstrument_Book, 13 isFemaleOnly, 14..31 unused.
  propertyFlags: Flags;

  constructor(bytes: Bytes, id: number) {
    super(id);
    // Java reads a signed short then EquipmentType.fromInteger(short) compares
    // (byte)value, i.e. only the low byte matters (unknown -> NONE).
    this.equipmentType = EquipmentType.fromInteger(bytes.getShort());
    this.notName = bytes.getShort();
    this.element = AbilityElement.fromInteger(bytes.get());
    this.range = bytes.get();
    this.equipmentLocation = EquipmentLocation.fromInteger(bytes.get());
    this.palette = bytes.get();
    this.sprite = bytes.getShort();
    this.attackEffect = bytes.getShort();
    this.hitEffect = bytes.get();
    this.hitSound = bytes.get();
    this.buy = bytes.getShort();
    this.sell = bytes.getShort();
    this.bonusEffect = bytes.get();
    this.attack = bytes.get();
    this.defense = bytes.get();
    this.magick = bytes.get();
    this.resistance = bytes.get();
    this.speed = bytes.get();
    this.evasion = bytes.get();
    this.move = bytes.get();
    this.jump = bytes.get();
    this.jobGroup1 = bytes.getU8();
    this.jobGroup2 = bytes.getU8();
    this.jobGroup3 = bytes.getU8();
    this.ability1 = bytes.getU16();
    this.ability2 = bytes.getU16();
    this.ability3 = bytes.getU16();
    this.propertyFlags = new Flags(bytes.getBytesAt(bytes.position(), 4));
    bytes.position(bytes.position() + 4);
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x28);
    // Java writes the enum's byte value as a short: an input short like 0x0123
    // parses to ACCESSORY (0x23) and serializes back as 0x0023, NOT byte-identical.
    b.putShort(this.equipmentType);
    b.putShort(this.notName);
    b.putU8(this.element);
    b.put(this.range);
    b.putU8(this.equipmentLocation);
    b.put(this.palette);
    b.putShort(this.sprite);
    b.putShort(this.attackEffect);
    b.put(this.hitEffect);
    b.put(this.hitSound);
    b.putShort(this.buy);
    b.putShort(this.sell);
    b.put(this.bonusEffect);
    b.put(this.attack);
    b.put(this.defense);
    b.put(this.magick);
    b.put(this.resistance);
    b.put(this.speed);
    b.put(this.evasion);
    b.put(this.move);
    b.put(this.jump);
    b.putU8(this.jobGroup1); // Java (byte)jobGroup.id: low 8 bits
    b.putU8(this.jobGroup2);
    b.putU8(this.jobGroup3);
    b.putShort(this.ability1); // Java (short)ability.id: low 16 bits
    b.putShort(this.ability2);
    b.putShort(this.ability3);
    b.putBytes(this.propertyFlags.toBytes());
    return b.toUint8Array();
  }
}

export class ConsumableData extends ItemData {
  buy = 0;
  sell = 0;
  _0x4 = 0;
  storyProgress = 0;

  constructor(bytes: Bytes, id: number) {
    super(id);
    this.buy = bytes.getShort();
    this.sell = bytes.getShort();
    this._0x4 = bytes.getShort();
    this.storyProgress = bytes.getShort();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x8);
    b.putShort(this.buy);
    b.putShort(this.sell);
    b.putShort(this._0x4);
    b.putShort(this.storyProgress);
    return b.toUint8Array();
  }
}

export class LootData extends ItemData {
  buy = 0;
  sell = 0;
  category = 0;
  rank = 0;
  _0x6 = 0;

  constructor(bytes: Bytes, id: number) {
    super(id);
    this.buy = bytes.getShort();
    this.sell = bytes.getShort();
    this.category = LootCategory.fromInteger(bytes.getU8());
    // Quirk: LootRank has no 0/1 entries; input rank 0 or 1 falls back to
    // ZERO_STAR (2), so parse -> toBytes is not byte-identical for those inputs.
    this.rank = LootRank.fromInteger(bytes.getU8());
    this._0x6 = bytes.getShort();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x8);
    b.putShort(this.buy);
    b.putShort(this.sell);
    b.putU8(this.category);
    b.putU8(this.rank);
    b.putShort(this._0x6);
    return b.toUint8Array();
  }
}

export class ItemTable {
  id: number;
  item1 = 0;
  item2 = 0;
  item3 = 0;
  item4 = 0;

  constructor(bytes: Bytes, id: number) {
    this.id = id;
    this.item1 = bytes.getShort();
    this.item2 = bytes.getShort();
    this.item3 = bytes.getShort();
    this.item4 = bytes.getShort();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x8);
    b.putShort(this.item1);
    b.putShort(this.item2);
    b.putShort(this.item3);
    b.putShort(this.item4);
    return b.toUint8Array();
  }
}

export class LawBonus {
  id: number;
  item1 = 0;
  item2 = 0;
  item3 = 0;
  padding = 0;

  constructor(bytes: Bytes, id: number) {
    this.id = id;
    this.item1 = bytes.getU16();
    this.item2 = bytes.getU16();
    this.item3 = bytes.getU16();
    this.padding = bytes.getU16();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x8);
    b.putShort(this.item1); // Java (short)item.id: low 16 bits
    b.putShort(this.item2);
    b.putShort(this.item3);
    b.putShort(this.padding);
    return b.toUint8Array();
  }
}