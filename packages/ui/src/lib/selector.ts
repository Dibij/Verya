import type { ElementInfo, ProjectInfo, TransformRequest, ComponentNode } from '../types'

/**
 * Build the selector payload sent to the server.
 *
 * `source` is the authoritative match key: React's dev-mode `_debugSource`
 * gives us the exact file/line of the JSX call site, which is the only way to
 * identify one element among many identical tags in a multi-file project. The
 * class/tag fields are fallbacks for production builds where `_debugSource` is
 * stripped.
 */
export function buildSelector(el: ElementInfo): TransformRequest['selector'] {
  return {
    tagName: el.tagName,
    className: el.className ? el.className.split(/\s+/).filter(Boolean).join(' ') : undefined,
    componentName: el.componentName ?? undefined,
    index: el.index,
    source: el.source
      ? { line: el.source.line, column: el.source.column }
      : undefined,
  }
}

export interface ResolvedTarget {
  file: string
  /** True when the element's file came from its React source location. */
  authoritative: boolean
}

/**
 * Resolve which file an edit should be applied to.
 *
 * 1. Use the React `_debugSource` file when it lives inside the project root.
 * 2. Otherwise fall back to the component tree, then the project entry file.
 */
export function resolveTargetFile(
  el: ElementInfo,
  project: ProjectInfo,
  componentTree: ComponentNode[],
): ResolvedTarget {
  const sourceFile = el.source?.fileName
  if (sourceFile) {
    const normalized = normalizeToProjectPath(sourceFile, project.root)
    if (normalized) return { file: normalized, authoritative: true }
  }

  if (el.componentName) {
    const node = componentTree.find((n) => n.name === el.componentName)
    if (node) return { file: node.file, authoritative: false }
  }

  return { file: project.entryFile, authoritative: false }
}

function normalizeToProjectPath(fileName: string, projectRoot: string): string | null {
  const cleaned = fileName.split('?')[0] ?? fileName
  const normalizedRoot = projectRoot.replace(/\\/g, '/').replace(/\/+$/, '')
  const normalizedFile = cleaned.replace(/\\/g, '/')

  if (normalizedFile.startsWith(`${normalizedRoot}/`)) {
    return normalizedFile.slice(normalizedRoot.length + 1)
  }
  return null
}
