import { create } from 'zustand'
import type {
  ProjectInfo,
  ElementInfo,
  ComponentNode,
  BuildStatus,
  Viewport,
  ActiveView,
  LeftTab,
  SessionMetadata,
  GlassmorphismPreset,
  FileNode,
} from '../types'

interface VeryaStore {
  // Project & Session
  project: ProjectInfo | null
  setProject: (p: ProjectInfo) => void
  session: SessionMetadata | null
  setSession: (s: SessionMetadata | null) => void

  // Selection
  selectedElement: ElementInfo | null
  setSelectedElement: (el: ElementInfo | null) => void

  // Component tree & Files
  componentTree: ComponentNode[]
  setComponentTree: (nodes: ComponentNode[]) => void
  files: FileNode[]
  setFiles: (files: FileNode[]) => void

  // Build status & Terminal logs
  buildStatus: BuildStatus
  setBuildStatus: (s: BuildStatus) => void
  terminalLogs: string[]
  addTerminalLog: (log: string) => void

  // Changed files
  changedFiles: string[]
  addChangedFile: (path: string) => void
  clearChangedFiles: () => void

  // UI state
  activeView: ActiveView
  setActiveView: (v: ActiveView) => void
  leftTab: LeftTab
  setLeftTab: (tab: LeftTab) => void
  viewport: Viewport
  setViewport: (v: Viewport) => void

  // Modals & Panels
  isDiffModalOpen: boolean
  setIsDiffModalOpen: (open: boolean) => void
  isSessionsModalOpen: boolean
  setIsSessionsModalOpen: (open: boolean) => void
  isTerminalOpen: boolean
  setIsTerminalOpen: (open: boolean) => void

  // Code editor state
  activeFile: string | null
  setActiveFile: (file: string | null) => void
  activeFileContent: string
  setActiveFileContent: (content: string) => void

  // Design System (Glassmorphism)
  glassPreset: GlassmorphismPreset
  setGlassPreset: (preset: Partial<GlassmorphismPreset>) => void

  // Undo / Redo history
  undoCount: number
  setUndoCount: (count: number) => void
}

export const useStore = create<VeryaStore>((set) => ({
  // Project & Session
  project: null,
  setProject: (project) => set({ project }),
  session: null,
  setSession: (session) => set({ session }),

  // Selection
  selectedElement: null,
  setSelectedElement: (selectedElement) => set({ selectedElement }),

  // Component tree & Files
  componentTree: [],
  setComponentTree: (componentTree) => set({ componentTree }),
  files: [],
  setFiles: (files) => set({ files }),

  // Build status & Terminal logs
  buildStatus: 'ready',
  setBuildStatus: (buildStatus) => set({ buildStatus }),
  terminalLogs: [
    '✓ Verya runtime initialized',
    '✓ Isolated session active',
    '✓ Live preview connected',
  ],
  addTerminalLog: (log) =>
    set((state) => ({ terminalLogs: [...state.terminalLogs, log] })),

  // Changed files
  changedFiles: [],
  addChangedFile: (path) =>
    set((state) => ({
      changedFiles: state.changedFiles.includes(path)
        ? state.changedFiles
        : [...state.changedFiles, path],
    })),
  clearChangedFiles: () => set({ changedFiles: [] }),

  // UI state
  activeView: 'visual',
  setActiveView: (activeView) => set({ activeView }),
  leftTab: 'components',
  setLeftTab: (leftTab) => set({ leftTab }),
  viewport: 'desktop',
  setViewport: (viewport) => set({ viewport }),

  // Modals & Panels
  isDiffModalOpen: false,
  setIsDiffModalOpen: (isDiffModalOpen) => set({ isDiffModalOpen }),
  isSessionsModalOpen: false,
  setIsSessionsModalOpen: (isSessionsModalOpen) => set({ isSessionsModalOpen }),
  isTerminalOpen: false,
  setIsTerminalOpen: (isTerminalOpen) => set({ isTerminalOpen }),

  // Code editor state
  activeFile: null,
  setActiveFile: (activeFile) => set({ activeFile }),
  activeFileContent: '',
  setActiveFileContent: (activeFileContent) => set({ activeFileContent }),

  // Glassmorphism default preset
  glassPreset: {
    surfaceOpacity: 12,
    blur: 20,
    borderOpacity: 15,
    borderRadius: 24,
    shadow: 'soft',
    accentColor: '#6366f1',
    backgroundDark: true,
  },
  setGlassPreset: (preset) =>
    set((state) => ({ glassPreset: { ...state.glassPreset, ...preset } })),

  undoCount: 0,
  setUndoCount: (undoCount) => set({ undoCount }),
}))
