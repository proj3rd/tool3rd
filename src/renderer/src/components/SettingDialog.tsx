import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SettingsGetRequest, SettingsSetRequest } from '@/lib/message'
import { INITIAL_SETTINGS } from '@/lib/settings'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingDialog({ ...dialogProps }: Props) {
  const [settings, setSettings] = useState<typeof INITIAL_SETTINGS | undefined>()
  const [useProxy, setUseProxy] = useState(false)
  const [protocol, setProtocol] = useState<'http' | 'https'>('http')
  const [host, setHost] = useState('')
  const [port, setPort] = useState(0)
  const [useCustomCertificate, setUseCustomCertificate] = useState(false)
  const refPath = useRef<HTMLInputElement>(null)
  const [path, setPath] = useState('')
  const [verifyCertificate, setVerifyCertificate] = useState(true)
  const [settingChanged, setSettingChanged] = useState(false)

  useEffect(() => {
    if (dialogProps.open) {
      window.electron.ipcRenderer
        .invoke('message', {
          src: 'renderer',
          dest: 'main',
          channel: 'getSettings'
        } satisfies z.infer<typeof SettingsGetRequest>)
        .then((newSettings) => {
          setSettings(newSettings)
          if (newSettings) {
            setUseProxy(newSettings.proxy.use)
            setProtocol(newSettings.proxy.protocol)
            setHost(newSettings.proxy.host)
            setPort(newSettings.proxy.port)
            setUseCustomCertificate(newSettings.certificate.use)
            setPath(newSettings.certificate.path)
            setVerifyCertificate(newSettings.verifyCertificate)
          }
          setSettingChanged(false)
        })
    }
  }, [dialogProps.open])

  useEffect(() => {
    const newSettings = buildSettings()
    setSettingChanged(JSON.stringify(settings) !== JSON.stringify(newSettings))
  }, [useProxy, protocol, host, port, useCustomCertificate, path, verifyCertificate])

  function buildSettings() {
    return {
      proxy: {
        use: useProxy,
        protocol,
        host,
        port
      },
      certificate: {
        use: useCustomCertificate,
        path
      },
      verifyCertificate
    }
  }

  return (
    <Dialog {...dialogProps}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="flex items-center space-x-2">
            <Switch checked={useProxy} onCheckedChange={setUseProxy} />
            <Label className="font-bold">Use proxy</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline">?</Badge>
                </TooltipTrigger>
                <TooltipContent className="w-96">
                  If you are behind proxy, enable it and configure proxy server properly
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
          <p className="flex">
            <span>
              <Select
                value={protocol}
                onValueChange={(value) => {
                  if (value !== 'http' && value !== 'https') {
                    return
                  }
                  setProtocol(value)
                }}
                disabled={!useProxy}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                </SelectContent>
              </Select>
            </span>
            <span className="grow">
              <Input
                placeholder="Host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                disabled={!useProxy}
              />
            </span>
            <span>
              <Input
                placeholder="Port"
                type="number"
                min={0}
                max={65535}
                value={port}
                onChange={(e) => setPort(+e.target.value)}
                disabled={!useProxy}
              />
            </span>
          </p>
          <p className="flex items-center space-x-2">
            <Switch checked={useCustomCertificate} onCheckedChange={setUseCustomCertificate} />
            <Label className="font-bold">Use custom certificate</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline">?</Badge>
                </TooltipTrigger>
                <TooltipContent className="w-96">
                  If your network requires custom certificate, enable it and pick certificate file
                  properly
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
          <p>
            {/* TODO */}
            <Input
              type="file"
              ref={refPath}
              onChange={(e) => {
                const path = e.target.files?.[0]?.path
                if (!path) {
                  return
                }
                setPath(path)
              }}
              disabled={!useCustomCertificate}
            />
          </p>
          <p className="flex items-center space-x-2 mb-4">
            <Switch checked={verifyCertificate} onCheckedChange={setVerifyCertificate} />
            <Label>Verify certificate</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline">?</Badge>
                </TooltipTrigger>
                <TooltipContent className="w-96">
                  If you have trouble with custom certificate, disable it.{' '}
                  <span className="font-bold text-red-600">
                    It may expose security risk and it is highly encouraged to keep it enabled
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
        </div>
        <DialogFooter>
          <Button
            disabled={!settingChanged}
            onClick={() => {
              const newSettings = buildSettings()
              window.electron.ipcRenderer.invoke('setSettings', {
                src: 'renderer',
                dest: 'main',
                channel: 'setSettings',
                settings: newSettings
              } satisfies z.infer<typeof SettingsSetRequest>)
            }}
          >
            Apply & relaunch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
