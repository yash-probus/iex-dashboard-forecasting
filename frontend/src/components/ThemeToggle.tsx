import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode (Shift + D)`}
      title={`Switch to ${isDark ? "light" : "dark"} mode (Shift + D)`}
      className={`relative inline-flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-full border transition-all duration-250 select-none cursor-pointer group ${
        isDark
          ? "bg-slate-900/80 border-white/10 text-amber-300 hover:border-amber-400/40 hover:bg-white/10 hover:text-amber-200 shadow-sm"
          : "bg-white border-slate-200 text-slate-700 hover:border-blue-400/40 hover:bg-slate-50 hover:text-blue-600 shadow-xs"
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-amber-300 transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 group-hover:rotate-45" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-mono font-medium tracking-wide">
          {isDark ? "DARK" : "LIGHT"}
        </span>
      )}
    </button>
  );
}

export default ThemeToggle;
