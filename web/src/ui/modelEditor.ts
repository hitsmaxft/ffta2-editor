// Schema-free, deep record editor for the numeric model domains.
//
// The JavaFX editor has one bespoke view per domain. In the browser we instead
// reflect over the pure TS model records: primitives, booleans, Flags bit sets,
// nested records and arrays are all editable in place. The models are the same
// objects the save pipeline serializes, so edits take effect without a separate
// conversion layer.

import { RomData } from '../data/romData';
import { EditorTab } from './textEditor';
import { el, clear, recordList, searchBox, numberInput, textInput, textArea } from './widgets';
import { Flags } from '../data/model/flags';
import { getAuctionInfoList, getLawBonusStoryRequirements, setLawBonusStoryRequirements } from '../data/controllers/item';

type Rec = Record<string, unknown>;

export interface ModelTabOpts {
  id: string;
  label: string;
  list: (data: RomData) => Rec[];
  name?: (data: RomData, rec: Rec, index: number) => string;
  allowAdd?: boolean;
  allowRemove?: boolean;
}

const MAX_EDITABLE_BYTES = 512;

function humanField(key: string): string {
  if (/^_0x[0-9a-f]+$/i.test(key)) return `${key} (unknown)`;
  if (/^_0x/.test(key)) return `${key} (unknown)`;
  const s = key.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toHex(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.subarray(i, i + 16);
    lines.push(Array.from(chunk, (b) => b.toString(16).padStart(2, '0')).join(' '));
  }
  return lines.join('\n');
}

function fromHex(text: string): Uint8Array | null {
  const clean = text.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2 !== 0) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// Clone a model value, preserving its prototype (so toBytes() still exists)
// while resetting every editable leaf to a neutral value.
function blankClone<T>(value: T): T {
  if (value instanceof Flags) return new Flags(value.length) as T;
  if (value instanceof Uint8Array) return new Uint8Array(value.length) as T;
  if (Array.isArray(value)) return [] as T;
  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    const out = Object.create(proto) as Rec;
    for (const key of Object.keys(value as Rec)) {
      out[key] = blankClone((value as Rec)[key]);
    }
    return out as T;
  }
  if (typeof value === 'number') return 0 as T;
  if (typeof value === 'boolean') return false as T;
  if (typeof value === 'string') return '' as T;
  return value;
}

function hasNamedBooleanFlags(obj: Rec): boolean {
  return Object.entries(obj).some(([k, v]) => k !== 'flags' && typeof v === 'boolean');
}

function primitiveRow(key: string, value: unknown, onChange: (v: unknown) => void): [HTMLElement, HTMLElement] {
  if (typeof value === 'boolean') {
    const cb = el('input', { type: 'checkbox' });
    cb.checked = value;
    cb.onchange = () => onChange(cb.checked);
    return [el('label', { text: humanField(key) }), cb];
  }
  if (typeof value === 'number') {
    return [el('label', { text: humanField(key) }), numberInput(value, (v) => onChange(v))];
  }
  return [el('label', { text: humanField(key) }), textInput(String(value), (v) => onChange(v))];
}

function renderFlags(flags: Flags, markDirty: () => void): HTMLElement {
  const box = el('div', { class: 'flags-box' });
  const head = el('div', { class: 'flags-head' });
  const total = flags.length * 8;
  head.append(el('span', { text: `${flags.length} byte${flags.length === 1 ? '' : 's'} / ${total} bits` }));
  const all = el('button', { type: 'button', text: 'Set all' });
  const none = el('button', { type: 'button', text: 'Clear' });
  all.onclick = () => { for (let i = 0; i < total; i++) flags.set(i, true); markDirty(); grid.replaceChildren(...bitNodes()); };
  none.onclick = () => { for (let i = 0; i < total; i++) flags.set(i, false); markDirty(); grid.replaceChildren(...bitNodes()); };
  head.append(all, none);
  const grid = el('div', { class: 'flags-grid' });
  const bitNodes = (): HTMLElement[] => {
    const nodes: HTMLElement[] = [];
    for (let i = 0; i < total; i++) {
      const lbl = el('label', { class: 'flag' });
      const cb = el('input', { type: 'checkbox' });
      cb.checked = flags.get(i);
      cb.onchange = () => { flags.set(i, cb.checked); markDirty(); };
      lbl.append(cb, el('span', { text: String(i) }));
      nodes.push(lbl);
    }
    return nodes;
  };
  grid.replaceChildren(...bitNodes());
  box.append(head, grid);
  return box;
}

