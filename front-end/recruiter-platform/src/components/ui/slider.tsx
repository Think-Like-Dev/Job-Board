import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

export type SliderRange = [number, number];

interface RangeSliderProps {
  value: SliderRange;
  min: number;
  max: number;
  step?: number;
  minLabel: string;
  maxLabel: string;
  onValueChange?: (value: SliderRange) => void;
  onValueCommitted?: (value: SliderRange) => void;
  className?: string;
}

const THUMB_CLASS =
  "block size-4 cursor-grab rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring active:cursor-grabbing";

function toRange(
  value: number | readonly number[],
  min: number,
  max: number,
): SliderRange {
  const values = Array.isArray(value) ? value : [min, value];
  return [values[0] ?? min, values[1] ?? max];
}

/** Two-thumb range slider used by the salary filter. */
export function RangeSlider({
  value,
  min,
  max,
  step = 1,
  minLabel,
  maxLabel,
  onValueChange,
  onValueCommitted,
  className,
}: RangeSliderProps) {
  return (
    <SliderPrimitive.Root
      value={value}
      min={min}
      max={max}
      step={step}
      thumbAlignment="edge"
      onValueChange={(next) => onValueChange?.(toRange(next, min, max))}
      onValueCommitted={(next) => onValueCommitted?.(toRange(next, min, max))}
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2",
        className,
      )}
    >
      <SliderPrimitive.Control className="relative flex w-full items-center">
        <SliderPrimitive.Track className="relative h-1.5 w-full rounded-full bg-muted">
          <SliderPrimitive.Indicator className="rounded-full bg-primary" />
          <SliderPrimitive.Thumb
            index={0}
            aria-label={minLabel}
            className={THUMB_CLASS}
          />
          <SliderPrimitive.Thumb
            index={1}
            aria-label={maxLabel}
            className={THUMB_CLASS}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}
