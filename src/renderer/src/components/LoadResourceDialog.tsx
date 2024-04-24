import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { readable } from '@/lib/filename'
import { ResourceLoadRequest } from '@/lib/message'
import { WorkerState } from '@/lib/workerState'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useToast } from './ui/use-toast'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workerState: z.infer<typeof WorkerState>
  setWorkerState: (workerState: z.infer<typeof WorkerState>) => void
}

type SpecDir = {
  name: string
  children: string[]
}

type SeriesDir = {
  name: string
  children: SpecDir[]
}

export function LoadResourceDialog({ open, onOpenChange, workerState, setWorkerState }: Props) {
  const [dirStruct, setDirStruct] = useState<SeriesDir[]>([])
  const [selectedSeries, selectSeries] = useState<string | undefined>()
  const [selectedSpec, selectSpec] = useState<string | undefined>()
  const [selectedVersion, selectVersion] = useState<string | undefined>()
  const { toast } = useToast()

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/gh/proj3rd/3gpp-specs-in-json/.dir-list.json')
      .then((response) => response.json())
      .then((json) => {
        setDirStruct(json)
      })
      .catch((reason) => {
        console.error(reason)
      })
  }, [])

  useEffect(() => {
    if (open === true && workerState === 'idle') {
      toast({ title: 'Done' })
    }
  }, [workerState])

  function handleOpenChange(open: boolean) {
    if (workerState === 'busy') {
      return
    }
    onOpenChange(open)
  }

  function load() {
    if (!selectedSeries || !selectedSpec || !selectedVersion) {
      return
    }
    setWorkerState('busy')
    fetch(
      `https://cdn.jsdelivr.net/gh/proj3rd/3gpp-specs-in-json/${selectedSeries}/${selectedSpec}/${selectedVersion}`
    )
      .then((response) => response.text())
      .then((serialized) => {
        window.electron.ipcRenderer.invoke('message', {
          src: 'renderer',
          dest: 'worker',
          channel: 'resourceLoadRequest',
          name: selectedVersion,
          serialized
        } satisfies z.infer<typeof ResourceLoadRequest>)
      })
      .catch((reason) => {
        console.error(reason)
      })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Load resource from cloud</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            disabled={!dirStruct.length}
            value={selectedSeries}
            onValueChange={(value) => {
              selectVersion(undefined)
              selectSpec(undefined)
              selectSeries(value)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a series" />
            </SelectTrigger>
            <SelectContent>
              {dirStruct.map(({ name }) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            disabled={!dirStruct.length || !selectedSeries}
            value={selectedSpec}
            onValueChange={(value) => {
              selectVersion(undefined)
              selectSpec(value)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a spec" />
            </SelectTrigger>
            <SelectContent>
              {dirStruct
                .find(({ name }) => name === selectedSeries)
                ?.children.map(({ name }) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            disabled={!dirStruct.length || !selectedSeries || !selectedSpec}
            value={selectedVersion}
            onValueChange={(value) => {
              selectVersion(value)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a version" />
            </SelectTrigger>
            <SelectContent>
              <div className="max-h-48">
                <ScrollArea>
                  {dirStruct
                    .find(({ name }) => name === selectedSeries)
                    ?.children.find(({ name }) => name === selectedSpec)
                    ?.children.map((version) => (
                      <SelectItem key={version} value={version}>
                        {readable(version)}
                      </SelectItem>
                    ))}
                </ScrollArea>
              </div>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button disabled={!selectedVersion || workerState === 'busy'} onClick={load}>
            {workerState === 'busy' ? <Loader2 className="animate-spin" /> : 'Load'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
