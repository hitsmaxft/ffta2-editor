// Port of model/battle/SBN.java (battle script command stream + jump tree).
// Pure data: commands keep raw opcode/size/parameter bytes; the BinaryTree
// maps node offsets (address/0x10) to command records.

import { Bytes } from '../../core/binary';
import { BinaryTree } from './spritesTree';

export class SbnCommand {
  address: number;
  opcode: number; // signed byte
  size: number; // signed byte
  parameters: Uint8Array;

  constructor(buffer: Bytes);
  constructor(address: number, opcode: number, size: number, parameters: Uint8Array);
  constructor(a: Bytes | number, b?: number, c?: number, d?: Uint8Array) {
    if (a instanceof Bytes) {
      this.address = a.position();
      this.opcode = a.get();
      this.size = a.get();
      this.parameters = a.getBytesAt(a.position(), this.size - 2);
      a.position(a.position() + this.size - 2);
    } else {
      this.address = a;
      this.opcode = b!;
      this.size = c!;
      this.parameters = d!;
    }
  }

  toBytes(): Uint8Array {
    const newSbn = Bytes.alloc(this.size);
    newSbn.put(this.opcode);
    newSbn.put(this.size);
    newSbn.putBytes(this.parameters);
    return newSbn.toUint8Array();
  }
}

export class SBN {
  tree: BinaryTree<SbnCommand>;
  commands: SbnCommand[] = [];
  numJumps = 0;
  unknown1 = 0;
  startAddress = 0;
  endAddress = 0;
  unknown2 = 0;

  constructor(buffer: Bytes) {
    this.numJumps = buffer.getShort();
    this.unknown1 = buffer.getShort();
    this.startAddress = buffer.getInt();
    this.endAddress = buffer.getInt();
    this.unknown2 = buffer.getInt();

    this.tree = new BinaryTree<SbnCommand>(buffer.slice(buffer.position(), buffer.remaining()));

    buffer.position(this.startAddress);
    while (buffer.position() < this.endAddress) {
      this.commands.push(new SbnCommand(buffer));
    }

    this.tree.traverseInOrder((node) => {
      const t = this.commands.find((c) => c.address === node.offset * 0x10);
      if (t !== undefined) node.value = t;
    });
  }

  toBytes(): Uint8Array {
    return this.toByteBuffer().toUint8Array();
  }

  toByteBuffer(): Bytes {
    // Java: node.offset = node.value.address / 0x10 (NPE if a node has no command)
    this.tree.traverseInOrder((node) => {
      node.offset = Math.floor(node.value!.address / 0x10);
    });
    let treeBytes = this.tree.toBytes(); // Just for size

    const newSbn = Bytes.alloc(
      0x10 + treeBytes.length + this.commands.reduce((n, c) => n + c.size, 0)
    );
    this.numJumps = (this.tree.size << 16) >> 16; // Java: (short) tree.size
    this.startAddress = 0x10 + treeBytes.length;
    this.endAddress = newSbn.lim; // Java: capacity()

    newSbn.putShort(this.numJumps);
    newSbn.putShort(this.unknown1);
    newSbn.putInt(this.startAddress);
    newSbn.putInt(this.endAddress);
    newSbn.putInt(this.unknown2);

    newSbn.position(this.startAddress);
    for (const c of this.commands) {
      c.address = newSbn.position();
      newSbn.putBytes(c.toBytes());
    }
    // Java prints "Incorrect SBN size" if position < limit; tail stays zeroed.

    newSbn.position(0x10);
    this.tree.traverseInOrder((node) => {
      node.offset = Math.floor(node.value!.address / 0x10);
    });
    treeBytes = this.tree.toBytes(); // Command addresses have been updated
    newSbn.putBytes(treeBytes);

    return newSbn.rewind();
  }
}