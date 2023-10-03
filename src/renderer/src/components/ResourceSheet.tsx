import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Muted } from '@/components/ui/typography'
import { readable } from '@/lib/filename'
import { MemoryUsage } from '@/lib/memoryUsage'
import { MemoryUsageReport, ResourceUnloadRequest } from '@/lib/message'
import { ResourceMetadata } from '@/lib/resource'
import { WorkerState } from '@/lib/workerState'
import { useEffect, useState } from 'react'
import { z } from 'zod'

const MBits = 1024 * 1024

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workerState: z.infer<typeof WorkerState>
  resourceList: Array<z.infer<typeof ResourceMetadata>>
}

export function ResourceSheet({ workerState, resourceList, ...sheetProps }: Props) {
  const [memoryUsage, setMemoryUsage] = useState<z.infer<typeof MemoryUsage>>({
    total: 0,
    used: 0
  })

  useEffect(() => {
    window.electron.ipcRenderer.removeAllListeners('memoryUsageReport')
    window.electron.ipcRenderer.on(
      'memoryUsageReport',
      (_event, msg: z.infer<typeof MemoryUsageReport>) => {
        const { channel, ...memoryUsage } = msg
        setMemoryUsage(memoryUsage)
      }
    )
  }, [])

  function unload(id: string) {
    if (workerState === 'busy') {
      return
    }
    window.electron.ipcRenderer.invoke('message', {
      src: 'renderer',
      dest: 'worker',
      channel: 'resourceUnloadRequest',
      id
    } satisfies z.infer<typeof ResourceUnloadRequest>)
  }

  const { total, used } = memoryUsage

  return (
    <Sheet {...sheetProps}>
      <SheetContent>
        <ScrollArea className="h-full">
          <SheetHeader className="mb-4">
            <SheetTitle>Resources</SheetTitle>
          </SheetHeader>
          <div className="text-center mb-4">
            <Progress value={(used / total) * 100}></Progress>
            <Muted className="text-xs">
              {(used / MBits) | 0} / {(total / MBits) | 0} MB Used
            </Muted>
          </div>
          {resourceList.map(({ id, name, type }, index) => (
            <Card key={index} className="mb-4">
              <CardHeader className="p-3">
                <CardDescription>
                  {id}. {readable(name)}
                </CardDescription>
              </CardHeader>
              <CardFooter className="p-3 pt-0 flex justify-between">
                <Badge variant="outline">{type}</Badge>
                <Button variant="link" disabled={workerState === 'busy'} onClick={() => unload(id)}>
                  Unload
                </Button>
              </CardFooter>
            </Card>
          ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
