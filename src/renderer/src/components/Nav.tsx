import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList
} from '@/components/ui/navigation-menu'
import { Page } from '@renderer/page'
import { ValueOf } from '@/lib/valueOf'
import { useEffect, useState } from 'react'
import { version } from '../../../../package.json'
import { compareVersions } from 'compare-versions'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { z } from 'zod'
import { WorkerState } from '@/lib/workerState'

type Props = {
  onSelectPage: (page: ValueOf<typeof Page>) => void
  onOpenResourceSheet: () => void
  onOpenLoadResourceDialog: () => void
  onOpenAboutDialog: () => void
  workerState: z.infer<typeof WorkerState>
}

export function Nav({
  onSelectPage,
  onOpenResourceSheet,
  onOpenLoadResourceDialog,
  onOpenAboutDialog,
  workerState
}: Props) {
  // const refFile = useRef<HTMLInputElement>(null)
  const [newVersionAvail, setNewVersionAvail] = useState(false)
  const { theme, setTheme } = useTheme()

  const selectPage = (page: ValueOf<typeof Page>) => () => onSelectPage(page)

  // function selectFile() {
  //   if (!refFile.current) {
  //     return
  //   }
  //   refFile.current.click()
  // }

  function toggleTheme() {
    if (theme === 'light') {
      setTheme('dark')
    }
    if (theme === 'dark') {
      setTheme('light')
    }
  }

  useEffect(() => {
    fetch('https://data.jsdelivr.com/v1/packages/gh/proj3rd/tool3rd/resolved')
      .then((response) => {
        return response.json()
      })
      .then((json) => {
        const latestVersion = json.version as string
        if (compareVersions(latestVersion, version) > 0) {
          setNewVersionAvail(true)
        }
      })
      .catch((reason) => {
        console.error(reason)
      })
  }, [])

  return (
    <div className="flex justify-between">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Button
              variant="ghost"
              onClick={selectPage(Page.Landing)}
              disabled={workerState === 'busy'}
            >
              <b>tool3rd</b>
            </Button>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Button
              variant="ghost"
              onClick={selectPage(Page.FormatMessage)}
              disabled={workerState === 'busy'}
            >
              Format messsage
            </Button>
          </NavigationMenuItem>
          {/* <NavigationMenuItem>
            <Button
              variant="ghost"
              onClick={selectPage(Page.DiffASN1)}
              disabled={workerState === 'busy'}
            >
              Diff ASN.1
            </Button>
          </NavigationMenuItem> */}
          <NavigationMenuItem>
            <Button
              variant="ghost"
              onClick={onOpenLoadResourceDialog}
              disabled={workerState === 'busy'}
            >
              Load from cloud
            </Button>
          </NavigationMenuItem>
          {/* <NavigationMenuItem>
            <Button variant="ghost" onClick={selectFile} disabled={workerState === 'busy'}>
              Load local file
            </Button>
            <input type="file" ref={refFile} hidden />
          </NavigationMenuItem> */}
          <NavigationMenuItem>
            <Button variant="ghost" onClick={onOpenResourceSheet} disabled={workerState === 'busy'}>
              Resources
            </Button>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Button variant="ghost" onClick={onOpenAboutDialog} disabled={workerState === 'busy'}>
              About
            </Button>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <NavigationMenu>
        <NavigationMenuList>
          {newVersionAvail && (
            <NavigationMenuItem>
              <a
                href="https://github.com/proj3rd/tool3rd/releases"
                target="_blank"
                className="text-sm font-bold underline"
              >
                New version available
              </a>
            </NavigationMenuItem>
          )}
          <NavigationMenuItem>
            <Button variant="ghost" onClick={toggleTheme}>
              {theme === 'light' ? <Moon /> : <Sun />}
            </Button>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}
