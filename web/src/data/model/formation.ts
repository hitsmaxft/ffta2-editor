import { Bytes, toSignedByte } from '../../core/binary';

// Pure record ports of model/formation/*.java. Reference fields store raw
// numeric indices; name resolution and list-size defaults happen in the
// controller layer (RomData). Signed byte/short fields match Java ByteBuffer.

export class FormationHeader {
  law = 0;
  numUnits = 0;
  _0x02 = 0;
  partyLimit = 0;
  _0x04 = 0;
  _0x05 = 0;
  _0x06 = 0;
  _0x07 = 0;
  _0x08 = 0;
  _0x09 = 0;
  _0x0a = 0;
  _0x0b = 0;
  _0x0c = 0;
  _0x0d = 0;
  _0x0e = 0;
  _0x0f = 0;
  _0x10 = 0;
  _0x11 = 0;
  _0x12 = 0;
  _0x13 = 0;
  _0x14 = 0;
  _0x15 = 0;
  _0x16 = 0;
  _0x17 = 0;
  _0x18 = 0;
  _0x19 = 0;
  _0x1a = 0;
  _0x1b = 0;
  _0x1c = 0;
  _0x1d = 0;
  _0x1e = 0;
  _0x1f = 0;
  _0x20 = 0;
  _0x21 = 0;
  _0x22 = 0;
  _0x23 = 0;
  // Sets of 4 bytes. Idk what they mean.
  _0x24 = 0;
  _0x25 = 0;
  _0x26 = 0;
  _0x27 = 0;
  _0x28 = 0;
  _0x29 = 0;
  _0x2a = 0;
  _0x2b = 0;
  _0x2c = 0;
  _0x2d = 0;
  _0x2e = 0;
  _0x2f = 0;
  _0x30 = 0;
  _0x31 = 0;
  _0x32 = 0;
  _0x33 = 0;
  _0x34 = 0;
  _0x35 = 0;
  _0x36 = 0;
  _0x37 = 0;
  _0x38 = 0;
  _0x39 = 0;
  _0x3a = 0;
  _0x3b = 0;
  _0x3c = 0;
  _0x3d = 0;
  _0x3e = 0;
  _0x3f = 0;
  _0x40 = 0;
  _0x41 = 0;
  _0x42 = 0;
  _0x43 = 0;

