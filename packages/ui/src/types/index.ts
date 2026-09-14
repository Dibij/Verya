export interface ProjectInfo {
  name: string;
  root: string;
  originalRoot?: string;
  sessionId?: string;
  framework: 'react';
  language: 'typescript' | 'javascript';
  packageManager: 'npm' | 'yarn' | 'pnpm';
  hasTailwind: boolean;
  hasCSS: boolean;
  entryFile: string;
  previewUrl: string;
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
}

export interface SessionFileDiff {
  path: string;
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
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface ComponentNode {
  id: string;
  name: string;
  file: string;
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
    display: string;
    width: string;
    height: string;
    padding: string;
    paddingTop: string;
    paddingRight: string;
    paddingBottom: string;
    paddingLeft: string;
    margin: string;
    marginTop: string;
    marginRight: string;
    marginBottom: string;
    marginLeft: string;
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
    textAlign: string;
    textDecoration: string;
    borderRadius: string;
    border: string;
    borderColor: string;
    borderWidth: string;
    opacity: string;
    boxShadow: string;
    flexDirection: string;
    alignItems: string;
    justifyContent: string;
    gap: string;
    position: string;
    top: string;
    left: string;
    right: string;
    bottom: string;
    overflow: string;
    cursor: string;
  };
}

export interface TransformRequest {
  file: string;
  selector: {
    componentName?: string;
    tagName: string;
    className?: string;
    index?: number;
  };
  changes: StyleChange[];
}

export interface StyleChange {
  property: string;
  value: string;
  unit?: string;
}

export interface GlassmorphismPreset {
  surfaceOpacity: number; // 0 - 100
  blur: number;           // px
  borderOpacity: number;  // 0 - 100
  borderRadius: number;   // px
  shadow: 'none' | 'soft' | 'glow' | 'deep';
  accentColor: string;
  backgroundDark: boolean;
}

export type BuildStatus = 'ready' | 'compiling' | 'error' | 'idle';

export type ServerMessage =
  | { type: 'FILE_CHANGED'; path: string; content: string }
  | { type: 'BUILD_STATUS'; status: BuildStatus; message?: string }
  | { type: 'SESSION_SAVED'; session: SessionMetadata }
  | { type: 'CHANGES_ACCEPTED'; accepted: string[]; backupPath: string };

export type Viewport = 'desktop' | 'tablet' | 'mobile';
export type ActiveView = 'visual' | 'code' | 'split';
export type LeftTab = 'components' | 'files' | 'design' | 'assets';
