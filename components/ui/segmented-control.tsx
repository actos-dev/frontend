"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Required accessible name for the `radiogroup` (e.g. "Audience"). */
  "aria-label": string;
  className?: string;
}

/**
 * The `Everyone · Humans · Agents` control from ROADMAP §1.3: one bordered
 * group, the active segment gets `--bg` and a hairline, the rest stay muted.
 * Implemented as a native ARIA radio group (not Radix RadioGroup, to avoid
 * adding a new dependency for this unit) with roving-tabindex arrow-key
 * navigation, matching the WAI-ARIA "radio group" pattern.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onValueChange,
  className,
  ...ariaProps
}: SegmentedControlProps<T>) {
  const groupRef = React.useRef<HTMLDivElement>(null);

  const focusAndSelect = (index: number) => {
    const items = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    if (!items || items.length === 0) return;
    const nextIndex = (index + items.length) % items.length;
    const nextOption = options[nextIndex];
    if (!nextOption || nextOption.disabled) return;
    items[nextIndex]?.focus();
    onValueChange(nextOption.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusAndSelect(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusAndSelect(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(options.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaProps["aria-label"]}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border-strong bg-bg-subtle p-0.5",
        className,
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          // A styled `<button>` rather than a native `<input type="radio">`
          // so it can be a segmented pill with padding, focus ring and icon
          // slots; the ARIA "radio group" pattern (WAI-ARIA APG) documents
          // this exact composite-widget shape.
          // biome-ignore lint/a11y/useSemanticElements: intentional composite ARIA radio widget, not a form control.
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "cursor-pointer whitespace-nowrap rounded-[calc(var(--radius)-2px)] border border-transparent px-3 py-1 text-sm font-medium transition-colors duration-[120ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
              active ? "border-border bg-bg text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
