// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, AvatarActorBadge, AvatarFallback } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";

describe("Faz 2 — Tasarım Sistemi ve Temel Bileşenler", () => {
  describe("1. Yardımcı Fonksiyon: cn (clsx + tailwind-merge)", () => {
    it("koşullu sınıfları ve çakışan Tailwind sınıflarını doğru birleştirmelidir", () => {
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
      expect(cn("bg-primary", false && "bg-secondary", undefined, "text-white")).toBe(
        "bg-primary text-white",
      );
    });
  });

  describe("2. Button Bileşeni", () => {
    it("varsayılan (default) varyant ve boyutta doğru sınıflarla render edilmelidir", () => {
      render(<Button>Giriş Yap</Button>);
      const button = screen.getByRole("button", { name: "Giriş Yap" });
      expect(button).toBeDefined();
      expect(button.className).toContain("bg-primary");
      expect(button.className).toContain("text-primary-foreground");
      expect(button.className).toContain("h-9");
    });

    it("tüm varyant sınıflarını (secondary, outline, ghost, destructive, link) uygulamalıdır", () => {
      const { rerender } = render(<Button variant="secondary">İkincil</Button>);
      let button = screen.getByRole("button", { name: "İkincil" });
      expect(button.className).toContain("bg-secondary");

      rerender(<Button variant="outline">Çerçeveli</Button>);
      button = screen.getByRole("button", { name: "Çerçeveli" });
      expect(button.className).toContain("border-border");

      rerender(<Button variant="ghost">Hayalet</Button>);
      button = screen.getByRole("button", { name: "Hayalet" });
      expect(button.className).toContain("hover:bg-surface-2");

      rerender(<Button variant="destructive">Sil</Button>);
      button = screen.getByRole("button", { name: "Sil" });
      expect(button.className).toContain("bg-destructive");

      rerender(<Button variant="link">Bağlantı</Button>);
      button = screen.getByRole("button", { name: "Bağlantı" });
      expect(button.className).toContain("hover:underline");
    });

    it("tüm boyut sınıflarını (sm, lg, icon) uygulamalıdır", () => {
      const { rerender } = render(<Button size="sm">Küçük</Button>);
      let button = screen.getByRole("button", { name: "Küçük" });
      expect(button.className).toContain("h-8");

      rerender(<Button size="lg">Büyük</Button>);
      button = screen.getByRole("button", { name: "Büyük" });
      expect(button.className).toContain("h-10");

      rerender(
        <Button size="icon" aria-label="İkon Buton">
          <span>+</span>
        </Button>,
      );
      button = screen.getByRole("button", { name: "İkon Buton" });
      expect(button.className).toContain("h-9");
      expect(button.className).toContain("w-9");
    });

    it("disabled durumunda pointer-events-none ve opacity-50 almalıdır", () => {
      render(<Button disabled>Devre Dışı</Button>);
      const button = screen.getByRole("button", { name: "Devre Dışı" });
      expect(button.hasAttribute("disabled")).toBe(true);
      expect(button.className).toContain("disabled:opacity-50");
    });

    it("asChild ile özel alt eleman (slot) render edebilmelidir", () => {
      render(
        <Button asChild>
          <a href="/login">Giriş Linki</a>
        </Button>,
      );
      const link = screen.getByRole("link", { name: "Giriş Linki" });
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("/login");
      expect(link.className).toContain("bg-primary");
    });
  });

  describe("3. Input ve Textarea Bileşenleri", () => {
    it("Input doğru öznitelikler ve odak/kenarlık token sınıflarıyla render edilmelidir", () => {
      render(<Input placeholder="actos_..." type="password" />);
      const input = screen.getByPlaceholderText("actos_...");
      expect(input).toBeDefined();
      expect(input.getAttribute("type")).toBe("password");
      expect(input.className).toContain("border-input");
      expect(input.className).toContain("focus-visible:ring-ring");
    });

    it("Textarea doğru satır ve biçimlendirme sınıflarıyla render edilmelidir", () => {
      render(<Textarea placeholder="Yorum yazın..." rows={4} />);
      const textarea = screen.getByPlaceholderText("Yorum yazın...");
      expect(textarea).toBeDefined();
      expect(textarea.className).toContain("min-h-[80px]");
      expect(textarea.className).toContain("border-input");
    });

    it("Input ve Textarea disabled durumunda disabled özniteliği taşımalıdır", () => {
      render(
        <div>
          <Input disabled placeholder="Kilitli Girdi" />
          <Textarea disabled placeholder="Kilitli Metin" />
        </div>,
      );
      expect(screen.getByPlaceholderText("Kilitli Girdi").hasAttribute("disabled")).toBe(true);
      expect(screen.getByPlaceholderText("Kilitli Metin").hasAttribute("disabled")).toBe(true);
    });
  });

  describe("4. Badge ve ActorBadge Bileşenleri", () => {
    it("genel Badge tüm varyantlarıyla doğru renklendirilmelidir", () => {
      const { rerender } = render(<Badge variant="default">Ana Rozet</Badge>);
      expect(screen.getByText("Ana Rozet").className).toContain("bg-primary");

      rerender(<Badge variant="success">Başarılı</Badge>);
      expect(screen.getByText("Başarılı").className).toContain("bg-success");

      rerender(<Badge variant="warning">Uyarı</Badge>);
      expect(screen.getByText("Uyarı").className).toContain("bg-warning");

      rerender(<Badge variant="destructive">Hata</Badge>);
      expect(screen.getByText("Hata").className).toContain("bg-destructive");
    });

    it("ActorBadge tüm 4 aktör tipini (human, ai_agent, system_bot, organization) tam modda etiket ve semantik token renkleriyle render etmelidir", () => {
      const { rerender } = render(<ActorBadge actorType="human" />);
      let badge = screen.getByRole("status", { name: "İnsan" });
      expect(badge).toBeDefined();
      expect(badge.className).toContain("text-flair-human");

      rerender(<ActorBadge actorType="ai_agent" />);
      badge = screen.getByRole("status", { name: "AI agent" });
      expect(badge).toBeDefined();
      expect(badge.className).toContain("text-flair-agent");

      rerender(<ActorBadge actorType="system_bot" />);
      badge = screen.getByRole("status", { name: "Bot" });
      expect(badge).toBeDefined();
      expect(badge.className).toContain("text-flair-bot");

      rerender(<ActorBadge actorType="organization" />);
      badge = screen.getByRole("status", { name: "Kurum" });
      expect(badge).toBeDefined();
      expect(badge.className).toContain("text-flair-org");
    });

    it("ActorBadge kompakt modda (Feed için) erişilebilir aria-label taşımalı ve role='img' olmalıdır", () => {
      render(<ActorBadge actorType="ai_agent" variant="compact" />);
      const badge = screen.getByRole("img", { name: "AI agent" });
      expect(badge).toBeDefined();
      expect(badge.className).toContain("text-flair-agent");
    });
  });

  describe("5. Avatar Bileşeni", () => {
    it("Avatar ve Fallback baş harflerle render edilmelidir", () => {
      render(
        <Avatar>
          <AvatarFallback>EO</AvatarFallback>
        </Avatar>,
      );
      const fallback = screen.getByText("EO");
      expect(fallback).toBeDefined();
      expect(fallback.className).toContain("rounded-full");
      expect(fallback.className).toContain("bg-surface-2");
    });

    it("AvatarActorBadge ilgili aktör rengi ve ikonunu taşımalıdır", () => {
      const { container } = render(
        <Avatar>
          <AvatarFallback>DA</AvatarFallback>
          <AvatarActorBadge actorType="ai_agent" />
        </Avatar>,
      );
      const badge = container.querySelector(".bg-flair-agent");
      expect(badge).not.toBeNull();
    });
  });

  describe("6. Skeleton ve Yükleme İskeletleri", () => {
    it("Skeleton animate-pulse ve bg-surface-2 taşımalıdır", () => {
      const { container } = render(<Skeleton className="h-4 w-20" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain("animate-pulse");
      expect(el.className).toContain("bg-surface-2");
      expect(el.getAttribute("aria-hidden")).toBe("true");
    });

    it("SkeletonPostCard aria-busy='true' taşımalı ve iç iskelet öğeleri içermelidir", () => {
      render(<SkeletonPostCard />);
      const card = screen.getByLabelText("İçerik yükleniyor");
      expect(card).toBeDefined();
      expect(card.getAttribute("aria-busy")).toBe("true");
    });
  });

  describe("7. Tabs, Dialog, Popover, Select ve Tooltip Primitive Doğrulaması", () => {
    it("Tabs bileşeni sekmeleri ve içeriği sorunsuz render etmelidir", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Birinci</TabsTrigger>
            <TabsTrigger value="tab2">İkinci</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">İçerik 1</TabsContent>
          <TabsContent value="tab2">İçerik 2</TabsContent>
        </Tabs>,
      );

      expect(screen.getByRole("tab", { name: "Birinci" })).toBeDefined();
      expect(screen.getByRole("tab", { name: "İkinci" })).toBeDefined();
      expect(screen.getByText("İçerik 1")).toBeDefined();
    });

    it("Dialog bileşeni tetikleyici ve temel yapıyı barındırmalıdır", () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Modali Aç</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Başlık</DialogTitle>
              <DialogDescription>Açıklama</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>,
      );

      expect(screen.getByRole("button", { name: "Modali Aç" })).toBeDefined();
    });

    it("Popover ve Tooltip tetikleyicileri sorunsuz render edilmelidir", () => {
      render(
        <TooltipProvider>
          <Popover>
            <PopoverTrigger asChild>
              <Button>Açılır Bilgi</Button>
            </PopoverTrigger>
            <PopoverContent>Detay</PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button>İpucu</Button>
            </TooltipTrigger>
            <TooltipContent>İpucu Detayı</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      expect(screen.getByRole("button", { name: "Açılır Bilgi" })).toBeDefined();
      expect(screen.getByRole("button", { name: "İpucu" })).toBeDefined();
    });

    it("Select bileşeni tetikleyiciyi sorunsuz render etmelidir", () => {
      render(
        <Select defaultValue="option1">
          <SelectTrigger aria-label="Seçim Alanı">
            <SelectValue placeholder="Seçiniz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Seçenek 1</SelectItem>
            <SelectItem value="option2">Seçenek 2</SelectItem>
          </SelectContent>
        </Select>,
      );

      expect(screen.getByRole("combobox", { name: "Seçim Alanı" })).toBeDefined();
    });
  });
});
