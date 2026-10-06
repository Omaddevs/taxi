import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'soft' | 'outline' | 'ghost' | 'danger' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ children, className, variant = 'primary', size = 'md', type = 'button', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-brand text-ink hover:bg-[#00b6c2] shadow-sm shadow-brand/30',
    soft: 'bg-brand-soft text-brand-dark hover:bg-[#c9f3f7]',
    outline: 'border border-line bg-white text-ink hover:bg-canvas',
    ghost: 'text-ink hover:bg-canvas',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    dark: 'bg-ink text-white hover:bg-black',
  }
  const sizes = {
    sm: 'h-9 px-3 text-sm rounded-xl font-semibold',
    md: 'h-11 px-4 text-sm font-semibold rounded-2xl',
    lg: 'h-12 px-5 text-[15px] font-semibold rounded-2xl',
  }

  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(28,28,40,0.04)]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  tone = 'pink',
  className,
}: {
  children: ReactNode
  tone?: 'pink' | 'green' | 'red' | 'gray' | 'amber'
  className?: string
}) {
  const tones = {
    pink: 'bg-brand-soft text-brand-dark',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-500',
    gray: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}
