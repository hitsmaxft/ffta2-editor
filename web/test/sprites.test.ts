import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import * as LZSS from '../src/core/lzss';
import {
  SpriteData,
  SpritePalettes,
  SstHeaderNode,
  UnitAnimation,
  UnitSst,
  TopSprite,
  UnitFace,
} from '../src/data/model/sprites';
import { MapData } from '../src/data/model/map';
import { SBN, SbnCommand } from '../src/data/model/battle';
import { fixture, fixtureJson, tsOutput, assertBytesEqual } from './helpers';

function hexOf(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function parseHex(s: string): Uint8Array {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// ---- SpriteData ----

interface SpriteDataManifest {
  cases: {
    name: string;
    parsed: {
      spriteMaps: {
        unkownValue: number;
        spriteOffset: number;
        pieces: { offsetX: number; offsetY: number; width: number; height: number }[];
      }[];
    };
  }[];
}

describe('SpriteData', () => {
  const manifest = fixtureJson<SpriteDataManifest>('sprites/spritedata_manifest.json');
  for (const c of manifest.cases) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const sd = new SpriteData(Bytes.wrap(fixture(`sprites/${c.name}.in.bin`)));
      expect(sd.spriteMaps).toEqual(c.parsed.spriteMaps);
      const out = sd.toBytes();
      assertBytesEqual(out, fixture(`sprites/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`sprites/${c.name}.out.bin`, out);
    });
  }
});

// ---- SpritePalettes ----

interface SpritePalettesManifest {
  cases: { name: string; numColors: number; palettes: string[] }[];
}

describe('SpritePalettes', () => {
  const manifest = fixtureJson<SpritePalettesManifest>('sprites/spritepalettes_manifest.json');
  for (const c of manifest.cases) {
    it(`parses ${c.name} and re-encodes byte-identically to Java LZSS`, () => {
      const raw = fixture(`sprites/${c.name}.in.bin`);
      const sp = new SpritePalettes(Bytes.wrap(raw), c.numColors);
      expect(sp.numColors).toBe(c.numColors);
      expect(sp.palettes.map(hexOf)).toEqual(c.palettes);
      const out = sp.toBytes();
      assertBytesEqual(out, fixture(`sprites/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`sprites/${c.name}.out.bin`, out);
      // mutual decodability with the core decoder
      if (raw.length > 0) {
        const dec = LZSS.decode(Bytes.wrap(out));
        assertBytesEqual(dec.decodedData.toUint8Array(), raw, `${c.name} decode`);
      }
    });
  }
});

// ---- UnitAnimation ----

interface UnitAnimationManifest {
  cases: {
    name: string;
    parsed: {
      key: number;
      unknown: number;
      animHeader: string;
      frames: {
        _0x00: number;
        duration: number;
        _0x04: number;
        flags: number;
        spriteIndex: number;
        _0x08: number;
        _0x0a: number;
        _0x0c: number;
        _0x0e: number;
      }[];
    };
  }[];
}

describe('UnitAnimation', () => {
  const manifest = fixtureJson<UnitAnimationManifest>('sprites/unitanimation_manifest.json');
  for (const c of manifest.cases) {
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const raw = fixture(`sprites/${c.name}.in.bin`);
      const anim = new UnitAnimation(Bytes.wrap(raw), parseHex(c.parsed.animHeader), c.parsed.key);
      expect(anim.key).toBe(c.parsed.key);
      expect(anim.unknown).toBe(c.parsed.unknown);
      expect(hexOf(anim.animHeader)).toBe(c.parsed.animHeader);
      expect(anim.frames.length).toBe(c.parsed.frames.length);
      for (let i = 0; i < anim.frames.length; i++) {
        const f = anim.frames[i];
        const e = c.parsed.frames[i];
        expect(f._0x00).toBe(e._0x00);
        expect(f.duration).toBe(e.duration);
        expect(f._0x04).toBe(e._0x04);
        expect(f.propertyFlags.toBytes()[0]).toBe(e.flags);
        expect(f.spriteIndex).toBe(e.spriteIndex);
        expect(f._0x08).toBe(e._0x08);
        expect(f._0x0a).toBe(e._0x0a);
        expect(f._0x0c).toBe(e._0x0c);
        expect(f._0x0e).toBe(e._0x0e);
      }
      const out = anim.toBytes();
      assertBytesEqual(out, fixture(`sprites/${c.name}.out.bin`), `${c.name} out`);
      assertBytesEqual(out, raw, `${c.name} raw roundtrip`);
      tsOutput(`sprites/${c.name}.out.bin`, out);
    });
  }
});

