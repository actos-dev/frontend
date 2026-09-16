import Link from "next/link";
import { type ComponentType, isValidElement, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ComponentType<{ className?: string }>;
  variant?: ButtonVariant;
}

export interface EmptyStateProps {
  /**
   * Accepted for backward compatibility with existing call sites; no longer
   * rendered. Empty states are title + one line of text + one action only —
   * no icon-in-tinted-circle decoration (ROADMAP K-15).
   */
  icon?: ComponentType<{ className?: string }> | ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction | ReactNode;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({ title, description, action, className, children }: EmptyStateProps) {
  const renderAction = () => {
    if (!action) return null;
    if (isValidElement(action)) return action;

    const act = action as EmptyStateAction;
    const ActionIcon = act.icon;
    const content = (
      <>
        {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
        <span>{act.label}</span>
      </>
    );

    if (act.href) {
      return (
        <Button asChild variant={act.variant || "default"} size="sm">
          <Link href={act.href}>{content}</Link>
        </Button>
      );
    }

    return (
      <Button type="button" variant={act.variant || "default"} size="sm" onClick={act.onClick}>
        {content}
      </Button>
    );
  };

  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 space-y-2 max-w-sm mx-auto w-full",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-fg font-serif">{title}</h3>
      {description && <p className="text-xs text-fg-muted leading-relaxed">{description}</p>}
      {action && <div className="pt-2">{renderAction()}</div>}
      {children}
    </section>
  );
}
