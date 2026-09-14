import { useEffect, useRef } from 'react'
import { api } from './lib/api'
import { createWsClient } from './lib/ws'
import { useStore } from './store'
import type { ElementInfo, ServerMessage } from './types'
import { AppShell } from './components/layout/AppShell'

function App() {
  const setProject = useStore((s) => s.setProject)
  const setSession = useStore((s) => s.setSession)
  const setBuildStatus = useStore((s) => s.setBuildStatus)
  const addChangedFile = useStore((s) => s.addChangedFile)
  const setSelectedElement = useStore((s) => s.setSelectedElement)
  const setComponentTree = useStore((s) => s.setComponentTree)
  const setFiles = useStore((s) => s.setFiles)
  const addTerminalLog = useStore((s) => s.addTerminalLog)
  const project = useStore((s) => s.project)

  const wsClientRef = useRef<ReturnType<typeof createWsClient> | null>(null)

  // Fetch project & session info on mount
  useEffect(() => {
    api.getProject().then((p) => {
      if (p) {
        setProject(p)
        addTerminalLog(`Project loaded: ${p.name} (${p.framework} + ${p.language})`)

        // Load files
        api.getFiles().then((f) => setFiles(f))

        // Load entry file component tree
        if (p.entryFile) {
          api.getComponentTree(p.entryFile).then((tree) => {
            setComponentTree(tree)
          })
        }
      }
    })

    // Fetch active session metadata
    fetch('/api/sessions/current')
      .then((r) => r.json())
      .then((s) => {
        if (s && s.id) {
          setSession(s)
          addTerminalLog(`Attached to session: ${s.name}`)
        }
      })
      .catch(() => {})
  }, [setProject, setSession, setFiles, setComponentTree, addTerminalLog])

  // Connect WebSocket
  useEffect(() => {
    const client = createWsClient()
    wsClientRef.current = client

    const unsub = client.subscribe((msg: ServerMessage) => {
      if (msg.type === 'BUILD_STATUS') {
        setBuildStatus(msg.status)
      } else if (msg.type === 'FILE_CHANGED') {
        addChangedFile(msg.path)
        addTerminalLog(`Source change detected: ${msg.path}`)
      } else if (msg.type === 'SESSION_SAVED') {
        setSession(msg.session)
      }
    })

    return () => {
      unsub()
      client.disconnect()
    }
  }, [setBuildStatus, addChangedFile, setSession, addTerminalLog])

  // Listen for postMessage from iframe (VERYA_SELECT)
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'VERYA_SELECT') {
        const payload = event.data.payload as ElementInfo
        setSelectedElement(payload)

        // Try to fetch component tree for the relevant file
        if (project?.entryFile) {
          const tree = await api.getComponentTree(project.entryFile)
          setComponentTree(tree)
        }
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [setSelectedElement, setComponentTree, project])

  return <AppShell />
}

export default App