// ---- SstHeaderNode ----

interface SstHeaderNodeManifest {
  nodes: {
    index: number;
    key: number;
    offset: number;
    leftIndex: number;
    rightIndex: number;
    dataType: number;
    animationId: number;
  }[];
  constructed: {
    index: number;
    dataType: number;
    animationId: number;
    offset: number;
    key: number;
    staticKey: number;
    outHex: string;
  }[];
}

describe('SstHeaderNode', () => {
  const manifest = fixtureJson<SstHeaderNodeManifest>('sprites/sstheadernode_manifest.json');
  manifest.nodes.forEach((n, i) => {
    it(`parses node record ${i} like Java`, () => {
      const node = new SstHeaderNode(Bytes.wrap(fixture(`sprites/sstnode_${i}.in.bin`)), n.index);
      expect(node.index).toBe(n.index);
      expect(node.key).toBe(n.key);
      expect(node.offset).toBe(n.offset);
      expect(node.leftIndex).toBe(n.leftIndex);
      expect(node.rightIndex).toBe(n.rightIndex);
      expect(node.dataType).toBe(n.dataType);
      expect(node.animationId).toBe(n.animationId);
      const out = node.toBytes();
      assertBytesEqual(out, fixture(`sprites/sstnode_${i}.out.bin`), `sstnode_${i}`);
      tsOutput(`sprites/sstnode_${i}.out.bin`, out);
    });
  });
  for (const c of manifest.constructed) {
    it(`constructs node (dataType=${c.dataType}, animationId=${c.animationId}) like Java`, () => {
      expect(SstHeaderNode.key(c.dataType, c.animationId)).toBe(c.staticKey);
      const node = new SstHeaderNode(c.index, c.dataType, c.animationId, c.offset);
      expect(node.key).toBe(c.key);
      expect(node.dataType).toBe(c.dataType);
      expect(node.animationId).toBe(c.animationId);
      expect(node.offset).toBe(c.offset);
      expect(hexOf(node.toBytes())).toBe(c.outHex);
    });
  }
});

// ---- UnitSst ----

interface UnitSstManifest {
  cases: {
    name: string;
    parsed: {
      size: number;
      nodes: {
        index: number;
        key: number;
        offset: number;
        leftIndex: number;
        rightIndex: number;
        valueFile: string;
      }[];
    };
    animKeys: number[];
  }[];
}