function renderBytes(value: Uint8Array, onChange: (v: Uint8Array) => void, markDirty: () => void): HTMLElement {
  const box = el('div', { class: 'bytes-box' });
  if (value.length > MAX_EDITABLE_BYTES) {
    box.append(el('p', { class: 'hint', text: `${value.length} bytes — read-only hex preview (too large for inline editing).` }));
    const pre = el('pre', { class: 'hex-preview' });
    pre.textContent = toHex(value.subarray(0, 256)) + (value.length > 256 ? '\n…' : '');
    box.append(pre);
    return box;
  }
  const ta = textArea(toHex(value), (text) => {
    const bytes = fromHex(text);
    if (!bytes) { ta.classList.add('invalid'); return; }
    ta.classList.remove('invalid');
    onChange(bytes);
    markDirty();
  });
  ta.classList.add('hex-input');
  box.append(ta, el('p', { class: 'hint', text: 'Space-separated hexadecimal bytes.' }));
  return box;
}

function renderValue(
  container: HTMLElement,
  owner: Rec,
  key: string,
  value: unknown,
  markDirty: () => void,
  depth: number
): void {
  if (typeof value !== 'object' || value === null) {
    const [lab, ctrl] = primitiveRow(key, value, (v) => { owner[key] = v; markDirty(); });
    container.append(lab, ctrl);
    return;
  }

  if (value instanceof Flags) {
    container.append(el('label', { text: humanField(key) }));
    const wrap = el('div', { class: 'full' });
    wrap.append(renderFlags(value, markDirty));
    container.append(wrap);
    return;
  }

  if (value instanceof Uint8Array) {
    container.append(el('label', { text: humanField(key) }));
    const wrap = el('div', { class: 'full' });
    wrap.append(renderBytes(value, (v) => { owner[key] = v; markDirty(); }, markDirty));
    container.append(wrap);
    return;
  }

  const nestedHeading = depth === 0 ? el('h3', { class: 'field-group-title', text: humanField(key) }) : undefined;
  if (nestedHeading) container.append(nestedHeading);

  if (Array.isArray(value)) {
    const arrayBox = el('div', { class: depth === 0 ? 'field-group full' : 'field-group nested' });
    const items = value as unknown[];
    arrayBox.append(el('p', { class: 'hint', text: `${items.length} item${items.length === 1 ? '' : 's'}` }));
    items.forEach((item, index) => {
      const card = el('details', { class: 'array-item' });
      const summary = el('summary', { text: `${humanField(key)} #${index}` });
      card.append(summary);
      if (item !== null && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Uint8Array) && !(item instanceof Flags)) {
        const form = el('div', { class: 'form' });
        for (const [k, v] of Object.entries(item as Rec)) {
          if (k === 'id' || typeof v === 'function' || (k === 'name' && typeof v === 'string')) continue;
          if (k === 'flags' && v instanceof Flags && hasNamedBooleanFlags(item as Rec)) continue;
          renderValue(form, item as Rec, k, v, markDirty, depth + 1);
        }
        card.append(form);
      } else if (typeof item === 'number') {
        card.append(numberInput(item, (v) => { items[index] = v; markDirty(); }));
      } else if (typeof item === 'string') {
        card.append(textInput(item, (v) => { items[index] = v; markDirty(); }));
      } else if (item instanceof Uint8Array) {
        card.append(renderBytes(item, (v) => { items[index] = v; markDirty(); }, markDirty));
      } else {
        card.append(el('p', { class: 'hint', text: 'Unsupported value.' }));
      }
      arrayBox.append(card);
    });
    const actions = el('div', { class: 'row-actions' });
    const add = el('button', { type: 'button', text: 'Add item' });
    add.onclick = () => {
      const template = items.length > 0 ? items[items.length - 1] : undefined;
      items.push(template === undefined ? 0 : blankClone(template));
      markDirty();
      // Re-render by replacing the array box in place.
      const parent = arrayBox.parentElement;
      if (parent) {
        const replacement = el('div', { class: depth === 0 ? 'field-group full' : 'field-group nested' });
        renderValue(replacement, owner, key, items, markDirty, depth);
        parent.replaceChild(replacement, arrayBox);
      }
    };
    const remove = el('button', { type: 'button', text: 'Remove last' });
    remove.disabled = items.length === 0;
    remove.onclick = () => {
      items.pop();
      markDirty();
      const parent = arrayBox.parentElement;
      if (parent) {
        const replacement = el('div', { class: depth === 0 ? 'field-group full' : 'field-group nested' });
        renderValue(replacement, owner, key, items, markDirty, depth);
        parent.replaceChild(replacement, arrayBox);
      }
    };
    actions.append(add, remove);
    arrayBox.append(actions);
    container.append(arrayBox);
    return;
  }

  // Nested record.
  const form = el('div', { class: depth === 0 ? 'form field-group full' : 'form field-group nested' });
  for (const [k, v] of Object.entries(value as Rec)) {
    if (k === 'id' || typeof v === 'function' || (k === 'name' && typeof v === 'string')) continue;
    if (k === 'flags' && v instanceof Flags && hasNamedBooleanFlags(value as Rec)) continue;
    renderValue(form, value as Rec, k, v, markDirty, depth + 1);
  }
  container.append(form);
}

