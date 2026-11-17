// Port of SpritesController.loadSprites / saveSprites (data logic only).
// JavaFX/awt rendering (SpriteCell/getSprite/setSprite/getImage) is skipped.
//
// The DATA portion of the Java utility/UnitSprite wrapper is inlined here as
// UnitSpriteState: palette-size resolution (32 vs 128 colors), the per-sprite
// compressed slice list built from UnitCg, and saveSprites()/savePalettes()
// serialization. RomData has no unitSprites list (render-only in Java), so the
// state is kept in a module-local WeakMap keyed by UnitSst.
//
// Notes vs Java:
//  - saveSprites does NOT write maps (MapData is parse-only), does NOT touch
//    naUnitAnimTable (that lives in MainController.save), and does NOT patch
//    arm9/overlays or write SBN back.
//  - SBN loading lives in PatchesController.applyPatches in Java; it is done
//    here (from 'battle/btlprocess.sbn') because the ported RomData.sbn field
//    is owned by the sprites domain load step.

import { Bytes } from '../../core/binary';
import * as LZSS from '../../core/lzss';
import { RomData } from '../romData';
import { UnitSst, TopSprite, UnitFace, SpriteData, SpritePalettes } from '../model/sprites';
import { MapData } from '../model/map';
import { SBN } from '../model/battle';
import { javaLzssEncode } from '../model/spritesLzss';

// Data half of utility/UnitSprite.java (render fields omitted).
export interface UnitSpriteState {
  unitIndex: number;
  spriteData: SpriteData | null;
  spritePalettes: SpritePalettes | null;
  compressedSpriteList: Bytes[];
  hasChanged: boolean;
}

const unitSpriteStates = new WeakMap<UnitSst, UnitSpriteState>();

// Accessor for editors/tests: the per-unit sprite state built by loadSprites.
export function getUnitSpriteState(unitSst: UnitSst): UnitSpriteState | undefined {
  return unitSpriteStates.get(unitSst);
}

// UnitSprite constructor, data logic only. May throw (Java shows an Alert and
// leaves the fields null; the caller records a warning instead).
function buildUnitSpriteState(
  unitIndex: number,
  spriteData: SpriteData,
  spritePaletteBytes: Bytes,
  compressedSpriteBytes: Bytes
): UnitSpriteState {
  const state: UnitSpriteState = {
    unitIndex,
    spriteData,
    spritePalettes: null,
    compressedSpriteList: [],
    hasChanged: false,
  };

  const spriteMap = spriteData.spriteMaps[0];
  compressedSpriteBytes.position(spriteMap.spriteOffset);
  let decodedSprite = LZSS.decode(compressedSpriteBytes);
  let paletteSize = 32;
  if (spritePaletteBytes.remaining() % 0x100 === 0) {
    while (decodedSprite.decodedData.remaining() > 0) {
      const color = decodedSprite.decodedData.getU8();
      if (color !== 0 && color !== 126 && color !== 191 && color < 224) {
        paletteSize = 128;
        break;
      }
    }
  }
  state.spritePalettes = new SpritePalettes(spritePaletteBytes, paletteSize);

  for (const sMap of spriteData.spriteMaps) {
    compressedSpriteBytes.position(sMap.spriteOffset);
    decodedSprite = LZSS.decode(compressedSpriteBytes);
    state.compressedSpriteList.push(
      compressedSpriteBytes.slice(sMap.spriteOffset, decodedSprite.compressedSize)
    );
  }
  return state;
}

// UnitSprite.saveSprites(): returns the compressed SpriteData (unitsst 00FF
// value) and the concatenated compressed sprites (unitcg file). Sprite map
// offsets are rewritten to the new contiguous layout.
function saveUnitSprite(state: UnitSpriteState): { spriteMapData: Bytes; cgBytes: Bytes } {
  const spriteData = state.spriteData!;
  const combinedCompressedSize = state.compressedSpriteList.reduce(
    (n, x) => n + x.rewind().remaining(),
    0
  );
  const compressedSprites = Bytes.alloc(combinedCompressedSize);
  for (let i = 0; i < state.compressedSpriteList.length; i++) {
    const newOffset = compressedSprites.position();
    const prevMap = spriteData.spriteMaps[i];
    spriteData.spriteMaps[i] = {
      unkownValue: prevMap.unkownValue,
      spriteOffset: newOffset,
      pieces: prevMap.pieces,
    };
    compressedSprites.putBytes(state.compressedSpriteList[i]);
  }
  // Java LZSS.encode(buffer) == encode(buffer, false); use the byte-faithful
  // suffix-tree encoder, not the core hash-chain one.
  const compressedSpriteData = javaLzssEncode(spriteData.toByteBuffer());
  return { spriteMapData: compressedSpriteData, cgBytes: compressedSprites.rewind() };
}

