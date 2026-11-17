// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { enumInput, referenceInput } from '../src/ui/referenceSelect';
import { Race } from '../src/data/model/enums';

describe('reference and enum controls', () => {
  it('renders related ids as a searchable dropdown with readable labels', () => {
    let selected = -1;
    const control = referenceInput(1, [
      { id: 1, name: '士兵' },
      { id: 2, name: '盗贼' },
    ], (id) => { selected = id; });
    const input = control.querySelector('input')!;
    expect(input.value).toBe('#1 士兵');
    input.dispatchEvent(new Event('focus'));
    const labels = [...control.querySelectorAll('.search-select-option')].map((o) => o.textContent);
    expect(labels).toContain('#1 士兵');
    expect(labels).toContain('#2 盗贼');

    input.value = '盗';
    input.dispatchEvent(new Event('input'));
    const filtered = [...control.querySelectorAll('.search-select-option')];
    expect(filtered).toHaveLength(1);
    expect(filtered[0].textContent).toBe('#2 盗贼');
    filtered[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(selected).toBe(2);
    expect(input.value).toBe('#2 盗贼');
  });

  it('shows an unknown current id instead of an empty control', () => {
    const control = referenceInput(42, [{ id: 1, name: 'A' }], () => {});
    expect(control.querySelector('input')!.value).toBe('#42');
  });

  it('renders enum choices as names instead of raw numbers', () => {
    let selected = -1;
    const select = enumInput(1, Race, (id) => { selected = id; });
    expect([...select.options].some((o) => o.textContent?.includes('HUME'))).toBe(true);
    select.value = '4';
    select.dispatchEvent(new Event('change'));
    expect(selected).toBe(4);
  });
});
