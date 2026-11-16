import {describe, expect, it} from 'vitest';
import {parseAgendaBullets, toAgendaRequests, validateAgendaTemplate} from './agenda-template';

describe('agenda-template', () => {
  it('parses one bullet per line, stripping markers and blanks', () => {
    expect(parseAgendaBullets('- Wins\n\n * Blockers \n• Goals\n  ')).toEqual(['Wins', 'Blockers', 'Goals']);
  });

  it('validates name, count and length', () => {
    expect(validateAgendaTemplate(' ', ['a'])).toMatch(/name/i);
    expect(validateAgendaTemplate('n', [])).toMatch(/at least one/i);
    expect(validateAgendaTemplate('n', Array(31).fill('a'))).toMatch(/at most/i);
    expect(validateAgendaTemplate('n', ['x'.repeat(301)])).toMatch(/300/);
    expect(validateAgendaTemplate('n', ['a'])).toBeNull();
  });

  it('maps bullets to 1-based ordered agenda requests', () => {
    expect(toAgendaRequests(['a', 'b'])).toEqual([
      {title: 'a', itemOrder: 1},
      {title: 'b', itemOrder: 2},
    ]);
  });
});
