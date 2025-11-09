import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = React.useState(0);

  React.useEffect(() => {
    if (trackRef.current) {
      const updateWidth = () => {
        setTrackWidth(trackRef.current?.offsetWidth || 0);
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track ref={trackRef} className="relative h-3 w-full grow overflow-hidden rounded-full shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/40 via-yellow-500/40 to-green-500/40" />
        <SliderPrimitive.Range className="absolute h-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" 
            style={{ width: trackWidth }}
          />
        </SliderPrimitive.Range>
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border-2 border-primary/60 bg-background/20 backdrop-blur-md shadow-lg ring-offset-background transition-all hover:scale-110 hover:bg-background/30 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