function renderRecord(detail: HTMLElement, data: RomData, opts: ModelTabOpts, records: Rec[], selected: number, rerender: () => void, markDirty: () => void): void {
  clear(detail);
  const rec = records[selected];
  if (!rec) return;

  const title = opts.name?.(data, rec, selected) || `#${rec.id ?? selected}`;
  const header = el('div', { class: 'record-header' });
  header.append(el('h2', { class: 'section-title', text: `${opts.label} · ${title}` }));
  const actions = el('div', { class: 'row-actions' });
  if (opts.allowAdd) {
    const add = el('button', { type: 'button', text: 'Add record' });
    add.onclick = () => {
      const template = records.length > 0 ? records[records.length - 1] : undefined;
      const newRec = template === undefined ? {} : blankClone(template);
      if (typeof newRec.id === 'number') newRec.id = records.length;
      records.push(newRec as Rec);
      markDirty();
      rerender();
    };
    actions.append(add);
  }
  if (opts.allowRemove) {
    const remove = el('button', { type: 'button', text: 'Remove last' });
    remove.disabled = records.length === 0;
    remove.onclick = () => {
      if (!confirm(`Remove the last ${opts.label.toLowerCase()} record?`)) return;
      records.pop();
      markDirty();
      rerender();
    };
    actions.append(remove);
  }
  header.append(actions);
  detail.append(header);

  const form = el('div', { class: 'form' });
  for (const [key, value] of Object.entries(rec)) {
    if (key === 'id' || typeof value === 'function' || (key === 'name' && typeof value === 'string')) continue;
    renderValue(form, rec, key, value, markDirty, 0);
  }
  detail.append(form);

  if ('id' in rec) detail.append(el('p', { class: 'hint', text: `Raw record id/index: ${String(rec.id)}` }));
}

