import { Nav } from './components/Nav'
import { ResourceSheet } from './components/ResourceSheet'
import { useEffect, useState } from 'react'
import { Page } from './page'
import { Landing } from './pages/Landing'
import { FormatMessage } from './pages/FormatMessage'
import { DiffAsn1 } from './pages/DiffAsn1'
import { AboutDialog } from './components/AboutDialog'
import { debounce } from '@/lib/debounce'
import { LoadResourceDialog } from './components/LoadResourceDialog'
import { z } from 'zod'
import { Ping, ResourceListReport, WorkerStateReport } from '@/lib/message'
import { WorkerState } from '@/lib/workerState'
import { ResourceMetadata } from '@/lib/resource'
import { Toaster } from '@/components/ui/toaster'

const ping = debounce(() => {
  window.electron.ipcRenderer.invoke('message', {
    src: 'renderer',
    dest: 'worker',
    channel: 'ping'
  } satisfies z.infer<typeof Ping>)
})

function App(): JSX.Element {
  const [page, setPage] = useState(Page.Landing)
  const [openResourceSheet, setOpenResourceSheet] = useState(false)
  const [openLoadResourceDialog, setOpenLoadResourceDialog] = useState(false)
  const [openAboutDialog, setOpenAboutDialog] = useState(false)
  const [workerState, setWorkerState] = useState<z.infer<typeof WorkerState>>('busy')
  const [resourceList, setResourceList] = useState<Array<z.infer<typeof ResourceMetadata>>>([])

  useEffect(() => {
    window.electron.ipcRenderer.removeAllListeners('workerStateReport')
    window.electron.ipcRenderer.on(
      'workerStateReport',
      (_event, { state }: z.infer<typeof WorkerStateReport>) => {
        setWorkerState(state)
      }
    )

    window.electron.ipcRenderer.removeAllListeners('resourceListReport')
    window.electron.ipcRenderer.on(
      'resourceListReport',
      (_event, msg: z.infer<typeof ResourceListReport>) => {
        const { resourceList } = msg
        setResourceList(resourceList)
      }
    )

    ping()
  }, [])

  return (
    <div className="container">
      <Nav
        onSelectPage={setPage}
        onOpenResourceSheet={() => setOpenResourceSheet(true)}
        onOpenLoadResourceDialog={() => setOpenLoadResourceDialog(true)}
        onOpenAboutDialog={() => setOpenAboutDialog(true)}
        workerState={workerState}
      />
      {page === Page.Landing && <Landing />}
      {page === Page.FormatMessage && (
        <FormatMessage resourceList={resourceList} workerState={workerState} />
      )}
      {page === Page.DiffASN1 && <DiffAsn1 resourceList={resourceList} workerState={workerState} />}
      <ResourceSheet
        open={openResourceSheet}
        onOpenChange={setOpenResourceSheet}
        workerState={workerState}
        resourceList={resourceList}
      />
      <LoadResourceDialog
        open={openLoadResourceDialog}
        onOpenChange={setOpenLoadResourceDialog}
        workerState={workerState}
        setWorkerState={setWorkerState}
      />
      <AboutDialog open={openAboutDialog} onOpenChange={setOpenAboutDialog} />
      <Toaster />
    </div>
  )
}

export default App
