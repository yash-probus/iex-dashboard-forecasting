// @ts-nocheck

import { cn } from "@/lib/utils";
import proltLogoSvg from "@/assets/Prolt_Logo.svg";
import proltIconSvg from "@/assets/Prolt_Icon.svg";
import proltLogoWithNameSquareSvg from "@/assets/Prolt_Logo_2.svg";

interface ProltLogoProps {
  variant?: "full" | "icon" | "mini";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

/**
 * Size map — heights chosen to be responsive-friendly.
 * The SVG logo contains the full wordmark so we only need height.
 */
const sizeMap = {
  sm: "h-6", // ~24px
  md: "h-8", // ~32px
  lg: "h-10", // ~40px
  xl: "h-14", // ~56px
};

export function ProltLogo({
  variant = "full",
  size = "md",
  className,
  onClick,
}: ProltLogoProps) {
  return null;
}

// Icon-only alias — keeps backward compat
export function ProltIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return null;
}
