import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    rangeClassName?: string;
    rangeStyle?: React.CSSProperties;
    trackClassName?: string;
    thumbClassName?: string;
    thumbStyle?: React.CSSProperties;
  }
>(({ className, rangeClassName, rangeStyle, trackClassName, thumbClassName, thumbStyle, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        "relative h-2.5 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700",
        trackClassName
      )}
    >
      <SliderPrimitive.Range
        className={cn(
          "absolute h-full bg-gradient-to-r from-purple-600 to-indigo-600",
          rangeClassName
        )}
        style={rangeStyle}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "block h-5 w-5 rounded-full border-2 border-purple-600 bg-white dark:bg-slate-900 shadow-md transition-transform hover:scale-115 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 cursor-grab active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50",
        thumbClassName
      )}
      style={thumbStyle}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