export function makeModelTab(opts: ModelTabOpts): EditorTab {
  return {
    id: opts.id,
    label: opts.label,
    available: (data) => opts.list(data).length > 0,
    render(container, data, markDirty) {
      const records = opts.list(data);
      let selected = 0;
      let filter = '';

      const split = el('div', { class: 'split' });
      const left = el('div', { class: 'list-pane' });
      const right = el('div', { class: 'detail-pane' });
      split.append(left, right);
      container.append(split);

      const labelOf = (i: number) => {
        const rec = records[i];
        const nm = opts.name?.(data, rec, i);
        return nm ? `${nm}` : `#${rec.id ?? i}`;
      };

      const rerender = () => {
        if (selected >= records.length) selected = Math.max(0, records.length - 1);
        renderLeft();
        renderRecord(right, data, opts, records, selected, rerender, markDirty);
      };

      const renderLeft = () => {
        clear(left);
        left.append(el('p', { class: 'pane-title', text: `${records.length} records` }));
        left.append(searchBox('Filter…', (v) => { filter = v; renderLeft(); }));
        const { list, setSelected } = recordList({
          count: records.length,
          filter,
          label: labelOf,
          onSelect: (i) => { selected = i; setSelected(i); renderRecord(right, data, opts, records, selected, rerender, markDirty); },
        });
        left.append(list);
        setSelected(selected);
      };

      renderLeft();
      renderRecord(right, data, opts, records, selected, rerender, markDirty);
    },
  };
}

const nameAt = (table: { id: number; string: string }[] | undefined, id: number) =>
  table?.find((s) => s.id === id)?.string ?? '';

export const jobTab = makeModelTab({
  id: 'jobs', label: 'Jobs', allowAdd: true, allowRemove: true,
  list: (d) => d.jobDataList as unknown as Rec[],
  name: (d, rec) => nameAt(d.jobNames, rec.id as number),
});

export const jobGroupTab = makeModelTab({
  id: 'jobGroups', label: 'Job Groups', allowAdd: true, allowRemove: true,
  list: (d) => d.jobGroupList as unknown as Rec[],
});

export const jobRequirementTab = makeModelTab({
  id: 'jobRequirements', label: 'Job Requirements', allowAdd: true, allowRemove: true,
  list: (d) => d.jobRequirementList as unknown as Rec[],
});

export const characterTab = makeModelTab({
  id: 'characters', label: 'Characters', allowAdd: true, allowRemove: true,
  list: (d) => d.characterList as unknown as Rec[],
  name: (d, rec) => nameAt(d.characterNames, rec.name as number),
});

export const abilityTab = makeModelTab({
  id: 'abilities', label: 'Abilities', allowAdd: true, allowRemove: true,
  list: (d) => d.activeAbilityList as unknown as Rec[],
  name: (d, rec) => nameAt(d.abilityNames, rec.id as number),
});

export const abilitySetTab = makeModelTab({
  id: 'abilitySets', label: 'Ability Sets', allowAdd: true, allowRemove: true,
  list: (d) => d.abilitySetList as unknown as Rec[],
  name: (d, rec) => nameAt(d.abilitySetNames, rec.id as number),
});

export const equipmentTab = makeModelTab({
  id: 'equipment', label: 'Equipment', allowAdd: true, allowRemove: true,
  list: (d) => d.equipmentList as unknown as Rec[],
  name: (d, rec) => nameAt(d.itemNames, rec.id as number),
});

export const consumableTab = makeModelTab({
  id: 'consumables', label: 'Consumables', allowAdd: true, allowRemove: true,
  list: (d) => d.consumableList as unknown as Rec[],
  name: (d, rec) => nameAt(d.itemNames, rec.id as number),
});

export const lootTab = makeModelTab({
  id: 'loot', label: 'Loot', allowAdd: true, allowRemove: true,
  list: (d) => d.lootList as unknown as Rec[],
  name: (d, rec) => nameAt(d.itemNames, rec.id as number),
});

