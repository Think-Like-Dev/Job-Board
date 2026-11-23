import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

type CheckboxProps = Omit<CheckboxPrimitive.Root.Props, "onCheckedChange"> & {
  onCheckedChange?: (checked: boolean) => void
  /**
   * Render a single native input instead of Base UI's span + hidden input.
   * Use when the surrounding UI must expose exactly one control to the
   * accessibility tree (Base UI's hidden input shows up as a second node).
   */
  native?: boolean
}

function Checkbox({ className, native = false, ...props }: CheckboxProps) {
  if (native) {
    return (
      <input
        type="checkbox"
        className={cn(
          "size-4 shrink-0 cursor-pointer rounded border-input accent-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className as string
        )}
        checked={props.checked}
        defaultChecked={props.defaultChecked}
        disabled={props.disabled}
        id={props.id}
        name={props.name}
        required={props.required}
        onChange={(event) => props.onCheckedChange?.(event.target.checked)}
      />
    )
  }

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-lg border border-input transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
