import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type Props = {
  className?: string
  children: ReactNode
}

export function H1({ children, className }: Props) {
  return (
    <h1 className={cn('scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl', className)}>
      {children}
    </h1>
  )
}

export function H2({ children }: Props) {
  return (
    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
      {children}
    </h2>
  )
}

export function H3({ children }: Props) {
  return <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">{children}</h3>
}

export function H4({ children }: Props) {
  return <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">{children}</h4>
}

export function P({ children }: Props) {
  return <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>
}

export function List({ children }: Props) {
  return <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{children}</ul>
}
export function Muted({ className, children }: Props) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
}
