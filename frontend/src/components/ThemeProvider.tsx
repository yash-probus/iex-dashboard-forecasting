import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "dark" | "light";

export type ThemeProviderContextType = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = (localStorage.getItem("prolt-theme") || localStorage.getItem("prolt_theme")) as Theme;
    if (stored === "dark" || stored === "light") return stored;
    if (document.documentElement.classList.contains("dark")) return "dark";
    return "light";
  });

  const [toast, setToast] = useState<{ mode: Theme; id: number } | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
    localStorage.setItem("prolt-theme", theme);
    localStorage.setItem("prolt_theme", theme);
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }, [theme]);

  // Global Shift + D Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input, textarea, select, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Check for Shift + D
      if (
        e.shiftKey &&
        (e.key === "D" || e.key === "d" || e.code === "KeyD") &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        setTheme((prev) => {
          const next = prev === "light" ? "dark" : "light";
          setToast({ mode: next, id: Date.now() });
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-dismiss HUD Toast after 1600ms
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 1600);
    return () => clearTimeout(timer);
  }, [toast]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isDark = theme === "dark";

  return (
    <ThemeProviderContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}

      {/* Floating HUD Toast Notification for Shift + D Turbo Theme Toggle */}
      {toast && (
        <div
          key={toast.id}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-2xl backdrop-blur-2xl transition-all select-none animate-in fade-in slide-in-from-top-4 duration-200"
          style={{
            backgroundColor: toast.mode === "dark" ? "rgba(11, 15, 25, 0.92)" : "rgba(255, 255, 255, 0.95)",
            borderColor: toast.mode === "dark" ? "rgba(59, 130, 246, 0.35)" : "rgba(0, 0, 0, 0.12)",
            color: toast.mode === "dark" ? "#F8FAFC" : "#0F172A",
            boxShadow: toast.mode === "dark"
              ? "0 16px 40px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(59, 130, 246, 0.25)"
              : "0 16px 40px -10px rgba(0, 0, 0, 0.15), 0 0 20px rgba(37, 99, 235, 0.15)",
          }}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${toast.mode === "dark" ? "bg-indigo-500/20 text-indigo-400" : "bg-amber-500/20 text-amber-600"
            }`}>
            {toast.mode === "dark" ? (
              <Moon className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Sun className="w-3.5 h-3.5 fill-current" />
            )}
          </div>

          <div className="flex items-center gap-1.5 font-sans text-xs font-semibold">
            <span>{toast.mode === "dark" ? "Night Owl (Dark)" : "Daylight (Light)"}</span>
            <span className="text-[10px] opacity-60 font-normal">Active</span>
          </div>

          <div className="flex items-center gap-1 ml-1.5 pl-2 border-l border-black/10 dark:border-white/15">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20">
              Shift
            </kbd>
            <span className="text-[10px] opacity-40">+</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20">
              D
            </kbd>
          </div>
        </div>
      )}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const currentTheme: Theme = isDark ? "dark" : "light";
    return {
      theme: currentTheme,
      isDark,
      setTheme: (newTheme: Theme) => {
        if (typeof document !== "undefined") {
          document.documentElement.classList.remove("light", "dark");
          document.documentElement.classList.add(newTheme);
          document.documentElement.setAttribute("data-theme", newTheme);
          localStorage.setItem("prolt-theme", newTheme);
          localStorage.setItem("prolt_theme", newTheme);
          window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: newTheme } }));
        }
      },
      toggleTheme: () => {
        if (typeof document !== "undefined") {
          const dark = document.documentElement.classList.contains("dark");
          const next: Theme = dark ? "light" : "dark";
          document.documentElement.classList.remove("light", "dark");
          document.documentElement.classList.add(next);
          document.documentElement.setAttribute("data-theme", next);
          localStorage.setItem("prolt-theme", next);
          localStorage.setItem("prolt_theme", next);
          window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
        }
      },
    };
  }
  return context;
};
