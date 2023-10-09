import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { version } from '../../../../package.json'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About tool3rd</DialogTitle>
        </DialogHeader>
        <div className="text-center my-4 space-y-4">
          <p>Current version: {version}</p>
          <p className="text-sm">
            If you feel this is useful, please consider{' '}
            <a href="https://buymeacoffee.com/somidad" target="_blank" className="underline">
              support development
            </a>
          </p>
        </div>
        <p className="flex justify-around">
          <a href="https://github.com/proj3rd/tool3rd" target="_blank">
            GitHub
          </a>
          <a href={`https://github.com/proj3rd/tool3rd/releases/tag/v${version}`} target="_blank">
            Changelog
          </a>
          <a href="https://github.com/proj3rd/tool3rd/releases" target="_blank">
            Check for update
          </a>
          <a href="https://github.com/proj3rd/tool3rd/issues" target="_blank">
            Bug / suggestion
          </a>
        </p>
      </DialogContent>
    </Dialog>
  )
}