describe('UnitSst', () => {
  const manifest = fixtureJson<UnitSstManifest>('sprites/unitsst_manifest.json');
  for (const c of manifest.cases) {
    it(`parses ${c.name} tree + compressed values like Java`, () => {
      const sst = new UnitSst(Bytes.wrap(fixture(`sprites/${c.name}.in.bin`)));
      expect(sst.size).toBe(c.parsed.size);
      const nodes = sst.asList();
      expect(nodes.length).toBe(c.parsed.nodes.length);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const e = c.parsed.nodes[i];
        expect(n.index).toBe(e.index);
        expect(n.key).toBe(e.key);
        expect(n.offset).toBe(e.offset);
        expect(n.leftIndex).toBe(e.leftIndex);
        expect(n.rightIndex).toBe(e.rightIndex);
        assertBytesEqual(n.value!, fixture(`sprites/${c.name}_${e.valueFile}`), `${c.name} node ${n.index} value`);
        expect(sst.getCompressedValue(n.key)).toEqual(n.value);
      }
    });

    it(`reserializes ${c.name} byte-for-byte vs Java`, () => {
      const sst = new UnitSst(Bytes.wrap(fixture(`sprites/${c.name}.in.bin`)));
      const out = sst.toBytes();
      assertBytesEqual(out, fixture(`sprites/${c.name}.out.bin`), `${c.name} out`);
      assertBytesEqual(out, fixture(`sprites/${c.name}.in.bin`), `${c.name} canonical roundtrip`);
      tsOutput(`sprites/${c.name}.out.bin`, out);
    });
  }

  it('extracts palettes, sprite map and animations from sst_multi like Java', () => {
    const sst = new UnitSst(Bytes.wrap(fixture('sprites/sst_multi.in.bin')));
    const palettes = sst.getPalettes()!;
    assertBytesEqual(palettes.toUint8Array(), fixture('sprites/sst_multi.palettes.bin'), 'sst_multi palettes');
    const spriteMap = sst.getSpriteMap()!;
    assertBytesEqual(spriteMap.toBytes(), fixture('sprites/sst_multi.spritemap.bin'), 'sst_multi spritemap');
    for (const key of [0x0101, 0x0201, 0x0302]) {
      const anim = sst.getAnimation(key)!;
      expect(anim.key).toBe(key);
      const nodeValue = sst.getCompressedValue(key)!;
      assertBytesEqual(anim.animHeader, nodeValue.slice(0, 4), `anim ${key} header`);
      const out = anim.toBytes();
      assertBytesEqual(out, fixture(`sprites/sst_multi.anim_${key.toString(16).padStart(4, '0')}.bin`), `anim ${key}`);
      tsOutput(`sprites/sst_multi.anim_${key.toString(16).padStart(4, '0')}.bin`, out);
    }
  });

  it('setCompressedValue reproduces the Java prefix quirk byte-for-byte', () => {
    const sst = new UnitSst(Bytes.wrap(fixture('sprites/sst_multi.in.bin')));
    const oldValue = sst.getCompressedValue(0x0101)!;
    const newValue = Bytes.wrap(fixture('sprites/sst_multi.modified_value.bin'));
    sst.setCompressedValue(0x0101, newValue);
    // Java prefix: new bytes 1..2 as short + OLD value bytes 2..3
    const stored = sst.getCompressedValue(0x0101)!;
    const expectedPrefix = new Uint8Array([
      fixture('sprites/sst_multi.modified_value.bin')[1],
      fixture('sprites/sst_multi.modified_value.bin')[2],
      oldValue[2],
      oldValue[3],
    ]);
    assertBytesEqual(stored.slice(0, 4), expectedPrefix, 'modified prefix');
    const out = sst.toBytes();
    assertBytesEqual(out, fixture('sprites/sst_multi.modified_out.bin'), 'sst_multi modified');
    tsOutput('sprites/sst_multi.modified_out.bin', out);
  });

  it('extracts sprite map from sst_single like Java', () => {
    const sst = new UnitSst(Bytes.wrap(fixture('sprites/sst_single.in.bin')));
    const spriteMap = sst.getSpriteMap()!;
    assertBytesEqual(spriteMap.toBytes(), fixture('sprites/sst_single.spritemap.bin'), 'sst_single spritemap');
  });
});

// ---- TopSprite ----

interface TopSpriteManifest {
  cases: { name: string; id: number; palette: string; numSprites: number; remaining: string }[];
}

describe('TopSprite', () => {
  const manifest = fixtureJson<TopSpriteManifest>('sprites/topsprite_manifest.json');
  for (const c of manifest.cases) {
    if (c.name === 'top_blank') {
      it('blank TopSprite(0) serializes to 33 bytes like Java', () => {
        const ts = new TopSprite(0);
        expect(ts.palette.length).toBe(0);
        expect(ts.sprites.length).toBe(0);
        const out = ts.toBytes();
        expect(out.length).toBe(0x21);
        assertBytesEqual(out, fixture('sprites/top_blank.out.bin'), 'top_blank');
        tsOutput('sprites/top_blank.out.bin', out);
      });
      continue;
    }
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const ts = new TopSprite(Bytes.wrap(fixture(`sprites/${c.name}.in.bin`)), c.id);
      expect(ts.id).toBe(c.id);
      expect(hexOf(ts.palette)).toBe(c.palette);
      expect(ts.sprites.length).toBe(c.numSprites);
      for (let i = 0; i < ts.sprites.length; i++) {
        assertBytesEqual(ts.sprites[i], fixture(`sprites/${c.name}.sprite_${i}.bin`), `${c.name} sprite ${i}`);
      }
      expect(hexOf(ts.remainingBytes)).toBe(c.remaining);
      const out = ts.toBytes();
      assertBytesEqual(out, fixture(`sprites/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`sprites/${c.name}.out.bin`, out);
    });
  }
});

// ---- UnitFace ----

interface UnitFaceManifest {
  cases: {
    name: string;
    parsed: {
      id: number;
      _0x0: number;
      _0x1: number;
      width: number;
      height: number;
      _0x6: number;
      pieces: {
        sourceX: number;
        sourceY: number;
        sourceWidth: number;
        sourceHeight: number;
        offsetX: number;
        offsetY: number;
        targetWidth: number;
        targetHeight: number;
      }[];
      image: string;
      palette: string;
      remaining: string;
    };
  }[];
}

describe('UnitFace', () => {
  const manifest = fixtureJson<UnitFaceManifest>('sprites/unitface_manifest.json');
  for (const c of manifest.cases) {
    if (c.name === 'face_blank') {
      it('blank UnitFace(0) serializes to 8 zero bytes like Java', () => {
        const f = new UnitFace(0);
        const out = f.toBytes();
        expect(out.length).toBe(8);
        assertBytesEqual(out, fixture('sprites/face_blank.out.bin'), 'face_blank');
        tsOutput('sprites/face_blank.out.bin', out);
      });
      continue;
    }
    it(`parses and reserializes ${c.name} byte-for-byte vs Java`, () => {
      const f = new UnitFace(Bytes.wrap(fixture(`sprites/${c.name}.in.bin`)), c.parsed.id);
      expect(f.id).toBe(c.parsed.id);
      expect(f._0x0).toBe(c.parsed._0x0);
      expect(f._0x1).toBe(c.parsed._0x1);
      expect(f.width).toBe(c.parsed.width);
      expect(f.height).toBe(c.parsed.height);
      expect(f._0x6).toBe(c.parsed._0x6);
      expect(f.pieces).toEqual(c.parsed.pieces);
      expect(hexOf(f.image)).toBe(c.parsed.image);
      expect(hexOf(f.palette)).toBe(c.parsed.palette);
      expect(hexOf(f.remainingBytes)).toBe(c.parsed.remaining);
      const out = f.toBytes();
      assertBytesEqual(out, fixture(`sprites/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`sprites/${c.name}.out.bin`, out);
    });
  }
});

