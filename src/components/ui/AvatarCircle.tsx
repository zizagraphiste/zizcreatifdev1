import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarCircleProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: Size;
  className?: string;
}

const sizeMap: Record<Size, { container: string; text: string }> = {
  xs: { container: "h-6 w-6",   text: "text-[9px]" },
  sm: { container: "h-8 w-8",   text: "text-xs" },
  md: { container: "h-10 w-10", text: "text-sm" },
  lg: { container: "h-14 w-14", text: "text-lg" },
  xl: { container: "h-20 w-20", text: "text-2xl" },
};

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AvatarCircle({ name, avatarUrl, size = "md", className }: AvatarCircleProps) {
  const { container, text } = sizeMap[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Avatar"}
        className={cn("rounded-full object-cover shrink-0 ring-2 ring-background", container, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 ring-2 ring-background select-none",
        container,
        text,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
