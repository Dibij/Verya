import type {
  ProjectInfo,
  FileNode,
  ComponentNode,
  TransformRequest,
  SessionMetadata,
  SessionDiffResponse,
} from '../types'

const BASE = window.location.origin

async function safeFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init)
    if (!res.ok) {
      console.error(`[api] ${init?.method ?? 'GET'} ${url} → ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`[api] fetch error for ${url}:`, err)
    return null
  }
}

export const api = {
  async getProject(): Promise<ProjectInfo | null> {
    return safeFetch<ProjectInfo>(`${BASE}/api/project`)
  },

  async getFiles(): Promise<FileNode[]> {
    const result = await safeFetch<FileNode[]>(`${BASE}/api/files`)
    return result ?? []
  },

  async getFile(path: string): Promise<{ content: string } | null> {
    return safeFetch<{ content: string }>(
      `${BASE}/api/files/file?path=${encodeURIComponent(path)}`
    )
  },

  async transform(
    req: TransformRequest
  ): Promise<{ success: boolean; newContent?: string; error?: string }> {
    const result = await safeFetch<{
      success: boolean
      newContent?: string
      error?: string
    }>(`${BASE}/api/transform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    return result ?? { success: false, error: 'Network error' }
  },

  async getComponentTree(file: string): Promise<ComponentNode[]> {
    const result = await safeFetch<ComponentNode[]>(
      `${BASE}/api/component-tree?file=${encodeURIComponent(file)}`
    )
    return result ?? []
  },

  async getSessions(all = false): Promise<SessionMetadata[]> {
    const result = await safeFetch<SessionMetadata[]>(`${BASE}/api/sessions?all=${all}`)
    return result ?? []
  },

  async saveSession(name?: string): Promise<{ success: boolean; session?: SessionMetadata }> {
    const result = await safeFetch<{ success: boolean; session?: SessionMetadata }>(
      `${BASE}/api/sessions/save`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }
    )
    return result ?? { success: false }
  },

  async getSessionDiff(sessionId: string): Promise<SessionDiffResponse | null> {
    return safeFetch<SessionDiffResponse>(`${BASE}/api/sessions/${sessionId}/diff`)
  },

  async acceptChanges(
    sessionId: string,
    files?: string[]
  ): Promise<{ success: boolean; accepted: string[]; backupPath: string } | null> {
    return safeFetch<{ success: boolean; accepted: string[]; backupPath: string }>(
      `${BASE}/api/sessions/${sessionId}/accept`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      }
    )
  },

  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await safeFetch<{ success: boolean }>(
      `${BASE}/api/sessions/${sessionId}`,
      { method: 'DELETE' }
    )
    return result?.success ?? false
  },
}
