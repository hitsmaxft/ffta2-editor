// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { enumInput, referenceInput } from '../src/ui/referenceSelect';
import { Race } from '../src/data/model/enums';

describe('reference and enum controls', () => {
  it('shows readable reference labels and resolves autocomplete choices', () => {
    let selected = -1;
    const control = referenceInput(1, [
      { id: 1, name: '士兵' },
      { id: 2, name: '盗贼' },
    ], (id) => { selected = id; });
    const input = control.querySelector('input')!;
    expect(input.value).toBe('#1 士兵');
    const options = [...control.querySelectorAll('option')].map((o) => o.value);
    expect(options).toContain('#2 盗贼');

    input.value = '#2 盗贼';
    input.dispatchEvent(new Event('change'));
    expect(selected).toBe(2);
  });

  it('accepts a raw numeric id and restores on invalid input', () => {
    let selected = -1;
    const control = referenceInput(1, [{ id: 1, name: 'A' }], (id) => { selected = id; });
    const input = control.querySelector('input')!;
    input.value = '42';
    input.dispatchEvent(new Event('change'));
    expect(selected).toBe(42);

    input.value = 'not an id';
    input.dispatchEvent(new Event('change'));
    expect(input.classList.contains('invalid')).toBe(true);
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
