import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { H1 } from '@/components/ui/typography'
import { useToast } from '@/components/ui/use-toast'
import { readable } from '@/lib/filename'
import { DiffReport, DiffRequest, OpenFolderRequest } from '@/lib/message'
import { ResourceMetadata } from '@/lib/resource'
import { WorkerState } from '@/lib/workerState'
import { ToastAction } from '@/components/ui/toast'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

type Props = {
  resourceList: Array<z.infer<typeof ResourceMetadata>>
  workerState: z.infer<typeof WorkerState>
}

export function DiffAsn1({ resourceList, workerState }: Props) {
  const asn1ResourceList = resourceList.filter(({ type }) => type === 'asn1')

  const [selectedOldResourceId, selectOldResourceId] = useState<string | undefined>()
  const [selectedNewResourceId, selectNewResourceId] = useState<string | undefined>()
  const { toast } = useToast()

  function diff() {
    if (!selectedOldResourceId || !selectedNewResourceId || workerState === 'busy') {
      return
    }
    window.electron.ipcRenderer.invoke('message', {
      src: 'renderer',
      dest: 'worker',
      channel: 'diffRequest',
      oldResourceId: selectedOldResourceId,
      newResourceId: selectedNewResourceId
    } satisfies z.infer<typeof DiffRequest>)
  }

  useEffect(() => {
    window.electron.ipcRenderer.removeAllListeners('diffReport')
    window.electron.ipcRenderer.on('diffReport', (_event, msg: unknown) => {
      const diffReportParseResult = DiffReport.safeParse(msg)
      if (!diffReportParseResult.success) {
        return
      }
      const { success, saveLocation } = diffReportParseResult.data
      toast({
        title: success ? 'Diff success' : 'Diff failed',
        description:
          !success && (saveLocation ? `Save failed to ${saveLocation}` : 'Save is canceled'),
        action:
          success && saveLocation ? (
            <ToastAction
              altText="Open folder"
              onClick={() => {
                window.electron.ipcRenderer.invoke('message', {
                  src: 'renderer',
                  dest: 'main',
                  channel: 'openFolderRequest',
                  location: saveLocation
                } satisfies z.infer<typeof OpenFolderRequest>)
              }}
            >
              Open folder
            </ToastAction>
          ) : undefined
      })
    })
  }, [])

  return (
    <div className="space-y-4">
      <H1 className="my-6">Diff ASN.1</H1>
      <Select
        value={selectedOldResourceId}
        onValueChange={selectOldResourceId}
        disabled={workerState === 'busy'}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an old resource" />
        </SelectTrigger>
        <SelectContent>
          {asn1ResourceList.map(({ id, name }) => (
            <SelectItem key={id} value={id}>
              {id}. {readable(name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={selectedNewResourceId}
        onValueChange={selectNewResourceId}
        disabled={workerState === 'busy'}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a new resource" />
        </SelectTrigger>
        <SelectContent>
          {asn1ResourceList.map(({ id, name }) => (
            <SelectItem key={id} value={id}>
              {id}. {readable(name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex justify-end">
        <Button
          disabled={
            !selectedOldResourceId ||
            !selectedNewResourceId ||
            selectedOldResourceId === selectedNewResourceId ||
            workerState === 'busy'
          }
          onClick={diff}
        >
          {workerState === 'busy' ? <Loader2 className="animate-spin" /> : 'Diff'}
        </Button>
      </div>
    </div>
  )
}
