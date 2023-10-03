import { Modules } from 'lib3rd/dist/asn1/classes/modules'
import { Definitions } from 'lib3rd/dist/ran3/classes/definitions'
import { z } from 'zod'

export const ResourceMetadata = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['asn1', 'tabular'])
})

export type Resource = z.infer<typeof ResourceMetadata> & {
  resource: Modules | Definitions
}

export const IeList = z.array(
  z.object({
    name: z.string(),
    key: z.string()
  })
)

export const QueueItem = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  expand: z.boolean()
})
