import { forwardRef, HTMLAttributes } from "react";

type CardVariant = "default" | "elevated" | "flat";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Remove default padding */
  noPadding?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-[#29271f] border border-[#605943] rounded-xl shadow-sm transition-all duration-200 hover:shadow-[0_4px_24px_rgba(230,201,116,0.08)] hover:border-[#c3ac6a]",
  elevated:
    "bg-[#29271f] border border-[#605943] rounded-xl shadow-md transition-all duration-200 hover:shadow-[0_8px_32px_rgba(230,201,116,0.12)] hover:border-[#e6c974] hover:-translate-y-0.5",
  flat: "bg-[#24231f] border border-[#3a3830] rounded-xl",
};

/**
 * Reusable card with space-theme styling.
 * Supports three visual variants and forwards a ref to the underlying div.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", noPadding = false, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          variantStyles[variant],
          noPadding ? "" : "p-4",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

/* ── Sub-components ────────────────────────────────────────────────────── */

export function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-3 flex items-center justify-between ${className}`} {...props} />
  );
}

export function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-sm font-semibold text-[#e8e7e5] ${className}`} {...props} />
  );
}

export { Card };
export default Card;