// Port of SpritesController.loadSprites.
export function loadSprites(data: RomData): void {
  // last file is empty??
  data.unitSstList = [];
  for (let i = 0; i < data.unitSsts!.numFiles(); i++) {
    const unitCgBytes = data.unitCgs!.getFile(i);
    const unitSstBytes = data.unitSsts!.getFile(i);
    if (unitCgBytes == null) {
      data.warnings.push(`Cg ${i} is null`);
      continue;
    }
    if (unitSstBytes == null) {
      data.warnings.push(`Sst ${i} is null`);
      continue;
    }
    let unitSst: UnitSst;
    try {
      unitSst = new UnitSst(unitSstBytes);
    } catch (e) {
      throw new Error(`Failed to load Unit Sprite ${i}: ${e instanceof Error ? e.message : e}`);
    }
    data.unitSstList.push(unitSst);

    // Java builds a render UnitSprite here; its constructor swallows errors
    // with an Alert. Keep the data state, warn on failure.
    const spritePalette = unitSst.getPalettes();
    const spriteData = unitSst.getSpriteMap();
    const state: UnitSpriteState = {
      unitIndex: i,
      spriteData,
      spritePalettes: null,
      compressedSpriteList: [],
      hasChanged: false,
    };
    unitSpriteStates.set(unitSst, state);
    try {
      if (spritePalette == null || spriteData == null) {
        throw new Error('null palettes or sprite map');
      }
      const built = buildUnitSpriteState(i, spriteData, spritePalette, unitCgBytes);
      state.spritePalettes = built.spritePalettes;
      state.compressedSpriteList = built.compressedSpriteList;
    } catch (e) {
      data.warnings.push(`UnitSprite ${i}: ${e instanceof Error ? e.message : e}`);
    }

    unitCgBytes.rewind();
    unitSstBytes.rewind();
  }

  data.topSprites = [];
  data.topSprites.unshift(new TopSprite(0)); // Add blank entry
  // last file is empty??
  for (let i = 0; i < data.atl!.numFiles(); i++) {
    const atlBytes = data.atl!.getFile(i);
    if (atlBytes == null) {
      data.warnings.push(`Atl ${i} is null`);
      continue;
    }
    let topSprite: TopSprite;
    try {
      topSprite = new TopSprite(atlBytes, i + 1);
    } catch (e) {
      throw new Error(`Failed to load Top Sprite ${i}: ${e instanceof Error ? e.message : e}`);
    }
    data.topSprites.push(topSprite);
    atlBytes.rewind();
  }

  data.unitFaces = [];
  data.unitFaces.unshift(new UnitFace(0)); // Add blank entry
  // last file is empty??
  for (let i = 0; i < data.face!.numFiles(); i++) {
    const faceBytes = data.face!.getFile(i);
    if (faceBytes == null) {
      data.warnings.push(`Atl ${i} is null`); // sic: Java message says "Atl" for faces
      continue;
    }
    let face: UnitFace;
    try {
      face = new UnitFace(faceBytes, i);
    } catch (e) {
      throw new Error(`Failed to load Face ${i}: ${e instanceof Error ? e.message : e}`);
    }
    data.unitFaces.push(face);
    faceBytes.rewind();
  }

  const maps: MapData[] = [];
  const mapCtrlBytes = data.archive!.getFileByName('map/rom/MapCtrl.bin');
  if (mapCtrlBytes == null) throw new Error('Missing archive file map/rom/MapCtrl.bin');
  mapCtrlBytes.rewind();
  // Java: getLong() (MapCtrl) + getInt() x3 (??? / Length / ???) = 20 bytes.
  // Bytes has no getLong; skip 8 bytes then read three ints.
  mapCtrlBytes.position(mapCtrlBytes.position() + 8);
  mapCtrlBytes.getInt(); // ???
  mapCtrlBytes.getInt(); // Length
  mapCtrlBytes.getInt(); // ???
  // last file is empty??
  let currPalette = 0;
  for (let i = 0; i < data.mapData!.numFiles(); i++) {
    const mapDataBytes = data.mapData!.getFile(i);
    const texDataBytes = data.texData!.getFile(i);
    if (mapDataBytes == null) {
      data.warnings.push(`map ${i} bin is null`);
      continue;
    }
    if (texDataBytes == null) {
      data.warnings.push(`map ${i} tex is null`);
      continue;
    }
    try {
      const map = new MapData(mapDataBytes, texDataBytes, mapCtrlBytes, i);
      for (let j = 0; j < map.palettes.length; j++) {
        const plttDataBytes = data.plttData!.getFile(currPalette);
        if (plttDataBytes == null) {
          data.warnings.push(`map ${i} pltt is null`);
          continue; // Java quirk: currPalette is NOT incremented here
        }
        map.loadPalette(plttDataBytes, j);
        plttDataBytes.rewind();
        currPalette++;
      }
      maps.push(map);
    } catch (e) {
      throw new Error(`Failed to load map ${i}: ${e instanceof Error ? e.message : e}`);
    }
    mapDataBytes.rewind();
    texDataBytes.rewind();
  }
  mapCtrlBytes.rewind();
  data.maps = maps;

  // Java loads/patches SBN in PatchesController.applyPatches; the ported
  // RomData.sbn is populated here so the sprites load step owns it.
  const sbnBytes = data.archive!.getFileByName('battle/btlprocess.sbn');
  if (sbnBytes != null) {
    data.sbn = new SBN(sbnBytes.rewind());
  } else {
    data.warnings.push('Missing archive file battle/btlprocess.sbn');
  }
}

