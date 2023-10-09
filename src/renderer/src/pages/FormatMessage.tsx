import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToastAction } from '@/components/ui/toast'
import { H1 } from '@/components/ui/typography'
import { useToast } from '@/components/ui/use-toast'
import { readable } from '@/lib/filename'
import {
  FormatReport,
  FormatRequest,
  IeListReport,
  IeListRequest,
  OpenFolderRequest
} from '@/lib/message'
import { IeList, QueueItem, ResourceMetadata } from '@/lib/resource'
import { WorkerState } from '@/lib/workerState'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

type Props = {
  resourceList: Array<z.infer<typeof ResourceMetadata>>
  workerState: z.infer<typeof WorkerState>
}

export function FormatMessage({ resourceList, workerState }: Props) {
  const [selectedResourceId, selectResourceId] = useState<string | undefined>()
  const [ieList, setIeList] = useState<z.infer<typeof IeList>>([])
  const [queue, setQueue] = useState<Array<z.infer<typeof QueueItem>>>([])
  const { toast } = useToast()

  function getIeList(id: string) {
    if (!id) {
      return
    }
    window.electron.ipcRenderer.invoke('message', {
      src: 'renderer',
      dest: 'worker',
      channel: 'ieListRequest',
      id
    } satisfies z.infer<typeof IeListRequest>)
  }

  function handleResourceIdChange(id: string) {
    if (workerState === 'busy') {
      return
    }
    selectResourceId(id)
    getIeList(id)
  }

  function addToQueue(name: string, key: string, expand: boolean) {
    if (
      !selectedResourceId ||
      queue.find(
        (queueItem) =>
          queueItem.id === selectedResourceId &&
          queueItem.key === key &&
          queueItem.expand === expand
      )
    ) {
      return
    }
    setQueue([...queue, { id: selectedResourceId, name, key, expand }])
  }

  function addAll(expand: boolean) {
    if (!selectedResourceId) {
      return
    }
    const newQueue = [...queue]
    ieList.forEach(({ key, name }) => {
      if (
        newQueue.find(
          (queueItem) =>
            queueItem.id === selectedResourceId &&
            queueItem.key === key &&
            queueItem.expand === expand
        )
      ) {
        return
      }
      newQueue.push({ id: selectedResourceId, name, key, expand })
    })
    setQueue(newQueue)
  }

  function removeFromQueue(id: string, key: string, expand: boolean) {
    const newQueue = queue.filter(
      (queueItem) => !(queueItem.id === id && queueItem.key === key && queueItem.expand === expand)
    )
    setQueue(newQueue)
  }

  function removeAll() {
    setQueue([])
  }

  function format() {
    if (workerState === 'busy') {
      return
    }
    window.electron.ipcRenderer.invoke('message', {
      src: 'renderer',
      dest: 'worker',
      channel: 'formatRequest',
      queue
    } satisfies z.infer<typeof FormatRequest>)
  }

  useEffect(() => {
    window.electron.ipcRenderer.removeAllListeners('ieListReport')
    window.electron.ipcRenderer.on('ieListReport', (_event, msg: unknown) => {
      const ieListReportParseResult = IeListReport.safeParse(msg)
      if (!ieListReportParseResult.success) {
        return
      }
      const { ieList } = ieListReportParseResult.data
      setIeList(ieList)
    })

    window.electron.ipcRenderer.removeAllListeners('formatReport')
    window.electron.ipcRenderer.on('formatReport', (_event, msg: unknown) => {
      const formatReportParseResult = FormatReport.safeParse(msg)
      if (!formatReportParseResult.success) {
        return
      }
      const { success, saveLocation } = formatReportParseResult.data
      toast({
        title: success ? 'Format success' : 'Format failed',
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
      <H1 className="my-6">Format message</H1>
      <Select
        value={selectedResourceId}
        onValueChange={handleResourceIdChange}
        disabled={workerState === 'busy'}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a resource" />
        </SelectTrigger>
        <SelectContent>
          {resourceList.map(({ id, name }) => (
            <SelectItem key={id} value={id}>
              {id}. {readable(name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex justify-between items-center">
        <span className="space-x-4">
          <span className="font-bold">Add all</span>
          <Button
            variant="outline"
            disabled={!ieList.length}
            onClick={() => {
              addAll(false)
            }}
          >
            Unexpanded
          </Button>
          <Button
            variant="outline"
            disabled={!ieList.length}
            onClick={() => {
              addAll(true)
            }}
          >
            Expanded
          </Button>
        </span>
        <span>
          <Button variant="outline" onClick={removeAll}>
            Remove all
          </Button>
        </span>
      </div>
      <Input placeholder="Search IE" />
      <Tabs defaultValue="pool">
        <TabsList className="w-full">
          <TabsTrigger value="pool" className="flex-1 space-x-2">
            <span>Pool</span>
            <Badge>{ieList.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex-1 space-x-2">
            <span>Queue</span>
            <Badge>{queue.length}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pool">
          <ScrollArea className="h-80 p-4">
            <div className="space-y-2">
              {ieList.map(({ name, key }) => (
                <div key={key} className="flex justify-between border-b">
                  <span className="truncate">{name}</span>
                  <span>
                    <Button
                      variant="link"
                      onClick={() => {
                        addToQueue(name, key, false)
                      }}
                    >
                      Unexpanded
                    </Button>
                    <Button
                      variant="link"
                      onClick={() => {
                        addToQueue(name, key, true)
                      }}
                    >
                      Expanded
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="queue">
          <ScrollArea className="h-80 p-4">
            <div className="space-y-2">
              {queue.map(({ id, name, key, expand }) => (
                <div key={key} className="flex justify-between border-b">
                  <span className="truncate">{name}</span>
                  <span className="space-x-4">
                    <span>{expand ? 'Expanded' : 'Unexpanded'}</span>
                    <Button
                      variant="link"
                      onClick={() => {
                        removeFromQueue(id, key, expand)
                      }}
                    >
                      Remove
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end">
        <Button disabled={!queue.length || workerState === 'busy'} onClick={format}>
          {workerState === 'busy' ? <Loader2 className="animate-spin" /> : 'Format'}
        </Button>
      </div>
    </div>
  )
}