// ---- MapData ----

interface MapDataManifest {
  cases: {
    name: string;
    parsed: {
      id: number;
      width: number;
      height: number;
      parts:
        | {
            primaryIndex: number;
            FXIndex: number;
            isFX: boolean;
            source: { x: number; y: number }[];
            target: { x: number; y: number }[];
          }[]
        | null;
      palettes: string[];
    };
  }[];
}

describe('MapData', () => {
  const manifest = fixtureJson<MapDataManifest>('sprites/mapdata_manifest.json');
  for (const c of manifest.cases) {
    it(`parses ${c.name} (parts order, palettes) like Java`, () => {
      const map = new MapData(
        Bytes.wrap(fixture(`sprites/${c.name}.map.bin`)),
        Bytes.wrap(fixture(`sprites/${c.name}.tex.bin`)),
        Bytes.wrap(fixture(`sprites/${c.name}.ctrl.bin`)),
        c.parsed.id
      );
      expect(map.id).toBe(c.parsed.id);
      expect(map.width).toBe(c.parsed.width);
      expect(map.height).toBe(c.parsed.height);
      assertBytesEqual(map.texture, fixture(`sprites/${c.name}.tex.bin`), `${c.name} texture`);
      expect(map.palettes.length).toBe(c.parsed.palettes.length);
      for (let j = 0; j < map.palettes.length; j++) {
        map.loadPalette(Bytes.wrap(fixture(`sprites/${c.name}.pltt_${j}.bin`)), j);
      }
      expect(map.palettes.map(hexOf)).toEqual(c.parsed.palettes);
      if (c.parsed.parts === null) {
        expect(map.parts).toBeNull();
      } else {
        expect(map.parts!.length).toBe(c.parsed.parts.length);
        for (let i = 0; i < map.parts!.length; i++) {
          const p = map.parts![i];
          const e = c.parsed.parts[i];
          expect(p.primaryIndex).toBe(e.primaryIndex);
          expect(p.FXIndex).toBe(e.FXIndex);
          expect(p.isFX).toBe(e.isFX);
          expect(p.source).toEqual(e.source);
          expect(p.target).toEqual(e.target);
        }
      }
    });
  }
});

// ---- SBN ----

interface SbnManifest {
  cases: {
    name: string;
    parsed: {
      numJumps: number;
      unknown1: number;
      startAddress: number;
      endAddress: number;
      unknown2: number;
      commands: { address: number; opcode: number; size: number; parameters: string }[];
      nodes: {
        index: number;
        key: number;
        offset: number;
        leftIndex: number;
        rightIndex: number;
        valueAddress: number;
      }[];
    };
  }[];
}