// Port of SpritesController.saveSprites. Does not write maps/naUnitAnimTable/
// sbn/arm9/overlays (Java does those elsewhere or not at all).
export function saveSprites(data: RomData): void {
  // Java iterates unitList (UnitSprite items); its size matches unitSstList
  // after loadSprites, so unitSstList drives the loop here.
  const unitSstList = data.unitSstList;
  data.unitSsts!.setNumFiles(unitSstList.length);
  data.unitCgs!.setNumFiles(unitSstList.length);
  for (let i = 0; i < unitSstList.length; i++) {
    const unitSst = unitSstList[i];
    const state = unitSpriteStates.get(unitSst);
    if (!state?.hasChanged && !unitSst.hasChanged) continue;
    try {
      // Java NPEs if the UnitSprite state is missing/incomplete; mirror that.
      const { spriteMapData, cgBytes } = saveUnitSprite(state!);
      unitSst.setCompressedValue(0x00ff, spriteMapData);
      unitSst.setCompressedValue(0x00f0, state!.spritePalettes!.toByteBuffer());
      data.unitSsts!.setFile(i, unitSst.toByteBuffer());
      data.unitCgs!.setFile(i, cgBytes);
    } catch (e) {
      throw new Error(`Failed to save Unit Sprite ${i}: ${e instanceof Error ? e.message : e}`);
    }
  }

  data.atl!.setNumFiles(data.topSprites.length - 1);
  for (const topSprite of data.topSprites) {
    if (topSprite.id === 0 || !topSprite.hasChanged) continue;
    try {
      data.atl!.setFile(topSprite.id - 1, Bytes.wrap(topSprite.toBytes()));
    } catch (e) {
      throw new Error(`Failed to save Top Sprite ${topSprite.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  data.face!.setNumFiles(data.unitFaces.length);
  for (const face of data.unitFaces) {
    if (face.id === 0 || !face.hasChanged) continue;
    try {
      data.face!.setFile(face.id, Bytes.wrap(face.toBytes()));
    } catch (e) {
      throw new Error(`Failed to save Face ${face.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
}