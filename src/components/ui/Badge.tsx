import { HTMLAttributes } from "react";

type BadgeVariant =
  | "gold"
  | "purple"
  | "green"
  | "red"
  | "blue"
  | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Render as a small dot instead of a text pill */
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  gold:   "bg-[#e6c974]/15 text-[#e6c974] border border-[#e6c974]/30",
  purple: "bg-[#8369ce]/15 text-[#8369ce] border border-[#8369ce]/30",
  green:  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  red:    "bg-red-500/15 text-red-400 border border-red-500/30",
  blue:   "bg-sky-500/15 text-sky-400 border border-sky-500/30",
  muted:  "bg-[#29271f] text-[#96938d] border border-[#605943]",
};

/**
 * Small inline label pill with space-theme colour variants.
 */
export function Badge({
  variant = "muted",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  if (dot) {
    return (
      <span
        role="status"
        aria-label={typeof children === "string" ? children : undefined}
        className={[
          "inline-block h-2 w-2 rounded-full",
          variantClasses[variant].split(" ")[0], // only bg class for dot
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    );
  }

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
