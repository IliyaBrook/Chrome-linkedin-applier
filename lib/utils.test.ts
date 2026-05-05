import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn()', () => {
  it('merges plain class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '')).toBe('a');
  });

  it('resolves conflicting tailwind utilities (later wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('accepts conditional object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });
});