  constructor(bytes: Bytes) {
    this.law = bytes.get();
    this.numUnits = bytes.get();
    this._0x02 = bytes.get();
    this.partyLimit = bytes.get();
    this._0x04 = bytes.get();
    this._0x05 = bytes.get();
    this._0x06 = bytes.get();
    this._0x07 = bytes.get();
    this._0x08 = bytes.get();
    this._0x09 = bytes.get();
    this._0x0a = bytes.get();
    this._0x0b = bytes.get();
    this._0x0c = bytes.get();
    this._0x0d = bytes.get();
    this._0x0e = bytes.get();
    this._0x0f = bytes.get();
    this._0x10 = bytes.get();
    this._0x11 = bytes.get();
    this._0x12 = bytes.get();
    this._0x13 = bytes.get();
    this._0x14 = bytes.get();
    this._0x15 = bytes.get();
    this._0x16 = bytes.get();
    this._0x17 = bytes.get();
    this._0x18 = bytes.get();
    this._0x19 = bytes.get();
    this._0x1a = bytes.get();
    this._0x1b = bytes.get();
    this._0x1c = bytes.get();
    this._0x1d = bytes.get();
    this._0x1e = bytes.get();
    this._0x1f = bytes.get();
    this._0x20 = bytes.get();
    this._0x21 = bytes.get();
    this._0x22 = bytes.get();
    this._0x23 = bytes.get();
    this._0x24 = bytes.get();
    this._0x25 = bytes.get();
    this._0x26 = bytes.get();
    this._0x27 = bytes.get();
    this._0x28 = bytes.get();
    this._0x29 = bytes.get();
    this._0x2a = bytes.get();
    this._0x2b = bytes.get();
    this._0x2c = bytes.get();
    this._0x2d = bytes.get();
    this._0x2e = bytes.get();
    this._0x2f = bytes.get();
    this._0x30 = bytes.get();
    this._0x31 = bytes.get();
    this._0x32 = bytes.get();
    this._0x33 = bytes.get();
    this._0x34 = bytes.get();
    this._0x35 = bytes.get();
    this._0x36 = bytes.get();
    this._0x37 = bytes.get();
    this._0x38 = bytes.get();
    this._0x39 = bytes.get();
    this._0x3a = bytes.get();
    this._0x3b = bytes.get();
    this._0x3c = bytes.get();
    this._0x3d = bytes.get();
    this._0x3e = bytes.get();
    this._0x3f = bytes.get();
    this._0x40 = bytes.get();
    this._0x41 = bytes.get();
    this._0x42 = bytes.get();
    this._0x43 = bytes.get();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x44);
    b.put(this.law);
    b.put(this.numUnits);
    b.put(this._0x02);
    b.put(this.partyLimit);
    b.put(this._0x04);
    b.put(this._0x05);
    b.put(this._0x06);
    b.put(this._0x07);
    b.put(this._0x08);
    b.put(this._0x09);
    b.put(this._0x0a);
    b.put(this._0x0b);
    b.put(this._0x0c);
    b.put(this._0x0d);
    b.put(this._0x0e);
    b.put(this._0x0f);
    b.put(this._0x10);
    b.put(this._0x11);
    b.put(this._0x12);
    b.put(this._0x13);
    b.put(this._0x14);
    b.put(this._0x15);
    b.put(this._0x16);
    b.put(this._0x17);
    b.put(this._0x18);
    b.put(this._0x19);
    b.put(this._0x1a);
    b.put(this._0x1b);
    b.put(this._0x1c);
    b.put(this._0x1d);
    b.put(this._0x1e);
    b.put(this._0x1f);
    b.put(this._0x20);
    b.put(this._0x21);
    b.put(this._0x22);
    b.put(this._0x23);
    b.put(this._0x24);
    b.put(this._0x25);
    b.put(this._0x26);
    b.put(this._0x27);
    b.put(this._0x28);
    b.put(this._0x29);
    b.put(this._0x2a);
    b.put(this._0x2b);
    b.put(this._0x2c);
    b.put(this._0x2d);
    b.put(this._0x2e);
    b.put(this._0x2f);
    b.put(this._0x30);
    b.put(this._0x31);
    b.put(this._0x32);
    b.put(this._0x33);
    b.put(this._0x34);
    b.put(this._0x35);
    b.put(this._0x36);
    b.put(this._0x37);
    b.put(this._0x38);
    b.put(this._0x39);
    b.put(this._0x3a);
    b.put(this._0x3b);
    b.put(this._0x3c);
    b.put(this._0x3d);
    b.put(this._0x3e);
    b.put(this._0x3f);
    b.put(this._0x40);
    b.put(this._0x41);
    b.put(this._0x42);
    b.put(this._0x43);
    return b.toUint8Array();
  }
}

export class FormationUnit {
  id: number;
  formationId: number;
  character = 0;
  job = 0;
  minLevel = 0;
  maxLevel = 0;
  name = 0;
  _0x06 = 0;
  _0x07 = 0;
  _0x08 = 0;
  _0x09 = 0;
  xPosition = 0;
  yPosition = 0;
  _0x0c = 0;
  _0x0d = 0;
  primaryAbility1 = 0;
  primaryAbility2 = 0;
  primaryAbility3 = 0;
  primaryAbility4 = 0;
  primaryAbility5 = 0;
  primaryAbility6 = 0;
  secondaryAbilitySet = 0;
  _0x1b = 0;
  secondaryAbility1 = 0;
  secondaryAbility2 = 0;
  secondaryAbility3 = 0;
  secondaryAbility4 = 0;
  reactionAbility = 0;
  passiveAbility = 0;
  equipment1 = 0;
  equipment2 = 0;
  equipment3 = 0;
  equipment4 = 0;
  equipment5 = 0;
  _0x32 = 0;
  _0x33 = 0;
  lootLevel1 = 0;
  lootLevel2 = 0;
  lootLevel3 = 0;
  lootLevel4 = 0;
  lootConsumable = 0;
  lootGil = 0;
  faction = 0;
  _0x3b = 0;

