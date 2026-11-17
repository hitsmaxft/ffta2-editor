import { Bytes } from '../../core/binary';

// Pure record ports of org.ruru.ffta2editor.model.bazaar.*. Reference fields
// store raw numeric indices; name/description resolution happens in the
// controller layer (RomData).

export class BazaarRecipe {
  id: number;
  // Java: this.item = App.itemList.get(id) — same index as id.
  item: number;
  // Java resolves loot index 0 to App.lootList.get(0), the dummy LootData("", 0)
  // whose id is 0, so storing the raw index (0 stays 0) is byte-faithful.
  // Non-zero indices must reference LootData entries in App.itemList.
  loot1 = 0;
  loot2 = 0;
  loot3 = 0;
  _0x6 = 0;

  constructor(bytes: Bytes, id: number) {
    this.id = id;
    this.item = id;
    this.loot1 = bytes.getU16();
    this.loot2 = bytes.getU16();
    this.loot3 = bytes.getU16();
    this._0x6 = bytes.getShort();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x8);
    b.putShort(this.loot1); // Java (short)loot.id: low 16 bits
    b.putShort(this.loot2);
    b.putShort(this.loot3);
    b.putShort(this._0x6);
    return b.toUint8Array();
  }
}

export class BazaarSetItem {
  // Index into App.equipmentList (unsigned short).
  item = 0;
  grade = 0;
  unused = 0;

  constructor(itemId: number, grade: number, unused: number) {
    this.item = itemId;
    this.grade = grade;
    this.unused = unused;
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x4);
    b.putShort(this.item); // Java (short)item.id: low 16 bits
    b.put(this.grade);
    b.put(this.unused);
    return b.toUint8Array();
  }
}

export class BazaarSet {
  id: number;
  storyRequirement = 0;
  flagRequirement = 0;
  items: BazaarSetItem[] = [];

  constructor(bytes: Bytes, id: number) {
    this.id = id;
    this.storyRequirement = bytes.getShort();
    this.flagRequirement = bytes.getShort();
    for (let i = 0; i < 10; i++) {
      this.items.push(new BazaarSetItem(bytes.getU16(), bytes.get(), bytes.get()));
    }
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x2c);
    b.putShort(this.storyRequirement);
    b.putShort(this.flagRequirement);
    for (const item of this.items) {
      b.putBytes(item.toBytes());
    }
    return b.toUint8Array();
  }
}