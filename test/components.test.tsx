// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { AgentLabel } from "@/components/ui/agent-label";
import { ActorAvatar, Avatar, AvatarActorBadge, AvatarFallback } from "@/components/ui/avatar";
import { ActorBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton, SkeletonPostCard } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAvatarTintColor } from "@/lib/avatar-tint";
import { cn } from "@/lib/utils";

describe("F-06 — Primitives rebuilt on the tokens", () => {
  describe("cn (clsx + tailwind-merge)", () => {
    it("merges conditional classes and resolves conflicting Tailwind classes", () => {
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
      expect(cn("bg-fg", false && "bg-bg-subtle", undefined, "text-bg")).toBe("bg-fg text-bg");
    });
  });

  describe("Button", () => {
    it("defaults to the primary (ink) variant and md size", () => {
      render(<Button>Sign in</Button>);
      const button = screen.getByRole("button", { name: "Sign in" });
      expect(button.className).toContain("bg-fg");
      expect(button.className).toContain("text-bg");
      expect(button.className).toContain("h-9");
    });

    it("renders the four real variants (primary, secondary, ghost, danger)", () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole("button", { name: "Primary" }).className).toContain("bg-fg");

      rerender(<Button variant="secondary">Secondary</Button>);
      let button = screen.getByRole("button", { name: "Secondary" });
      expect(button.className).toContain("border-border-strong");
      expect(button.className).toContain("bg-transparent");

      rerender(<Button variant="ghost">Ghost</Button>);
      button = screen.getByRole("button", { name: "Ghost" });
      expect(button.className).toContain("bg-transparent");

      rerender(<Button variant="danger">Danger</Button>);
      button = screen.getByRole("button", { name: "Danger" });
      expect(button.className).toContain("bg-danger");
    });

    it("maps legacy variant names onto the four real ones", () => {
      const { rerender } = render(<Button variant="default">Default</Button>);
      expect(screen.getByRole("button", { name: "Default" }).className).toContain("bg-fg");

      rerender(<Button variant="outline">Outline</Button>);
      let button = screen.getByRole("button", { name: "Outline" });
      expect(button.className).toContain("border-border-strong");
      expect(button.className).toContain("bg-transparent");

      rerender(<Button variant="destructive">Destructive</Button>);
      button = screen.getByRole("button", { name: "Destructive" });
      expect(button.className).toContain("bg-danger");

      rerender(<Button variant="link">Link</Button>);
      button = screen.getByRole("button", { name: "Link" });
      expect(button.className).toContain("bg-transparent");
    });

    it("maps the legacy 'default' size to md (36px) and keeps sm/lg/icon", () => {
      const { rerender } = render(<Button size="default">Default size</Button>);
      expect(screen.getByRole("button", { name: "Default size" }).className).toContain("h-9");

      rerender(<Button size="sm">Small</Button>);
      expect(screen.getByRole("button", { name: "Small" }).className).toContain("h-[30px]");

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole("button", { name: "Large" }).className).toContain("h-10");

      rerender(
        <Button size="icon" aria-label="Icon button">
          <span>+</span>
        </Button>,
      );
      const iconButton = screen.getByRole("button", { name: "Icon button" });
      expect(iconButton.className).toContain("h-9");
      expect(iconButton.className).toContain("w-9");
    });

    it("carries the focus-visible accent ring and the disabled state", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button", { name: "Disabled" });
      expect(button.hasAttribute("disabled")).toBe(true);
      expect(button.className).toContain("disabled:opacity-50");
      expect(button.className).toContain("focus-visible:ring-accent");
    });

    it("renders a custom child element via asChild", () => {
      render(
        <Button asChild>
          <a href="/login">Login link</a>
        </Button>,
      );
      const link = screen.getByRole("link", { name: "Login link" });
      expect(link.getAttribute("href")).toBe("/login");
      expect(link.className).toContain("bg-fg");
    });
  });

  describe("Input and Textarea", () => {
    it("renders Input on the new tokens", () => {
      render(<Input placeholder="actos_..." type="password" />);
      const input = screen.getByPlaceholderText("actos_...");
      expect(input.getAttribute("type")).toBe("password");
      expect(input.className).toContain("border-border-strong");
      expect(input.className).toContain("bg-bg");
      expect(input.className).toContain("placeholder:text-fg-subtle");
      expect(input.className).toContain("focus-visible:ring-accent");
    });

    it("renders Textarea on the new tokens", () => {
      render(<Textarea placeholder="Write a comment..." rows={4} />);
      const textarea = screen.getByPlaceholderText("Write a comment...");
      expect(textarea.className).toContain("min-h-[80px]");
      expect(textarea.className).toContain("border-border-strong");
    });

    it("carries the disabled attribute through", () => {
      render(
        <div>
          <Input disabled placeholder="Locked input" />
          <Textarea disabled placeholder="Locked textarea" />
        </div>,
      );
      expect(screen.getByPlaceholderText("Locked input").hasAttribute("disabled")).toBe(true);
      expect(screen.getByPlaceholderText("Locked textarea").hasAttribute("disabled")).toBe(true);
    });
  });

  describe("Badge", () => {
    it("renders every variant on the new tokens", () => {
      const { rerender } = render(<Badge variant="default">Default</Badge>);
      expect(screen.getByText("Default").className).toContain("bg-fg");

      rerender(<Badge variant="success">Success</Badge>);
      expect(screen.getByText("Success").className).toContain("bg-success");

      rerender(<Badge variant="warning">Warning</Badge>);
      expect(screen.getByText("Warning").className).toContain("bg-warning");

      rerender(<Badge variant="destructive">Destructive</Badge>);
      expect(screen.getByText("Destructive").className).toContain("bg-danger");
    });
  });

  describe("AgentLabel", () => {
    it("renders the mono AGENT chip with its fixed accessible name", () => {
      render(<AgentLabel />);
      const label = screen.getByLabelText("Agent account, self-declared");
      expect(label.textContent).toBe("Agent");
      expect(label.className).toContain("font-mono");
      expect(label.className).toContain("uppercase");
      expect(label.className).toContain("border-border-strong");
    });
  });

  describe("ActorBadge (K-08)", () => {
    it("renders nothing for a human actor — the ✦ glyph and the human pill are gone", () => {
      const { container } = render(<ActorBadge actorType="human" />);
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByText(/✦/)).toBeNull();
    });

    it("renders the AgentLabel chip for an ai_agent actor", () => {
      render(<ActorBadge actorType="ai_agent" />);
      const label = screen.getByLabelText("Agent account, self-declared");
      expect(label.textContent).toBe("Agent");
    });

    it("ignores the legacy variant/customLabel props and still forwards data attributes", () => {
      render(<ActorBadge actorType="ai_agent" variant="glyph" data-testid="post-author-glyph" />);
      const label = screen.getByTestId("post-author-glyph");
      expect(label.getAttribute("aria-label")).toBe("Agent account, self-declared");

      const { container } = render(
        <ActorBadge actorType="human" variant="full" customLabel="Human" data-testid="x" />,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Avatar primitives", () => {
    it("renders Avatar and AvatarFallback with initials", () => {
      render(
        <Avatar>
          <AvatarFallback>EO</AvatarFallback>
        </Avatar>,
      );
      const fallback = screen.getByText("EO");
      expect(fallback).toBeDefined();
    });

    it("AvatarActorBadge is a no-op now that shape carries the actor-type signal", () => {
      const { container } = render(
        <Avatar>
          <AvatarFallback>DA</AvatarFallback>
          <AvatarActorBadge actorType="ai_agent" />
        </Avatar>,
      );
      // No overlay icon of any kind is rendered by AvatarActorBadge anymore.
      expect(container.querySelector("svg")).toBeNull();
      expect(container.textContent).toBe("DA");
    });
  });

  describe("ActorAvatar", () => {
    it("renders a circle for humans and a squircle for agents", () => {
      const { container: humanContainer } = render(
        <ActorAvatar actorType="human" username="efe" />,
      );
      const humanRoot = humanContainer.firstElementChild as HTMLElement;
      expect(humanRoot.className).toContain("rounded-full");
      expect(humanRoot.className).not.toContain("rounded-[28%]");

      const { container: agentContainer } = render(
        <ActorAvatar actorType="ai_agent" username="dila_ai" />,
      );
      const agentRoot = agentContainer.firstElementChild as HTMLElement;
      expect(agentRoot.className).toContain("rounded-[28%]");
    });

    it("shows one initial at size 20 and two initials at larger sizes", () => {
      const { getByText: getByTextSmall } = render(
        <ActorAvatar actorType="human" username="efe" size={20} />,
      );
      expect(getByTextSmall("E")).toBeDefined();

      const { getByText: getByTextLarge } = render(
        <ActorAvatar actorType="human" username="efe" size={40} />,
      );
      expect(getByTextLarge("EF")).toBeDefined();
    });

    it("gives the same username a stable tint regardless of actor type or size", () => {
      const expected = getAvatarTintColor("dila_ai");

      const { container: c1 } = render(
        <ActorAvatar actorType="ai_agent" username="dila_ai" size={28} />,
      );
      const { container: c2 } = render(
        <ActorAvatar actorType="human" username="dila_ai" size={88} />,
      );

      const fallback1 = c1.querySelector("[style]") as HTMLElement;
      const fallback2 = c2.querySelector("[style]") as HTMLElement;
      expect(fallback1.style.backgroundColor).toBe(expected);
      expect(fallback2.style.backgroundColor).toBe(expected);
    });

    it("gives different usernames a different tint (at least for this pair)", () => {
      expect(getAvatarTintColor("efe")).not.toBe(getAvatarTintColor("dila_ai_helper_2"));
    });
  });

  describe("SegmentedControl", () => {
    const options: SegmentedControlOption<"everyone" | "humans" | "agents">[] = [
      { value: "everyone", label: "Everyone" },
      { value: "humans", label: "Humans" },
      { value: "agents", label: "Agents" },
    ];

    function ControlledSegmented() {
      const [value, setValue] = React.useState<"everyone" | "humans" | "agents">("everyone");
      return (
        <SegmentedControl
          aria-label="Audience"
          options={options}
          value={value}
          onValueChange={setValue}
        />
      );
    }

    it("exposes an accessible radiogroup with the active segment checked", () => {
      render(<ControlledSegmented />);
      const group = screen.getByRole("radiogroup", { name: "Audience" });
      expect(group).toBeDefined();

      const everyone = screen.getByRole("radio", { name: "Everyone" });
      expect(everyone.getAttribute("aria-checked")).toBe("true");
      expect(screen.getByRole("radio", { name: "Humans" }).getAttribute("aria-checked")).toBe(
        "false",
      );
    });

    it("moves selection and focus with ArrowRight/ArrowLeft, and wraps at the ends", () => {
      render(<ControlledSegmented />);

      const everyone = screen.getByRole("radio", { name: "Everyone" });
      everyone.focus();
      fireEvent.keyDown(everyone, { key: "ArrowRight" });

      const humans = screen.getByRole("radio", { name: "Humans" });
      expect(humans.getAttribute("aria-checked")).toBe("true");
      expect(document.activeElement).toBe(humans);

      fireEvent.keyDown(humans, { key: "ArrowLeft" });
      expect(screen.getByRole("radio", { name: "Everyone" }).getAttribute("aria-checked")).toBe(
        "true",
      );

      // Wrapping: ArrowLeft from the first item selects the last one.
      fireEvent.keyDown(screen.getByRole("radio", { name: "Everyone" }), { key: "ArrowLeft" });
      expect(screen.getByRole("radio", { name: "Agents" }).getAttribute("aria-checked")).toBe(
        "true",
      );
    });

    it("jumps to the first/last option with Home/End", () => {
      render(<ControlledSegmented />);
      const everyone = screen.getByRole("radio", { name: "Everyone" });
      fireEvent.keyDown(everyone, { key: "End" });
      expect(screen.getByRole("radio", { name: "Agents" }).getAttribute("aria-checked")).toBe(
        "true",
      );

      fireEvent.keyDown(screen.getByRole("radio", { name: "Agents" }), { key: "Home" });
      expect(screen.getByRole("radio", { name: "Everyone" }).getAttribute("aria-checked")).toBe(
        "true",
      );
    });

    it("selects an option on click", () => {
      render(<ControlledSegmented />);
      fireEvent.click(screen.getByRole("radio", { name: "Agents" }));
      expect(screen.getByRole("radio", { name: "Agents" }).getAttribute("aria-checked")).toBe(
        "true",
      );
    });
  });

  describe("Skeleton", () => {
    it("uses --bg-muted and pulses, but stops under prefers-reduced-motion", () => {
      const { container } = render(<Skeleton className="h-4 w-20" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain("bg-bg-muted");
      expect(el.className).toContain("animate-pulse");
      expect(el.className).toContain("motion-reduce:animate-none");
      expect(el.getAttribute("aria-hidden")).toBe("true");
    });

    it("SkeletonPostCard carries aria-busy and its inner skeleton rows", () => {
      render(<SkeletonPostCard />);
      const card = screen.getByRole("status");
      expect(card.getAttribute("aria-busy")).toBe("true");
    });
  });

  describe("Tabs, Dialog, Popover, Select and Tooltip", () => {
    it("Tabs renders an underline style with no pill background", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">First</TabsTrigger>
            <TabsTrigger value="tab2">Second</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      const first = screen.getByRole("tab", { name: "First" });
      const second = screen.getByRole("tab", { name: "Second" });
      expect(first.getAttribute("data-state")).toBe("active");
      expect(second.getAttribute("data-state")).toBe("inactive");
      expect(first.className).toContain("data-[state=active]:border-accent");
      expect(first.className).toContain("data-[state=active]:text-fg");
      expect(first.className).not.toContain("rounded-lg");
      expect(screen.getByText("Content 1")).toBeDefined();
    });

    it("Dialog opens on trigger and uses the radius-10 surface", () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>,
      );

      const trigger = screen.getByRole("button", { name: "Open dialog" });
      fireEvent.click(trigger);

      // Radix marks background content aria-hidden once open, so the
      // trigger itself is no longer queryable by role — check the dialog.
      const dialog = screen.getByRole("dialog");
      expect(dialog.className).toContain("rounded-xl");
      expect(dialog.className).toContain("bg-bg");
      expect(dialog.className).toContain("shadow-pop");
    });

    it("Popover and Tooltip triggers render without crashing", () => {
      render(
        <TooltipProvider>
          <Popover>
            <PopoverTrigger asChild>
              <Button>Open info</Button>
            </PopoverTrigger>
            <PopoverContent>Detail</PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hint</Button>
            </TooltipTrigger>
            <TooltipContent>Hint detail</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      expect(screen.getByRole("button", { name: "Open info" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Hint" })).toBeDefined();
    });

    it("Select renders its trigger", () => {
      render(
        <Select defaultValue="option1">
          <SelectTrigger aria-label="Sort">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>,
      );

      expect(screen.getByRole("combobox", { name: "Sort" })).toBeDefined();
    });
  });
});
