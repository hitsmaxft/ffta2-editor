// App shell: ROM open/save lifecycle, tab switching, status + warnings.

import { RomData } from '../data/romData';
import { loadRom } from '../data/load';
import { loadAll, saveAll } from '../data/orchestration';
import { loadMessages } from '../data/text';
import { parseWordTable, WordTable } from '../core/wordTable';
import { buildSavePlan, saveRom } from '../data/save';
import {
  OpenedRom, supportsFsAccess, openRomViaPicker, openRomViaInput,
  saveInPlace, saveAsViaPicker, downloadRom,
} from './file';
import { EditorTab, textTab } from './textEditor';
import {
  jobTab, jobGroupTab, jobRequirementTab, characterTab, abilityTab, abilitySetTab,
  equipmentTab, consumableTab, lootTab, itemTableTab, lawBonusTab, lawRequirementTab, formationTab,
  questTab, bazaarTab, bazaarRecipeTab, auctionTab, auctionPrizeTab,
  auctionGrandPrizeTab, mapTab, unitSpriteTab, topSpriteTab, faceTab,
} from './modelEditor';
import { el, clear } from './widgets';

const TABS: EditorTab[] = [
  textTab,
  jobTab, jobGroupTab, jobRequirementTab, characterTab,
  abilityTab, abilitySetTab,
  equipmentTab, consumableTab, lootTab, itemTableTab, lawBonusTab, lawRequirementTab,
  bazaarTab, bazaarRecipeTab,
  auctionTab, auctionPrizeTab, auctionGrandPrizeTab,
  formationTab, questTab,
  mapTab, unitSpriteTab, topSpriteTab, faceTab,
];

interface AppState {
  data: RomData | null;
  opened: OpenedRom | null;
  dirty: boolean;
  activeTab: string;
  wordTable: WordTable | null;
}

const state: AppState = { data: null, opened: null, dirty: false, activeTab: TABS[0].id, wordTable: null };

const $ = (id: string) => document.getElementById(id)!;

function setStatus(msg: string): void {
  $('status').textContent = msg;
}

function markDirty(): void {
  state.dirty = true;
  refreshButtons();
}

function refreshButtons(): void {
  const loaded = state.data !== null;
  ($('save-btn') as HTMLButtonElement).disabled = !loaded;
  ($('save-as-btn') as HTMLButtonElement).disabled = !loaded;
  $('file-name').textContent = state.opened
    ? `${state.opened.name}${state.dirty ? ' •' : ''}`
    : 'No ROM loaded';
  $('word-table-name').textContent = state.wordTable
    ? `Word table: ${state.wordTable.name}`
    : 'No word table';
}

function renderTabs(): void {
  const nav = $('tabs');
  clear(nav);
  if (!state.data) return;
  for (const tab of TABS) {
    if (!tab.available(state.data)) continue;
    const btn = el('button', {
      class: `tab${tab.id === state.activeTab ? ' active' : ''}`,
      text: tab.label,
    });
    btn.onclick = () => { state.activeTab = tab.id; renderTabs(); renderContent(); };
    nav.append(btn);
  }
}

function renderContent(): void {
  const content = $('content');
  clear(content);
  if (!state.data) {
    content.append(el('div', { class: 'empty-state' }, [
      el('p', { text: 'Open a Final Fantasy Tactics Advance 2 ROM (.nds) to begin editing.' }),
    ]));
    return;
  }
  const tab = TABS.find((t) => t.id === state.activeTab) ?? TABS[0];
  tab.render(content, state.data, markDirty);
  if (state.data.warnings.length > 0) {
    const details = el('details', { class: 'warnings' });
    details.append(el('summary', { text: `${state.data.warnings.length} load warnings` }));
    const ul = el('ul');
    for (const w of state.data.warnings) ul.append(el('li', { text: w }));
    details.append(ul);
    content.append(details);
  }
}