  constructor(bytes: Bytes, id: number, formationId: number) {
    this.id = id;
    this.formationId = formationId;
    this.character = bytes.getU8();
    this.job = bytes.getU8();
    this.minLevel = bytes.get();
    this.maxLevel = bytes.get();
    this.name = bytes.getShort();

    this._0x06 = bytes.get();
    this._0x07 = bytes.get();
    this._0x08 = bytes.get();
    this._0x09 = bytes.get();
    this.xPosition = bytes.get();
    this.yPosition = bytes.get();
    this._0x0c = bytes.get();
    this._0x0d = bytes.get();

    this.primaryAbility1 = bytes.getU16();
    this.primaryAbility2 = bytes.getU16();
    this.primaryAbility3 = bytes.getU16();
    this.primaryAbility4 = bytes.getU16();
    this.primaryAbility5 = bytes.getU16();
    this.primaryAbility6 = bytes.getU16();

    // Java defaults out-of-range indices to abilitySetList[0]; that list-size
    // default belongs to the controller layer, so keep the raw index here.
    this.secondaryAbilitySet = bytes.getU8();

    this._0x1b = bytes.get();

    this.secondaryAbility1 = bytes.getU16();
    this.secondaryAbility2 = bytes.getU16();
    this.secondaryAbility3 = bytes.getU16();
    this.secondaryAbility4 = bytes.getU16();

    // Java maps id 0 to reactionAbilityList[0]/passiveAbilityList[0], both of
    // which have id 0, so storing the raw index is byte-equivalent.
    this.reactionAbility = bytes.getU16();
    this.passiveAbility = bytes.getU16();

    this.equipment1 = bytes.getU16();
    this.equipment2 = bytes.getU16();
    this.equipment3 = bytes.getU16();
    this.equipment4 = bytes.getU16();
    this.equipment5 = bytes.getU16();

    this._0x32 = bytes.get();
    this._0x33 = bytes.get();
    this.lootLevel1 = bytes.getU8();
    this.lootLevel2 = bytes.getU8();
    this.lootLevel3 = bytes.getU8();
    this.lootLevel4 = bytes.getU8();
    this.lootConsumable = bytes.getU8();
    this.lootGil = bytes.getU8();
    this.faction = bytes.get();
    this._0x3b = bytes.get();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x3c);
    b.put(this.character);
    b.put(this.job);
    b.put(this.minLevel);
    b.put(this.maxLevel);
    b.putShort(this.name);

    b.put(this._0x06);
    b.put(this._0x07);
    b.put(this._0x08);
    b.put(this._0x09);
    b.put(this.xPosition);
    b.put(this.yPosition);
    b.put(this._0x0c);
    b.put(this._0x0d);

    b.putShort(this.primaryAbility1);
    b.putShort(this.primaryAbility2);
    b.putShort(this.primaryAbility3);
    b.putShort(this.primaryAbility4);
    b.putShort(this.primaryAbility5);
    b.putShort(this.primaryAbility6);

    // Java writes secondaryAbilitySet.id as a SHORT here, overwriting the
    // parsed _0x1b byte (same quirk as JobData.abilitySet).
    b.putU16(this.secondaryAbilitySet);
    b.putShort(this.secondaryAbility1);
    b.putShort(this.secondaryAbility2);
    b.putShort(this.secondaryAbility3);
    b.putShort(this.secondaryAbility4);

    b.putShort(this.reactionAbility);
    b.putShort(this.passiveAbility);

    b.putShort(this.equipment1);
    b.putShort(this.equipment2);
    b.putShort(this.equipment3);
    b.putShort(this.equipment4);
    b.putShort(this.equipment5);

    b.put(this._0x32);
    b.put(this._0x33);
    b.put(this.lootLevel1);
    b.put(this.lootLevel2);
    b.put(this.lootLevel3);
    b.put(this.lootLevel4);
    b.put(this.lootConsumable);
    b.put(this.lootGil);
    b.put(this.faction);
    b.put(this._0x3b);

    return b.toUint8Array();
  }
}

export class FormationData {
  id: number;
  header: FormationHeader;
  units: FormationUnit[] = [];

  constructor(headerBytes: Bytes, unitBytes: Bytes, id: number) {
    this.id = id;
    this.header = new FormationHeader(headerBytes);
    const numUnits = this.header.numUnits & 0xff;
    for (let i = 0; i < numUnits; i++) {
      this.units.push(new FormationUnit(unitBytes, i, this.id));
    }
  }

  toBytes(): [Uint8Array, Uint8Array] {
    const unitBytes = Bytes.alloc(0x3c * this.units.length);
    for (const unit of this.units) {
      unitBytes.putBytes(unit.toBytes());
    }
    this.header.numUnits = toSignedByte(this.units.length);
    return [this.header.toBytes(), unitBytes.toUint8Array()];
  }
}