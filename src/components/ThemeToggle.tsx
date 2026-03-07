import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "h-10 w-10 flex items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-gold-pale transition-colors text-lg",
        className
      )}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "○" : "●"}
    </button>
  );
}