async function applyOpened(opened: OpenedRom): Promise<void> {
  setStatus(`Loading ${opened.name}…`);
  const data = loadRom(opened.bytes);
  data.wordTable = state.wordTable;
  loadAll(data);
  state.data = data;
  state.opened = opened;
  state.dirty = false;
  state.activeTab = TABS.find((t) => t.available(data))?.id ?? TABS[0].id;
  refreshButtons();
  renderTabs();
  renderContent();
  setStatus(`Loaded ${opened.name} — ${data.archive?.files.length ?? 0} archive entries.`);
}

async function loadWordTableFile(file: File): Promise<void> {
  const table = parseWordTable(await file.text(), file.name);
  state.wordTable = table;
  if (state.data) {
    state.data.wordTable = table;
    loadMessages(state.data);
    renderContent();
  }
  refreshButtons();
  setStatus(
    `Loaded word table "${table.name}" (${table.decodeMap.size + table.singleDecodeMap.size} entries).` +
      (state.data ? ' Text tables were re-decoded.' : ' It will be used for the next opened ROM.')
  );
}

function openWordTable(): void {
  if (state.data && state.dirty && !confirm('Loading a word table re-decodes the text tables and discards unsaved text edits. Continue?')) {
    return;
  }
  ($('word-table-input') as HTMLInputElement).click();
}

async function openRom(): Promise<void> {
  try {
    let opened: OpenedRom | null;
    if (supportsFsAccess()) {
      opened = await openRomViaPicker();
    } else {
      opened = await openRomViaInput($('file-input') as HTMLInputElement);
    }
    if (!opened) return;
    await applyOpened(opened);
  } catch (err) {
    setStatus(`Failed to load: ${(err as Error).message}`);
    console.error(err);
  }
}

async function save(asNew: boolean): Promise<void> {
  if (!state.data || !state.opened) return;
  try {
    setStatus('Saving…');
    saveAll(state.data);
    const plan = buildSavePlan(state.data);
    const canInPlace = !asNew && state.opened.handle && supportsFsAccess();
    if (canInPlace) {
      await saveInPlace(state.opened.handle!, plan);
      setStatus(`Saved in place — ${plan.writes.length} changed byte span${plan.writes.length === 1 ? '' : 's'}.`);
    } else {
      const bytes = saveRom(state.data);
      const name = state.opened.name;
      if (!asNew && supportsFsAccess()) {
        await saveAsViaPicker(name, bytes);
      } else {
        downloadRom(name, bytes);
      }
      setStatus(`Saved ${bytes.length.toLocaleString()} bytes — ${plan.writes.length} changed byte span${plan.writes.length === 1 ? '' : 's'}.`);
    }
    state.dirty = false;
    refreshButtons();
  } catch (err) {
    setStatus(`Save failed: ${(err as Error).message}`);
    console.error(err);
  }
}

export function boot(): void {
  $('open-btn').onclick = () => void openRom();
  $('word-table-btn').onclick = openWordTable;
  const wordTableInput = $('word-table-input') as HTMLInputElement;
  wordTableInput.onchange = async () => {
    const file = wordTableInput.files?.[0];
    wordTableInput.value = '';
    if (!file) return;
    try {
      await loadWordTableFile(file);
    } catch (err) {
      setStatus(`Failed to load word table: ${(err as Error).message}`);
      console.error(err);
    }
  };
  $('save-btn').onclick = () => void save(false);
  $('save-as-btn').onclick = () => void save(true);
  refreshButtons();
  renderContent();

  // Dev convenience: ?rom=<url> auto-loads a served ROM (no file handle).
  if (import.meta.env.DEV) {
    const romUrl = new URLSearchParams(location.search).get('rom');
    if (romUrl) {
      void (async () => {
        try {
          const res = await fetch(romUrl);
          const bytes = new Uint8Array(await res.arrayBuffer());
          const name = romUrl.split('/').pop() ?? 'rom.nds';
          await applyOpened({ bytes, name, handle: null });
        } catch (err) {
          setStatus(`Failed to load: ${(err as Error).message}`);
          console.error(err);
        }
      })();
    }
  }
}