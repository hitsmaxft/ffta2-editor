import { Bytes } from '../../core/binary';

// Pure record ports of model/auction/*.java. Reference fields store raw numeric
// indices; region-name resolution and the id-derived grandPrizeTable lookup
// (App.auctionGrandPrizeTableList.get(id)) happen in the controller layer.

export class AuctionPrizeItem {
  item: number;
  flagRequirement: number;

  // itemId/flag are signed shorts as read by Java; item index is unsigned.
  constructor(itemId: number, flag: number) {
    this.item = itemId & 0xffff;
    this.flagRequirement = flag;
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x4);
    b.putShort(this.item);
    b.putShort(this.flagRequirement);
    return b.toUint8Array();
  }
}

export class AuctionPrizeTable {
  id: number;
  prizes: AuctionPrizeItem[] = [];

  constructor(bytes: Bytes, id: number) {
    this.id = id;
    for (let i = 0; i < 8; i++) {
      this.prizes.push(new AuctionPrizeItem(bytes.getShort(), bytes.getShort()));
    }
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x20);
    for (const prize of this.prizes) {
      b.putBytes(prize.toBytes());
    }
    return b.toUint8Array();
  }
}

export class AuctionInfo {
  id: number;
  region = 0;
  flagRequirement = 0;
  storyRequirement = 0;
  entryFee = 0;
  _0x06 = 0;
  _0x07 = 0;
  // Raw prize table indices. Java reads these with SIGNED bytes.get() and uses
  // them directly as list indices (values >= 0x80 would fail in Java).
  prizeTables: number[] = [];
  _0x0c = 0;
  otherRegion1 = 0;
  otherRegion2 = 0;
  _0x0f = 0;

  constructor(bytes: Bytes, id: number) {
    this.id = id;
    this.region = bytes.get();
    this.flagRequirement = bytes.get();
    this.storyRequirement = bytes.getShort();
    this.entryFee = bytes.getShort();
    this._0x06 = bytes.get();
    this._0x07 = bytes.get();

    for (let i = 0; i < 4; i++) {
      this.prizeTables.push(bytes.get());
    }

    this._0x0c = bytes.get();
    this.otherRegion1 = bytes.get();
    this.otherRegion2 = bytes.get();
    this._0x0f = bytes.get();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x10);
    b.put(this.region);
    b.put(this.flagRequirement);
    b.putShort(this.storyRequirement);
    b.putShort(this.entryFee);
    b.put(this._0x06);
    b.put(this._0x07);

    for (let i = 0; i < 4; i++) {
      if (i < this.prizeTables.length) {
        b.put(this.prizeTables[i]);
      } else {
        b.put(0);
      }
    }

    b.put(this._0x0c);
    b.put(this.otherRegion1);
    b.put(this.otherRegion2);
    b.put(this._0x0f);

    return b.toUint8Array();
  }
}

// Static vanilla grand prize data (model/auction/AuctionVanillaData.java),
// used by the controller when the ROM's grand prize file size is wrong.
export class AuctionVanillaData {
  static grandPrizes: number[][][] = [
    [
      [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],
    ],
    [
      [286, 0], [321, 0], [354, 0], [178, 0], [271, 0], [261, 0], [355, 0], [312, 0],
    ],
    [
      [394, 0], [388, 0], [287, 0], [295, 0], [384, 0], [335, 0], [309, 0], [118, 0],
    ],
    [
      [371, 0], [51, 0], [372, 0], [383, 0], [61, 0], [79, 0], [202, 0], [104, 0],
    ],
    [
      [297, 0], [110, 0], [323, 0], [357, 0], [381, 0], [153, 0], [369, 0], [91, 0],
    ],
    [
      [393, 0], [280, 0], [13, 0], [299, 0], [126, 0], [140, 0], [191, 0], [240, 0],
    ],
    [
      [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],
    ],
    [
      [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],
    ],
  ];
}