import { describe, it, expect } from 'vitest';
import { computeLineDiff } from './manager.js';

function render(oldStr: string, newStr: string): string[] {
  const ops = computeLineDiff(oldStr.split('\n'), newStr.split('\n'));
  return ops.map((op) => {
    if (op.type === 'equal') return ` ${oldStr.split('\n')[op.oldIndex] ?? ''}`;
    if (op.type === 'delete') return `-${oldStr.split('\n')[op.oldIndex] ?? ''}`;
    return `+${newStr.split('\n')[op.newIndex] ?? ''}`;
  });
}

describe('computeLineDiff', () => {
  it('produces no changes for identical input', () => {
    const out = render('a\nb\nc', 'a\nb\nc');
    expect(out).toEqual([' a', ' b', ' c']);
  });

  it('detects an inserted line', () => {
    const out = render('a\nc', 'a\nb\nc');
    expect(out).toContain('+b');
    expect(out).not.toContain('-c');
  });

  it('detects a modified line without reordering everything', () => {
    const out = render('a\nb\nc\nd', 'a\nB\nc\nd');
    expect(out).toEqual([' a', '-b', '+B', ' c', ' d']);
  });

  it('handles duplicated lines correctly', () => {
    const out = render('x\nx\ny', 'x\ny');
    expect(out.filter((l) => l.startsWith('-'))).toHaveLength(1);
  });

  it('round-trips deletions', () => {
    const oldStr = 'one\ntwo\nthree';
    const newStr = 'one\nthree';
    const ops = computeLineDiff(oldStr.split('\n'), newStr.split('\n'));
    const deleted = ops.filter((o) => o.type === 'delete').map((o) => oldStr.split('\n')[o.oldIndex]);
    expect(deleted).toEqual(['two']);
  });
});
