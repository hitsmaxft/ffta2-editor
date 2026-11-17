// Text domain editor: browse message tables and edit individual strings.

import { RomData } from '../data/romData';
import { el, clear, recordList, searchBox, textArea } from './widgets';

export interface EditorTab {
  id: string;
  label: string;
  available(data: RomData): boolean;
  render(container: HTMLElement, data: RomData, markDirty: () => void): void;
}

export const textTab: EditorTab = {
  id: 'text',
  label: 'Text',
  available: (data) => data.messageList.length > 0,
  render(container, data, markDirty) {
    let tableIdx = 0;
    let stringIdx = 0;
    let tableFilter = '';

    const split = el('div', { class: 'split' });
    const left = el('div', { class: 'list-pane' });
    const right = el('div', { class: 'detail-pane' });
    split.append(left, right);
    container.append(split);

    const renderRight = () => {
      clear(right);
      const table = data.messageList[tableIdx];
      if (!table) return;
      right.append(el('h2', { class: 'section-title', text: table.name }));
      if (table.strings.length === 0) {
        right.append(el('div', { class: 'notice', text: 'This table is empty.' }));
        return;
      }
      const inner = el('div', { class: 'split' });
      const strPane = el('div', { class: 'list-pane' });
      const editPane = el('div', { class: 'detail-pane' });
      inner.append(strPane, editPane);
      right.append(inner);

      const { list, setSelected } = recordList({
        count: table.strings.length,
        label: (i) => table.strings[i].string || '(empty)',
        onSelect: (i) => { stringIdx = i; setSelected(i); renderEdit(); },
      });
      strPane.append(el('p', { class: 'pane-title', text: `${table.strings.length} strings` }), list);

      const renderEdit = () => {
        clear(editPane);
        const entry = table.strings[stringIdx];
        if (!entry) return;
        editPane.append(el('p', { class: 'pane-title', text: `String #${entry.id}` }));
        const ta = textArea(entry.string, (v) => { entry.string = v; markDirty(); });
        editPane.append(ta);
        editPane.append(el('p', { class: 'hint', text: 'Control codes use \\var2:XX\\, \\end\\, \\endPage\\ syntax. Unknown bytes appear as <unknown:XX> or <unknown:XXXX>. For Chinese ROMs load an external word table from the toolbar; unknown double-byte codes remain reversible.' }));
      };

      setSelected(stringIdx);
      renderEdit();
    };

    const renderLeft = () => {
      clear(left);
      left.append(el('p', { class: 'pane-title', text: 'Message tables' }));
      left.append(searchBox('Filter tables…', (v) => { tableFilter = v; renderLeft(); }));
      const { list, setSelected } = recordList({
        count: data.messageList.length,
        filter: tableFilter,
        label: (i) => data.messageList[i].name,
        onSelect: (i) => { tableIdx = i; stringIdx = 0; setSelected(i); renderRight(); },
      });
      left.append(list);
      setSelected(tableIdx);
    };

    renderLeft();
    renderRight();
  },
};