import { cn } from "@/lib/utils";
import { ProltIcon } from "./ProltLogo";

interface ProltLoaderAnimationProps {
  progress?: number;
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showScanLine?: boolean;
}

const sizeMap = {
  sm: { icon: 48, ring: 56, stroke: 3 },
  md: { icon: 64, ring: 80, stroke: 4 },
  lg: { icon: 96, ring: 120, stroke: 5 },
};

export function ProltLoaderAnimation({
  progress,
  message,
  size = "md",
  className,
  showScanLine = false,
}: ProltLoaderAnimationProps) {
  const { icon: iconSize, ring: ringSize, stroke: strokeWidth } = sizeMap[size];
  const radius = (ringSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    progress !== undefined
      ? circumference - (progress / 100) * circumference
      : circumference * 0.75;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Loader Container */}
      <div className="relative prolt-loader">
        {/* Animated Glow */}
        <div
          className="absolute inset-0 rounded-full prolt-glow"
          style={{
            width: ringSize,
            height: ringSize,
          }}
        />

        {/* Progress Ring */}
        <svg
          width={ringSize}
          height={ringSize}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            className="stroke-muted"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            className={cn(
              "stroke-accent transition-all duration-300",
              progress === undefined && "prolt-ring-spin",
            )}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {/* Icon in center */}
        <div
          className="absolute inset-0 flex items-center justify-center prolt-pulse"
          style={{
            width: ringSize,
            height: ringSize,
          }}
        >
          <ProltIcon size={iconSize} />
        </div>

        {/* Scanning Line Animation */}
        {showScanLine && (
          <div
            className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
            style={{ width: ringSize, height: ringSize }}
          >
            <div
              className="prolt-scan-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent"
              style={{
                boxShadow: "0 0 12px 2px hsl(178 100% 40% / 0.6)",
              }}
            />
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}

      {/* Progress percentage */}
      {progress !== undefined && (
        <p className="font-mono text-lg font-semibold text-foreground">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  );
}
