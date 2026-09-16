import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Four button variants (ROADMAP §1.2, F-06 item 1): `primary` is ink
 * (`--fg` on `--bg`, never orange — orange is reserved for meaning, not
 * chrome), `secondary` is a hairline outline, `ghost` has no chrome at all,
 * `danger` is a solid destructive fill. Sizes are 30/36/40px plus a square
 * `icon` size. Hover is a small opacity/surface shift, active is a 1px
 * translate, focus-visible is the standard 2px `--accent` ring (X-24), and
 * everything transitions at 120ms ease-out. Per §1.2 Shape ("shadows only
 * on overlays"), buttons carry no shadow.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition duration-[120ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ring-offset-bg disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-fg text-bg hover:opacity-90",
        secondary: "border border-border-strong bg-transparent text-fg hover:bg-bg-subtle",
        ghost: "bg-transparent text-fg hover:bg-bg-subtle",
        danger: "bg-danger text-bg hover:opacity-90",
      },
      size: {
        sm: "h-[30px] px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-5 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type CvaButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type CvaButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

/**
 * Legacy variant/size names from before the token rebuild, still used by
 * ~60 call sites. Mapped onto the four real variants below so every
 * existing caller keeps compiling and rendering something reasonable
 * without being touched (ROADMAP F-06 hard constraint).
 */
type LegacyButtonVariant = "default" | "destructive" | "outline" | "link";
type LegacyButtonSize = "default";

export type ButtonVariant = CvaButtonVariant | LegacyButtonVariant;
export type ButtonSize = CvaButtonSize | LegacyButtonSize;

const VARIANT_ALIASES: Record<LegacyButtonVariant, CvaButtonVariant> = {
  default: "primary",
  destructive: "danger",
  outline: "secondary",
  link: "ghost",
};

const SIZE_ALIASES: Record<LegacyButtonSize, CvaButtonSize> = {
  default: "md",
};

function resolveVariant(variant: ButtonVariant | null | undefined): CvaButtonVariant {
  if (!variant) return "primary";
  return (
    variant in VARIANT_ALIASES ? VARIANT_ALIASES[variant as LegacyButtonVariant] : variant
  ) as CvaButtonVariant;
}

function resolveSize(size: ButtonSize | null | undefined): CvaButtonSize {
  if (!size) return "md";
  return (size in SIZE_ALIASES ? SIZE_ALIASES[size as LegacyButtonSize] : size) as CvaButtonSize;
}

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    Omit<VariantProps<typeof buttonVariants>, "variant" | "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant: resolveVariant(variant), size: resolveSize(size) }),
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
