import path from 'path';

/**
 * Resolve `candidate` and guarantee it stays inside `root`.
 * Throws on traversal attempts so callers can map to a 403.
 */
export function resolveWithin(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, candidate);
  const rel = path.relative(resolvedRoot, resolved);

  if (rel === '') return resolved;
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new PathEscapeError(candidate);
  }
  return resolved;
}

export function isWithin(root: string, candidate: string): boolean {
  try {
    resolveWithin(root, candidate);
    return true;
  } catch {
    return false;
  }
}

export class PathEscapeError extends Error {
  constructor(candidate: string) {
    super(`Path is outside of the allowed root: ${candidate}`);
    this.name = 'PathEscapeError';
  }
}

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value);
}
