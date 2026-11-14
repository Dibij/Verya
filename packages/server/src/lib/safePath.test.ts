import { describe, it, expect } from 'vitest';
import { resolveWithin, isWithin, isValidSessionId, PathEscapeError } from './safePath.js';

describe('resolveWithin', () => {
  const root = '/home/user/project';

  it('resolves children of the root', () => {
    expect(resolveWithin(root, 'src/App.tsx')).toBe('/home/user/project/src/App.tsx');
    expect(resolveWithin(root, '/home/user/project/src/App.tsx')).toBe(
      '/home/user/project/src/App.tsx',
    );
  });

  it('allows the root itself', () => {
    expect(resolveWithin(root, '.')).toBe(root);
  });

  it('rejects traversal', () => {
    expect(() => resolveWithin(root, '../secret')).toThrow(PathEscapeError);
    expect(() => resolveWithin(root, '../../etc/passwd')).toThrow(PathEscapeError);
    expect(() => resolveWithin(root, 'src/../../../etc/passwd')).toThrow(PathEscapeError);
  });

  it('rejects sibling-prefix confusion', () => {
    expect(() => resolveWithin('/home/user/proj', '/home/user/proj-evil/x')).toThrow(
      PathEscapeError,
    );
  });
});

describe('isWithin', () => {
  it('mirrors resolveWithin without throwing', () => {
    expect(isWithin('/a/b', 'c/d')).toBe(true);
    expect(isWithin('/a/b', '../c')).toBe(false);
  });
});

describe('isValidSessionId', () => {
  it('accepts UUIDs', () => {
    expect(isValidSessionId('00000000-0000-4000-8000-000000000000')).toBe(true);
  });

  it('rejects traversal payloads and non-strings', () => {
    expect(isValidSessionId('../../etc')).toBe(false);
    expect(isValidSessionId('..')).toBe(false);
    expect(isValidSessionId('')).toBe(false);
    expect(isValidSessionId(undefined)).toBe(false);
    expect(isValidSessionId(42)).toBe(false);
  });
});