describe('SBN', () => {
  const manifest = fixtureJson<SbnManifest>('sprites/sbn_manifest.json');
  for (const c of manifest.cases) {
    if (c.name !== 'sbn_modified') {
      // output-only fixture for sbn_modified, covered by the modification test
      it(`parses ${c.name} header, commands and jump tree like Java`, () => {
      const sbn = new SBN(Bytes.wrap(fixture(`sprites/${c.name}.in.bin`)));
      expect(sbn.numJumps).toBe(c.parsed.numJumps);
      expect(sbn.unknown1).toBe(c.parsed.unknown1);
      expect(sbn.startAddress).toBe(c.parsed.startAddress);
      expect(sbn.endAddress).toBe(c.parsed.endAddress);
      expect(sbn.unknown2).toBe(c.parsed.unknown2);
      expect(sbn.commands.length).toBe(c.parsed.commands.length);
      for (let i = 0; i < sbn.commands.length; i++) {
        const cmd = sbn.commands[i];
        const e = c.parsed.commands[i];
        expect(cmd.address).toBe(e.address);
        expect(cmd.opcode).toBe(e.opcode);
        expect(cmd.size).toBe(e.size);
        expect(hexOf(cmd.parameters)).toBe(e.parameters);
      }
      const nodes = sbn.tree.asList();
      expect(nodes.length).toBe(c.parsed.nodes.length);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const e = c.parsed.nodes[i];
        expect(n.index).toBe(e.index);
        expect(n.key).toBe(e.key);
        expect(n.offset).toBe(e.offset);
        expect(n.leftIndex).toBe(e.leftIndex);
        expect(n.rightIndex).toBe(e.rightIndex);
        expect(n.value?.address ?? -1).toBe(e.valueAddress);
      }
      });
    }

    if (c.name === 'sbn_modified') {
      it('patch-style modification reserializes byte-for-byte vs Java', () => {
        const sbn = new SBN(Bytes.wrap(fixture('sprites/sbn_multi.in.bin')));
        // Same edit as the Java fixture: grow command 1 to a 0x30 jump, append
        // two 2-byte commands. The new parameters are taken from the Java
        // output (they contain seeded random bytes).
        const javaOut = fixture('sprites/sbn_modified.out.bin');
        const cmd1Start = sbn.startAddress + sbn.commands[0].size; // 0x40
        sbn.commands[1].opcode = 0x30;
        sbn.commands[1].size = 0x10;
        sbn.commands[1].parameters = javaOut.slice(cmd1Start + 2, cmd1Start + 0x10);
        sbn.commands.push(new SbnCommand(0, 0x09, 0x2, new Uint8Array(0)));
        sbn.commands.push(new SbnCommand(0, 0x06, 0x2, new Uint8Array(0)));
        const out = sbn.toBytes();
        assertBytesEqual(out, javaOut, 'sbn_modified');
        tsOutput('sprites/sbn_modified.out.bin', out);
        // Java re-parsed its modified output for the manifest; TS must agree.
        const re = new SBN(Bytes.wrap(out));
        expect(re.numJumps).toBe(c.parsed.numJumps);
        expect(re.unknown1).toBe(c.parsed.unknown1);
        expect(re.startAddress).toBe(c.parsed.startAddress);
        expect(re.endAddress).toBe(c.parsed.endAddress);
        expect(re.unknown2).toBe(c.parsed.unknown2);
        expect(re.commands.length).toBe(c.parsed.commands.length);
        for (let i = 0; i < re.commands.length; i++) {
          expect(re.commands[i].address).toBe(c.parsed.commands[i].address);
          expect(re.commands[i].opcode).toBe(c.parsed.commands[i].opcode);
          expect(re.commands[i].size).toBe(c.parsed.commands[i].size);
          expect(hexOf(re.commands[i].parameters)).toBe(c.parsed.commands[i].parameters);
        }
        const reNodes = re.tree.asList();
        expect(reNodes.length).toBe(c.parsed.nodes.length);
        for (let i = 0; i < reNodes.length; i++) {
          expect(reNodes[i].key).toBe(c.parsed.nodes[i].key);
          expect(reNodes[i].offset).toBe(c.parsed.nodes[i].offset);
          expect(reNodes[i].leftIndex).toBe(c.parsed.nodes[i].leftIndex);
          expect(reNodes[i].rightIndex).toBe(c.parsed.nodes[i].rightIndex);
          expect(reNodes[i].value?.address ?? -1).toBe(c.parsed.nodes[i].valueAddress);
        }
      });
      continue;
    }

    it(`reserializes ${c.name} byte-for-byte vs Java`, () => {
      const sbn = new SBN(Bytes.wrap(fixture(`sprites/${c.name}.in.bin`)));
      const out = sbn.toBytes();
      assertBytesEqual(out, fixture(`sprites/${c.name}.out.bin`), `${c.name} out`);
      tsOutput(`sprites/${c.name}.out.bin`, out);
    });
  }
});