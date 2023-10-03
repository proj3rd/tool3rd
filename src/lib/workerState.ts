import { z } from 'zod'

export const WorkerState = z.enum(['idle', 'busy'])
