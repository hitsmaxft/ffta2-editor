// Byte-faithful port of the ORIGINAL Java utility/LZSS.encode (suffix-tree
// matcher). core/lzss.ts uses a hash-chain matcher whose output is NOT
// byte-identical to Java; SpritePalettes.toBytes() must reproduce Java's exact
// compressed stream, so the Java algorithm is replicated here literally,
// including its quirks:
//  - nextBytes lookahead buffer keeps stale tail bytes when fewer than F bytes
//    remain (Java reuses the same byte[18] without clearing it).
//  - a trailing zero flag byte is emitted when the token count is a multiple
//    of 8 (Java skips a slot for the next flag group then never fills it).
//  - flags are written with an absolute put (BitSet.toByteArray() is empty
//    when no bits are set, writing nothing into the zero-initialized slot).
//  - leaf strings are extended in place keeping the OLD position; find()
//    returns the first matching child in insertion order, not the longest.
// Java indexes inFile.array() absolutely; this port is equivalent for buffers
// whose region starts at array offset 0 (always true for SpritePalettes).

import { Bytes } from '../../core/binary';

const N = 4096;
const F = 18;
const THRESHOLD = 3;

class SuffixNode {
  str: Uint8Array;
  position: number;
  children: SuffixNode[] = [];

  constructor(str: Uint8Array, position: number) {
    this.str = str;
    this.position = position;
  }
}

interface SuffixMatch {
  position: number;
  length: number;
}

class SuffixTree {
  root: SuffixNode = new SuffixNode(new Uint8Array(0), -1);

  constructor(string: Uint8Array) {
    for (let i = 1; i <= string.length; i++) {
      this.insertString(string.slice(0, i), 0);
    }
  }

  insertString(str: Uint8Array, position: number): void {
    for (let i = 0; i < str.length; i++) {
      this.insertSuffix(str.slice(i), position + i);
    }
  }

  insertSuffix(suffix: Uint8Array, position: number): void {
    let previousNode: SuffixNode | null = null;
    let currentNode: SuffixNode | null = this.root;
    let matchLength = 0;
    let foundMatch = false;
    let i = 0;
    let k = 0;
    while (currentNode !== null) {
      previousNode = currentNode;
      matchLength = i;
      k = 0;
      let partialMatch = false;
      let childNode: SuffixNode | null = null;
      let lastMatch = false;
      let j = 0;
      for (j = 0; j < currentNode.children.length; j++) {
        childNode = currentNode.children[j];
        lastMatch = false;
        for (i = matchLength, k = 0; i < suffix.length && k < childNode.str.length; i++, k++) {
          if (suffix[i] === childNode.str[k]) {
            lastMatch = true;
          } else {
            lastMatch = false;
            if (i === matchLength) {
              // not a match
              break;
            }
            // partial match. Branch off
            partialMatch = true;
            break;
          }
        }
        if (lastMatch) {
          if (i < suffix.length) {
            if (childNode.children.length === 0) {
              // Java keeps the leaf's original position here.
              childNode.str = suffix.slice(matchLength);
              return;
            }
            // check children
            foundMatch = true;
            break;
          }
          // Ended mid-edge. Full match. Do nothing
          return;
        } else if (partialMatch) {
          const newInnerNode = new SuffixNode(suffix.slice(matchLength, i), position);
          currentNode.children[j] = newInnerNode;
          newInnerNode.children.push(childNode);
          childNode.str = childNode.str.slice(k);
          const newLeafNode = new SuffixNode(suffix.slice(i), position);
          newInnerNode.children.push(newLeafNode);
          matchLength = i;
          return;
        } else {
          foundMatch = false;
        }
      }
      if (!foundMatch) break;
      currentNode = childNode;
    }
    // Ended at leaf-edge
    const newNode = new SuffixNode(suffix.slice(matchLength), position);
    previousNode!.children.push(newNode);
  }

  find(suffix: Uint8Array): SuffixMatch {
    let previousNode: SuffixNode | null = null;
    let currentNode: SuffixNode | null = this.root;
    let matchLength = 0;
    let foundMatch = false;
    let i = 0;
    let k = 0;
    while (currentNode !== null) {
      previousNode = currentNode;
      matchLength = i;
      k = 0;
      let partialMatch = false;
      let childNode: SuffixNode | null = null;
      let lastMatch = false;
      for (let j = 0; j < currentNode.children.length; j++) {
        childNode = currentNode.children[j];
        lastMatch = false;
        for (i = matchLength, k = 0; i < suffix.length && k < childNode.str.length; i++, k++) {
          if (suffix[i] === childNode.str[k]) {
            lastMatch = true;
          } else {
            lastMatch = false;
            if (i === matchLength) break;
            partialMatch = true;
            break;
          }
        }
        if (lastMatch) {
          if (i < suffix.length) {
            if (childNode.children.length === 0) {
              return { position: childNode.position, length: i };
            }
            foundMatch = true;
            break;
          }
          return { position: childNode.position, length: i };
        } else if (partialMatch) {
          return { position: childNode.position, length: i };
        } else {
          foundMatch = false;
        }
      }
      if (!foundMatch) break;
      currentNode = childNode;
    }
    if (matchLength > 0) return { position: previousNode!.position, length: matchLength };
    return { position: 0, length: 0 };
  }

