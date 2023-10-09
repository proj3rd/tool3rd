import { z } from 'zod'
import { MemoryUsage } from './memoryUsage'
import { IeList, QueueItem, ResourceMetadata } from './resource'
import { WorkerState } from './workerState'

const Process = z.enum(['main', 'worker', 'renderer'])

export const Channels = {
  Ping: z.literal('ping'),
  MemoryUsageReport: z.literal('memoryUsageReport'),
  ResourceLoadRequest: z.literal('resourceLoadRequest'),
  ResourceUnloadRequest: z.literal('resourceUnloadRequest'),
  ResourceListReport: z.literal('resourceListReport'),
  IeListRequest: z.literal('ieListRequest'),
  IeListReport: z.literal('ieListReport'),
  FormatRequest: z.literal('formatRequest'),
  FormatReport: z.literal('formatReport'),
  SaveLocationRequest: z.literal('saveLocationRequest'),
  SaveLocationResponse: z.literal('saveLocationResponse'),
  OpenFolderRequest: z.literal('openFolderRequest'),
  WorkerStateReport: z.literal('workerStateReport')
}

export const Message = z.object({
  src: Process,
  dest: Process,
  channel: z.string()
})

export const Ping = Message.merge(
  z.object({
    channel: Channels.Ping
  })
)

export const MemoryUsageReport = Message.merge(
  z
    .object({
      channel: Channels.MemoryUsageReport
    })
    .merge(MemoryUsage)
)

export const ResourceLoadRequest = Message.merge(
  z.object({
    channel: Channels.ResourceLoadRequest,
    name: z.string(),
    serialized: z.string()
  })
)

export const ResourceUnloadRequest = Message.merge(
  z.object({
    channel: Channels.ResourceUnloadRequest
  })
).merge(ResourceMetadata.pick({ id: true }))

export const ResourceListReport = Message.merge(
  z.object({
    channel: Channels.ResourceListReport,
    resourceList: z.array(ResourceMetadata)
  })
)

export const IeListRequest = Message.merge(
  z.object({
    channel: Channels.IeListRequest
  })
).merge(ResourceMetadata.pick({ id: true }))

export const IeListReport = Message.merge(
  z.object({
    channel: Channels.IeListReport,
    ieList: IeList
  })
)

export const FormatRequest = Message.merge(
  z.object({
    channel: Channels.FormatRequest,
    queue: z.array(QueueItem)
  })
)

export const FormatReport = Message.merge(
  z.object({
    channel: Channels.FormatReport,
    saveLocation: z.string().optional(),
    success: z.boolean()
  })
)

export const SaveLocationRequest = Message.merge(
  z.object({
    channel: Channels.SaveLocationRequest
  })
)

export const SaveLocationResponse = Message.merge(
  z.object({
    channel: Channels.SaveLocationResponse,
    saveLocation: z.string().optional()
  })
)

export const WorkerStateReport = Message.merge(
  z.object({
    channel: Channels.WorkerStateReport,
    state: WorkerState
  })
)

export const OpenFolderRequest = Message.merge(
  z.object({
    channel: Channels.OpenFolderRequest,
    location: z.string()
  })
)
