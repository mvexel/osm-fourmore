import { useId } from 'react'

interface ToggleSwitchProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
  name?: string
  id?: string
  className?: string
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
  name,
  id,
  className = '',
}: ToggleSwitchProps) {
  const generatedId = useId()
  const switchId = id ?? generatedId

  return (
    <label
      htmlFor={switchId}
      className={`relative inline-flex h-6 w-11 items-center rounded-full focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`.trim()}
    >
      <input
        id={switchId}
        type="checkbox"
        className="sr-only"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-disabled={disabled}
        checked={checked}
        onChange={(event) => {
          if (disabled) {
            return
          }
          onChange?.(event.target.checked)
        }}
        disabled={disabled}
        name={name}
      />
      <span
        aria-hidden="true"
        className={`inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </span>
    </label>
  )
}
