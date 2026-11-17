// Port of utility/BinaryTreeNode.java and utility/BinaryTree.java.
// Used by UnitSst (sprites.ts) and SBN (battle.ts). Pure data structures:
// node values are raw payloads (Uint8Array or model records), never resolved.

import { Bytes } from '../../core/binary';

export class BinaryTreeNode<T> {
  index: number;
  key: number;
  offset: number;
  value: T | null = null;

  leftIndex = -1;
  leftChild: BinaryTreeNode<T> | null = null;
  rightIndex = -1;
  rightChild: BinaryTreeNode<T> | null = null;

  constructor(bytes: Bytes, index: number);
  constructor(index: number, key: number, offset: number);
  constructor(a: Bytes | number, b: number, c?: number) {
    if (a instanceof Bytes) {
      this.index = b;
      this.key = a.getShort();
      this.offset = a.getU16(); // Java: Short.toUnsignedInt(bytes.getShort())
      this.leftIndex = a.getShort();
      this.rightIndex = a.getShort();
    } else {
      this.index = a;
      this.key = b;
      this.offset = c!;
    }
  }

  getIndex(): number {
    return this.index;
  }

  toBytes(): Uint8Array {
    const bytes = Bytes.alloc(8);
    bytes.putShort(this.key);
    bytes.putShort(this.offset); // Java: (short) offset cast
    bytes.putShort(this.leftIndex);
    bytes.putShort(this.rightIndex);
    return bytes.toUint8Array();
  }
}

// Java ByteBuffer.duplicate(): shares content, independent position/limit.
function duplicate(b: Bytes): Bytes {
  const d = new Bytes(b.buf, b.base, b.lim);
  d.pos = b.pos;
  return d;
}

export type TreeTraversalFunc<T> = (node: BinaryTreeNode<T>) => void;

export class BinaryTree<T> {
  protected data: Bytes;
  root: BinaryTreeNode<T>;
  size = 0;
  hasChanged = false;

  constructor(bytes: Bytes) {
    this.data = duplicate(bytes);
    this.root = new BinaryTreeNode<T>(bytes.slice(0, 8), 0);
    this.buildTree(this.root);
  }

  protected buildTree(node: BinaryTreeNode<T>): void {
    this.size += 1;
    if (node.leftIndex !== -1) {
      node.leftChild = new BinaryTreeNode<T>(this.data.slice(node.leftIndex * 8, 8), node.leftIndex);
      this.buildTree(node.leftChild);
    }
    if (node.rightIndex !== -1) {
      node.rightChild = new BinaryTreeNode<T>(this.data.slice(node.rightIndex * 8, 8), node.rightIndex);
      this.buildTree(node.rightChild);
    }
  }

  find(key: number): BinaryTreeNode<T> | null {
    let currNode: BinaryTreeNode<T> | null = this.root;
    while (currNode !== null && currNode.key !== key) {
      if (currNode.key < key) {
        currNode = currNode.leftChild;
      } else {
        currNode = currNode.rightChild;
      }
    }
    return currNode;
  }

  insert(newNode: BinaryTreeNode<T>): void {
    let prevNode: BinaryTreeNode<T> | null = null;
    let currNode: BinaryTreeNode<T> | null = this.root;
    while (currNode !== null) {
      if (newNode.key > currNode.key) {
        prevNode = currNode;
        currNode = currNode.leftChild;
      } else if (newNode.key < currNode.key) {
        prevNode = currNode;
        currNode = currNode.rightChild;
      } else {
        newNode.leftIndex = currNode.leftIndex;
        newNode.leftChild = currNode.leftChild;
        newNode.rightIndex = currNode.rightIndex;
        newNode.rightChild = currNode.rightChild;
        newNode.index = currNode.index;
        this.size -= 1;
        break;
      }
    }
    this.size += 1;
    if (newNode.key > prevNode!.key) {
      prevNode!.leftIndex = newNode.index;
      prevNode!.leftChild = newNode;
    } else {
      prevNode!.rightIndex = newNode.index;
      prevNode!.rightChild = newNode;
    }
  }

  traverseInOrder(node: BinaryTreeNode<T> | null, func: TreeTraversalFunc<T>): void;
  traverseInOrder(func: TreeTraversalFunc<T>): void;
  traverseInOrder(a: BinaryTreeNode<T> | null | TreeTraversalFunc<T>, b?: TreeTraversalFunc<T>): void {
    if (typeof a === 'function') {
      this.traverseInOrder(this.root, a);
      return;
    }
    const node = a;
    const func = b!;
    if (node !== null) {
      this.traverseInOrder(node.leftChild, func);
      func(node);
      this.traverseInOrder(node.rightChild, func);
    }
  }

  asList(): BinaryTreeNode<T>[] {
    const list: BinaryTreeNode<T>[] = [];
    this.traverseInOrder(this.root, (x) => list.push(x));
    list.sort((x, y) => x.getIndex() - y.getIndex());
    return list;
  }

  toBytes(): Uint8Array {
    return this.toByteBuffer().toUint8Array();
  }

  toByteBuffer(): Bytes {
    const nodeList = this.asList();
    const newBytes = Bytes.alloc(this.size * 8);
    for (const node of nodeList) {
      newBytes.putBytes(node.toBytes());
    }
    return newBytes.rewind();
  }
}