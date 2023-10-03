import { z } from 'zod'

export const Settings = z.object({
  proxy: z.object({
    use: z.boolean().default(false),
    protocol: z.enum(['http', 'https']),
    host: z.string(),
    port: z.number().int().min(0).max(65535)
  }),
  certificate: z.object({
    use: z.boolean().default(false),
    path: z.string()
  }),
  verifyCertificate: z.boolean().default(true)
})

export const INITIAL_SETTINGS: z.infer<typeof Settings> = {
  proxy: {
    use: false,
    protocol: 'http',
    host: '',
    port: 0
  },
  certificate: {
    use: false,
    path: ''
  },
  verifyCertificate: true
}
