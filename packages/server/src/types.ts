export interface ProjectInfo {
  name: string;
  root: string;           // active session root (or project root if no session)
  originalRoot: string;   // actual original project root on disk
  sessionId: string;      // active session id
  framework: 'react';
  language: 'typescript' | 'javascript';
  packageManager: 'npm' | 'yarn' | 'pnpm';
  hasTailwind: boolean;
  hasCSS: boolean;
  entryFile: string;      // path to entry file
  previewUrl: string;     // e.g. "http://localhost:5173" (proxied by Verya)
}

export interface SessionMetadata {
  id: string;
  name: string;
  originalRoot: string;
  sessionRoot: string;
  createdAt: string;
  updatedAt: string;
  saved: boolean;
  modifiedFiles: string[];
  originalSnapshots: Record<string, { mtime: number; size: number }>;
}

export interface SessionFileDiff {
  path: string;           // relative path
  originalContent: string;
  sessionContent: string;
  diff: string;
  hasConflict: boolean;
  conflictReason?: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

export interface SessionDiffResponse {
  sessionId: string;
  files: SessionFileDiff[];
  hasAnyConflict: boolean;
  summary: {
    totalModified: number;
    conflicts: number;
  };
}

export interface FileNode {
  name: string;
  path: string;           // relative to active root
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface ComponentNode {
  id: string;             // unique id (file + line)
  name: string;
  file: string;           // path
  line: number;
  tagName?: string;
  className?: string;
  children?: ComponentNode[];
}

export interface ElementInfo {
  tagName: string;
  id: string;
  className: string;
  componentName: string | null;
  rect: { top: number; left: number; width: number; height: number };
  computedStyle: {
    display: string; width: string; height: string;
    padding: string; paddingTop: string; paddingRight: string;
    paddingBottom: string; paddingLeft: string;
    margin: string; marginTop: string; marginRight: string;
    marginBottom: string; marginLeft: string;
    backgroundColor: string; color: string;
    fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string;
    textAlign: string; textDecoration: string;
    borderRadius: string; border: string; borderColor: string; borderWidth: string;
    opacity: string; boxShadow: string;
    flexDirection: string; alignItems: string; justifyContent: string; gap: string;
    position: string; top: string; left: string; right: string; bottom: string;
    overflow: string; cursor: string;
  };
}

export interface TransformRequest {
  file: string;           // path to file to transform
  selector: {
    componentName?: string;
    tagName: string;
    className?: string;   // current className to match element
    index?: number;       // if multiple matches, which one (0-based)
  };
  changes: StyleChange[];
}

export interface StyleChange {
  property: string;       // CSS property (camelCase): 'padding', 'backgroundColor', etc.
  value: string;          // new value: '24px', '#FF0000', 'flex', etc.
  unit?: string;
}

export interface GlassmorphismPreset {
  surfaceOpacity: number; // 0-100 (e.g. 14)
  blur: number;           // in px (e.g. 20)
  borderOpacity: number;  // 0-100 (e.g. 18)
  borderRadius: number;   // in px (e.g. 24)
  shadow: 'none' | 'soft' | 'glow' | 'deep';
  accentColor: string;    // e.g. '#6366f1' or '#ff7a18'
  backgroundDark: boolean;
}
