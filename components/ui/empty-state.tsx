import { Inbox } from "lucide-react";
import Link from "next/link";
import { type ComponentType, isValidElement, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "secondary";
}

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }> | ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction | ReactNode;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: IconProp = Inbox,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!IconProp) return null;
    if (isValidElement(IconProp)) {
      return IconProp;
    }
    const IconComponent = IconProp as ComponentType<{ className?: string }>;
    return <IconComponent className="w-6 h-6 text-muted-foreground" />;
  };

  const renderAction = () => {
    if (!action) return null;

    if (isValidElement(action)) {
      return action;
    }

    const act = action as EmptyStateAction;
    const ActionIcon = act.icon;

    if (act.href) {
      return (
        <Button asChild variant={act.variant || "default"} size="sm" className="rounded-xl">
          <Link href={act.href}>
            {ActionIcon && <ActionIcon className="w-3.5 h-3.5 mr-1.5" />}
            <span>{act.label}</span>
          </Link>
        </Button>
      );
    }

    return (
      <Button
        type="button"
        variant={act.variant || "default"}
        size="sm"
        onClick={act.onClick}
        className="rounded-xl"
      >
        {ActionIcon && <ActionIcon className="w-3.5 h-3.5 mr-1.5" />}
        <span>{act.label}</span>
      </Button>
    );
  };

  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-border/80 bg-surface-2/20 space-y-3.5 max-w-lg mx-auto w-full",
        className,
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border/80 flex items-center justify-center shadow-xs">
        {renderIcon()}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm sm:text-base font-semibold text-foreground font-serif tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-2">{renderAction()}</div>}

      {children}
    </section>
  );
}
