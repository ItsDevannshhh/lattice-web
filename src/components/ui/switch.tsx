import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  id?: string
  className?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, id, className, disabled }: SwitchProps) {
  const switchId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <label
      htmlFor={switchId}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'border-line relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-150',
          checked ? 'bg-accent border-accent' : 'bg-surface-2',
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
      {label && <span className="text-text text-sm">{label}</span>}
    </label>
  )
}
