import { z } from 'zod'

export const MemoryUsage = z.object({
  total: z.number().min(0),
  used: z.number().min(0)
})
