import { useStore } from '../store'
import { api } from './api'
import type { TransformRequest } from '../types'
import { buildSelector, resolveTargetFile } from './selector'

/**
 * Shared transform pipeline used by every property section. Keeping this in one
 * place ensures all sections send the same selector shape (they previously
 * disagreed on how many class tokens to send) and resolve the target file the
 * same way.
 */
export function useTransform() {
  const project = useStore((s) => s.project)
  const componentTree = useStore((s) => s.componentTree)
  const selectedElement = useStore((s) => s.selectedElement)
  const updateSelectedElementStyle = useStore((s) => s.updateSelectedElementStyle)
  const setBuildStatus = useStore((s) => s.setBuildStatus)
  const addTerminalLog = useStore((s) => s.addTerminalLog)

  return async (property: string, value: string, unit?: string): Promise<boolean> => {
    if (!selectedElement || !project) return false

    let finalValue = value
    if (unit && !finalValue.endsWith(unit) && /^-?\d+(\.\d+)?$/.test(finalValue.trim())) {
      finalValue = `${finalValue.trim()}${unit}`
    }

    updateSelectedElementStyle(property, finalValue)

    const target = resolveTargetFile(selectedElement, project, componentTree)
    const req: TransformRequest = {
      file: target.file,
      selector: buildSelector(selectedElement),
      changes: [{ property, value: finalValue, unit }],
    }

    setBuildStatus('compiling')
    const result = await api.transform(req)

    if (!result.success) {
      setBuildStatus('error')
      addTerminalLog(`✖ Transform failed for ${target.file}: ${result.error ?? 'unknown error'}`)
      return false
    }

    setBuildStatus('ready')
    return true
  }
}