  remove(character: number, position: number): void {
    let childNode: SuffixNode | null = null;
    let i = 0;
    for (; i < this.root.children.length; i++) {
      childNode = this.root.children[i];
      if (childNode.str[0] === character) break;
    }
    if (childNode!.position === position) {
      this.root.children.splice(i, 1);
      return;
    }
    this.removePosition(childNode!, position);
  }

  private removePosition(node: SuffixNode, position: number): void {
    const newChildren: SuffixNode[] = [];
    for (const childNode of node.children) {
      if (childNode.position !== position) {
        newChildren.push(childNode);
        this.removePosition(childNode, position);
      }
    }
    node.children = newChildren;
  }
}

export function javaLzssEncode(inFile: Bytes, vramCompatible = false): Bytes {
  const data = new Uint8Array(inFile.buf, inFile.base + inFile.pos, inFile.remaining());
  const limit = data.length;
  let inPos = 0;

  // Java allocates a 1MB zero-filled buffer; emulate with a sparse array.
  const out: number[] = [];
  let outPos = 0;
  const putByte = (b: number) => {
    out[outPos++] = b & 0xff;
  };
  const putAt = (p: number, b: number) => {
    out[p] = b & 0xff; // absolute put: does not advance position
  };

  const header = (limit << 8) | 0x10;
  putByte(header);
  putByte(header >>> 8);
  putByte(header >>> 16);
  putByte(header >>> 24);

  const nextBytes = new Uint8Array(F);
  const suffixTree = new SuffixTree(new Uint8Array(0));

  let windowPos = 0;
  let windowSize = 0;
  let flagPos = outPos;
  let flagIndex = 7;
  let flagsValue = 0; // BitSet over bits 0..7
  let lastMatch: SuffixMatch = { position: 0, length: 0 };
  out[flagPos] = 0;
  outPos = flagPos + 1;

  while (limit - inPos > 0) {
    const remaining = limit - inPos;
    let matchLength: number;
    if (lastMatch.length > remaining) matchLength = remaining;
    else matchLength = Math.min(lastMatch.length, F);
    if (matchLength < THRESHOLD) {
      matchLength = 1;
      flagsValue &= ~(1 << flagIndex);
      putByte(data[inPos++]);
    } else {
      flagsValue |= 1 << flagIndex;
      const matchPosition = inPos - 1 - lastMatch.position;
      const firstByte = ((matchLength - THRESHOLD) << 4) | (matchPosition >>> 8);
      const secondByte = matchPosition & 0xff;
      putByte(firstByte);
      putByte(secondByte);
      inPos += matchLength;
    }
    if (flagIndex === 0) {
      flagIndex = 7;
      // BitSet.toByteArray() is empty when no bits are set -> writes nothing.
      if (flagsValue !== 0) putAt(flagPos, flagsValue);
      flagsValue = 0;
      flagPos = outPos;
      out[flagPos] = 0;
      outPos = flagPos + 1;
    } else {
      flagIndex--;
    }
    windowSize += matchLength;
    const lastMatchLength = matchLength;
    if (windowSize > N) {
      windowPos += windowSize - N;
    }
    while (windowSize > N) {
      const rmPos = windowPos - (windowSize - N);
      suffixTree.remove(data[rmPos], rmPos);
      windowSize--;
    }
    for (let i = 0; i < lastMatchLength; i++) {
      const newEnd = windowPos + windowSize - lastMatchLength + i;
      const start = Math.max(0, newEnd - F);
      suffixTree.insertString(data.slice(start, newEnd), start);
    }
    // Absolute get of min(remaining, F) bytes; stale tail bytes are kept.
    nextBytes.set(data.subarray(inPos, inPos + Math.min(limit - inPos, F)), 0);
    for (let i = 1; i < 18; i++) {
      for (let j = 0; j < 18 - i; j++) {
        const start = inPos - 18 + i + j;
        if (start < 0 || inPos + i > limit) continue;
        if (vramCompatible && i + j === 17) continue; // Vram version offset must be at least 2
        suffixTree.insertSuffix(data.slice(start, inPos + i), start);
      }
    }
    lastMatch = suffixTree.find(nextBytes);
  }
  if (flagPos !== 7 && flagsValue !== 0) {
    putAt(flagPos, flagsValue);
  }

  const result = new Uint8Array(outPos);
  for (let i = 0; i < outPos; i++) result[i] = out[i] ?? 0;
  return Bytes.wrap(result);
}