export const itemTableTab = makeModelTab({
  id: 'itemTables', label: 'Item Tables', allowAdd: true, allowRemove: true,
  list: (d) => d.itemTableList as unknown as Rec[],
});

export const lawBonusTab = makeModelTab({
  id: 'lawBonuses', label: 'Law Bonuses', allowAdd: true, allowRemove: true,
  list: (d) => d.lawBonusList as unknown as Rec[],
  name: (d, rec) => nameAt(d.lawNames, rec.id as number),
});

export const lawRequirementTab: EditorTab = {
  id: 'lawRequirements',
  label: 'Law Story Reqs',
  available: (d) => d.lawBonusList.length > 0,
  render(container, data, markDirty) {
    const values = getLawBonusStoryRequirements(data);
    const form = el('div', { class: 'form' });
    form.append(el('h2', { class: 'section-title full', text: 'Law bonus story requirements' }));
    form.append(el('p', { class: 'hint full', text: 'Four unsigned 16-bit story flags stored in arm9 at 0x11B650. Written back by saveLawBonus.' }));
    for (let i = 0; i < 4; i++) {
      form.append(el('label', { text: `Requirement ${i + 1}` }), numberInput(values[i], (v) => {
        values[i] = v;
        setLawBonusStoryRequirements(data, values);
        markDirty();
      }, { min: 0, max: 0xffff }));
    }
    container.append(form);
  },
};

export const formationTab = makeModelTab({
  id: 'formations', label: 'Formations', allowAdd: true, allowRemove: true,
  list: (d) => d.formationList as unknown as Rec[],
});

export const questTab = makeModelTab({
  id: 'quests', label: 'Quests', allowAdd: true, allowRemove: true,
  list: (d) => d.questDataList as unknown as Rec[],
  name: (d, rec) => nameAt(d.questNames, rec.id as number),
});

export const bazaarTab = makeModelTab({
  id: 'bazaar', label: 'Bazaar', allowAdd: true, allowRemove: true,
  list: (d) => d.bazaarSetList as unknown as Rec[],
  name: (d, rec) => nameAt(d.bazaarSetNames, rec.id as number),
});

export const bazaarRecipeTab = makeModelTab({
  id: 'bazaarRecipes', label: 'Bazaar Recipes', allowAdd: true, allowRemove: true,
  list: (d) => d.bazaarRecipeList as unknown as Rec[],
  name: (d, rec) => nameAt(d.itemNames, rec.item as number),
});

export const auctionTab = makeModelTab({
  id: 'auctions', label: 'Auctions', allowAdd: true, allowRemove: true,
  list: (d) => getAuctionInfoList(d) as unknown as Rec[],
});

export const auctionPrizeTab = makeModelTab({
  id: 'auctionPrizes', label: 'Auction Prizes', allowAdd: true, allowRemove: true,
  list: (d) => d.auctionPrizeTableList as unknown as Rec[],
});

export const auctionGrandPrizeTab = makeModelTab({
  id: 'auctionGrandPrizes', label: 'Auction Grand Prizes', allowAdd: true, allowRemove: true,
  list: (d) => d.auctionGrandPrizeTableList as unknown as Rec[],
});

export const mapTab = makeModelTab({
  id: 'maps', label: 'Maps (read-only)',
  list: (d) => d.maps as unknown as Rec[],
});

export const unitSpriteTab = makeModelTab({
  id: 'unitSprites', label: 'Unit Sprites (read-only)',
  list: (d) => d.unitSstList as unknown as Rec[],
});

export const topSpriteTab = makeModelTab({
  id: 'topSprites', label: 'Top Sprites (read-only)',
  list: (d) => d.topSprites as unknown as Rec[],
});

export const faceTab = makeModelTab({
  id: 'faces', label: 'Faces (read-only)',
  list: (d) => d.unitFaces as unknown as Rec[],
});
