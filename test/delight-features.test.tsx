// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShortcutsDialog } from "@/components/keyboard/shortcuts-dialog";
import { isEditableElement, useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

// Mock next/navigation
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

describe("Faz 15 — Özgün Dokunuşlar (Delight Features)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  /* ==========================================================================
     2. Klavye-Öncelikli Gezinme ve ? Kısayol Paneli (ROADMAP.md S-05)
     ========================================================================== */
  describe("2. Klavye-Öncelikli Gezinme ve ? Kısayol Paneli", () => {
    // Test Harness bileşeni
    function TestFeedHarness({ onNavigate }: { onNavigate?: (href: string) => void }) {
      const shortcuts = useKeyboardShortcuts({ onNavigate });
      const [votes, setVotes] = useState<Record<string, number>>({});
      const [saved, setSaved] = useState<Record<string, boolean>>({});

      return (
        <div>
          <ShortcutsDialog
            open={shortcuts.shortcutsDialogOpen}
            onOpenChange={shortcuts.setShortcutsDialogOpen}
          />

          <input
            type="search"
            aria-label="Arama kutusu"
            placeholder="Arama yap..."
            data-testid="search-input"
          />

          <div id="posts-container">
            {["post-1", "post-2", "post-3"].map((id, index) => (
              <article
                key={id}
                data-testid="post-card"
                data-post-id={id}
                data-post-href={`/posts/${id}/slug-${index}`}
                className="card"
              >
                <h2>
                  <a data-testid="post-title-link" href={`/posts/${id}/slug-${index}`}>
                    Başlık {id}
                  </a>
                </h2>
                <button
                  type="button"
                  data-testid="post-vote-up"
                  aria-label="Yukarı oy ver"
                  onClick={() => setVotes((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))}
                >
                  Oy ({votes[id] || 0})
                </button>
                <button
                  type="button"
                  data-testid="post-save-btn"
                  aria-label="Kaydet"
                  onClick={() => setSaved((prev) => ({ ...prev, [id]: !prev[id] }))}
                >
                  {saved[id] ? "Kaydedildi" : "Kaydet"}
                </button>
              </article>
            ))}
          </div>
        </div>
      );
    }

    it("'j' ve 'k' tuşları ile akışta sonraki ve önceki gönderi seçilmeli ve odak halkası eklenmelidir", () => {
      render(<TestFeedHarness />);

      const cards = screen.getAllByTestId("post-card");
      expect(cards[0].getAttribute("data-keyboard-selected")).toBeNull();

      // 'j' basıldığında ilk kart seçilmeli
      fireEvent.keyDown(window, { key: "j" });
      expect(cards[0].getAttribute("data-keyboard-selected")).toBe("true");
      expect(cards[0].className).toContain("ring-primary");

      // Tekrar 'j' basıldığında 2. kart seçilmeli
      fireEvent.keyDown(window, { key: "j" });
      expect(cards[0].getAttribute("data-keyboard-selected")).toBeNull();
      expect(cards[1].getAttribute("data-keyboard-selected")).toBe("true");

      // Tekrar 'j' basıldığında 3. kart seçilmeli
      fireEvent.keyDown(window, { key: "j" });
      expect(cards[2].getAttribute("data-keyboard-selected")).toBe("true");

      // Sonda iken tekrar 'j' basıldığında son kartta kalmalı
      fireEvent.keyDown(window, { key: "j" });
      expect(cards[2].getAttribute("data-keyboard-selected")).toBe("true");

      // 'k' basıldığında önceki karta (2. kart) dönmeli
      fireEvent.keyDown(window, { key: "k" });
      expect(cards[1].getAttribute("data-keyboard-selected")).toBe("true");
      expect(cards[2].getAttribute("data-keyboard-selected")).toBeNull();

      // Tekrar 'k' basıldığında 1. karta dönmeli
      fireEvent.keyDown(window, { key: "k" });
      expect(cards[0].getAttribute("data-keyboard-selected")).toBe("true");

      // Baştayken 'k' basıldığında 1. kartta kalmalı
      fireEvent.keyDown(window, { key: "k" });
      expect(cards[0].getAttribute("data-keyboard-selected")).toBe("true");
    });

    it("'o' veya 'Enter' tuşuna basıldığında seçili gönderinin sayfasına gitmelidir", () => {
      const navigateMock = vi.fn();
      render(<TestFeedHarness onNavigate={navigateMock} />);

      // Kart seçili değilken 'Enter' hiçbir şey yapmamalı
      fireEvent.keyDown(window, { key: "Enter" });
      expect(navigateMock).not.toHaveBeenCalled();

      // İlk kartı seç
      fireEvent.keyDown(window, { key: "j" });

      // 'Enter' basıldığında post sayfasına gitmeli
      fireEvent.keyDown(window, { key: "Enter" });
      expect(navigateMock).toHaveBeenCalledWith("/posts/post-1/slug-0");

      // 2. kartı seçip 'o' tuşuna bas
      fireEvent.keyDown(window, { key: "j" });
      fireEvent.keyDown(window, { key: "o" });
      expect(navigateMock).toHaveBeenCalledWith("/posts/post-2/slug-1");
    });

    it("'u' tuşuna basıldığında seçili gönderiye yukarı oy vermelidir", () => {
      render(<TestFeedHarness />);
      const cards = screen.getAllByTestId("post-card");

      // İlk gönderiyi seç
      fireEvent.keyDown(window, { key: "j" });

      // 'u' basıldığında oy butonunun tetiklendiğini kontrol et
      expect(cards[0].querySelector('[data-testid="post-vote-up"]')?.textContent).toContain(
        "Oy (0)",
      );
      fireEvent.keyDown(window, { key: "u" });
      expect(cards[0].querySelector('[data-testid="post-vote-up"]')?.textContent).toContain(
        "Oy (1)",
      );

      // Tekrar 'u' basıldığında oy 2 olmalı
      fireEvent.keyDown(window, { key: "u" });
      expect(cards[0].querySelector('[data-testid="post-vote-up"]')?.textContent).toContain(
        "Oy (2)",
      );
    });

    it("'s' tuşuna basıldığında seçili gönderiyi kaydetmelidir", () => {
      render(<TestFeedHarness />);

      // İlk gönderiyi seç
      fireEvent.keyDown(window, { key: "j" });

      // 's' bas
      expect(screen.getAllByText("Kaydet")[0]).toBeDefined();
      fireEvent.keyDown(window, { key: "s" });
      expect(screen.getByText("Kaydedildi")).toBeDefined();

      // Tekrar 's' basınca kayıt kaldırılmalı
      fireEvent.keyDown(window, { key: "s" });
      expect(screen.getAllByText("Kaydet")[0]).toBeDefined();
    });

    it("'/' tuşuna basıldığında arama kutusuna odaklanmalıdır", () => {
      render(<TestFeedHarness />);

      const searchInput = screen.getByTestId("search-input");
      expect(document.activeElement).not.toBe(searchInput);

      fireEvent.keyDown(window, { key: "/" });
      expect(document.activeElement).toBe(searchInput);
    });

    it("'?' tuşuna basıldığında kısayol penceresini açıp kapatmalıdır", () => {
      render(<TestFeedHarness />);

      // Başlangıçta diyalog kapalı
      expect(screen.queryByTestId("shortcuts-dialog")).toBeNull();

      // '?' basıldığında açılmalı
      fireEvent.keyDown(window, { key: "?" });
      expect(screen.getByTestId("shortcuts-dialog")).toBeDefined();
      expect(screen.getByText(/(Keyboard shortcuts|Klavye kısayolları)/i)).toBeDefined();

      // Tekrar '?' basıldığında kapanmalı
      fireEvent.keyDown(window, { key: "?" });
      expect(screen.queryByTestId("shortcuts-dialog")).toBeNull();
    });

    it("'Esc' tuşu modal açıksa modalı kapatmalı, değilse post seçimini kaldırmalıdır", () => {
      render(<TestFeedHarness />);
      const cards = screen.getAllByTestId("post-card");

      // Kart seç
      fireEvent.keyDown(window, { key: "j" });
      expect(cards[0].getAttribute("data-keyboard-selected")).toBe("true");

      // Modalı aç
      fireEvent.keyDown(window, { key: "?" });
      expect(screen.getByTestId("shortcuts-dialog")).toBeDefined();

      // Esc: Önce modal kapanmalı, seçim kalmalı
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("shortcuts-dialog")).toBeNull();
      expect(cards[0].getAttribute("data-keyboard-selected")).toBe("true");

      // Esc: Şimdi kart seçimi temizlenmeli
      fireEvent.keyDown(window, { key: "Escape" });
      expect(cards[0].getAttribute("data-keyboard-selected")).toBeNull();
    });

    it("'c' tuşuna basıldığında gönderi oluşturma sayfasına yönlendirmelidir (ROADMAP K-11: g-chord'lar kaldırıldı)", () => {
      const navigateMock = vi.fn();
      render(<TestFeedHarness onNavigate={navigateMock} />);

      fireEvent.keyDown(window, { key: "c" });
      expect(navigateMock).toHaveBeenCalledWith("/new");
    });

    it("'g' tek başına artık hiçbir kısayolu tetiklememelidir (g-chord navigasyonu kaldırıldı)", () => {
      const navigateMock = vi.fn();
      render(<TestFeedHarness onNavigate={navigateMock} />);

      fireEvent.keyDown(window, { key: "g" });
      fireEvent.keyDown(window, { key: "h" });
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  /* ==========================================================================
     3. Metin Giriş Alanlarında Kısayol Koruma Kuralı (Form Protection)
     ========================================================================== */
  describe("3. Form ve Metin Alanlarında Kısayol Koruma Kuralı (Plan §10.3)", () => {
    function FormInputHarness({ onNavigate }: { onNavigate?: (href: string) => void }) {
      useKeyboardShortcuts({ onNavigate });
      return (
        <div>
          <input type="text" data-testid="test-input" defaultValue="" />
          <textarea data-testid="test-textarea" defaultValue="" />
          <div contentEditable={true} data-testid="test-contenteditable">
            Düzenlenebilir içerik
          </div>

          <div id="posts-container">
            <article
              data-testid="post-card"
              data-post-id="c_isolated"
              data-post-href="/posts/c_isolated/test"
            >
              <h2>Başlık</h2>
              <button
                type="button"
                data-testid="post-vote-up"
                aria-label="Yukarı oy ver"
                onClick={() => {
                  throw new Error("Form alanında oy verilmemeli!");
                }}
              >
                Oy
              </button>
              <button
                type="button"
                data-testid="post-save-btn"
                aria-label="Kaydet"
                onClick={() => {
                  throw new Error("Form alanında kayıt yapılmamalı!");
                }}
              >
                Kaydet
              </button>
            </article>
          </div>
        </div>
      );
    }

    it("isEditableElement yardımcısı input, textarea ve contenteditable alanları doğru tespit etmelidir", () => {
      const input = document.createElement("input");
      const textarea = document.createElement("textarea");
      const select = document.createElement("select");
      const div = document.createElement("div");
      const editableDiv = document.createElement("div");
      editableDiv.setAttribute("contenteditable", "true");

      const childInInput = document.createElement("span");
      input.appendChild(childInInput);

      expect(isEditableElement(input)).toBe(true);
      expect(isEditableElement(textarea)).toBe(true);
      expect(isEditableElement(select)).toBe(true);
      expect(isEditableElement(editableDiv)).toBe(true);
      expect(isEditableElement(div)).toBe(false);
      expect(isEditableElement(null)).toBe(false);
    });

    it("kullanıcı input alanına odaklandığında j, k, u, s, ?, o, Enter kısayolları kesinlikle devre dışı olmalıdır", () => {
      const navigateMock = vi.fn();
      render(<FormInputHarness onNavigate={navigateMock} />);

      const input = screen.getByTestId("test-input");
      input.focus();
      expect(document.activeElement).toBe(input);

      // Kısayol tuşlarına bas
      for (const key of ["j", "k", "u", "s", "?", "o", "Enter", "/", "g", "h"]) {
        fireEvent.keyDown(input, { key });
      }

      // Kart seçilmemiş olmalı
      const card = screen.getByTestId("post-card");
      expect(card.getAttribute("data-keyboard-selected")).toBeNull();

      // Navigasyon çağrılmamış olmalı
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("kullanıcı textarea alanına odaklandığında kısayollar kesinlikle devre dışı olmalıdır", () => {
      const navigateMock = vi.fn();
      render(<FormInputHarness onNavigate={navigateMock} />);

      const textarea = screen.getByTestId("test-textarea");
      textarea.focus();
      expect(document.activeElement).toBe(textarea);

      for (const key of ["j", "k", "u", "s", "?", "o", "Enter", "/"]) {
        fireEvent.keyDown(textarea, { key });
      }

      const card = screen.getByTestId("post-card");
      expect(card.getAttribute("data-keyboard-selected")).toBeNull();
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("kullanıcı contenteditable alanına odaklandığında kısayollar kesinlikle devre dışı olmalıdır", () => {
      const navigateMock = vi.fn();
      render(<FormInputHarness onNavigate={navigateMock} />);

      const editable = screen.getByTestId("test-contenteditable");
      editable.focus();

      for (const key of ["j", "k", "u", "s", "?"]) {
        fireEvent.keyDown(editable, { key });
      }

      const card = screen.getByTestId("post-card");
      expect(card.getAttribute("data-keyboard-selected")).toBeNull();
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("Ctrl, Alt veya Meta tuşları basılıyken tek harf kısayolları tetiklenmemelidir", () => {
      const navigateMock = vi.fn();
      render(<FormInputHarness onNavigate={navigateMock} />);

      // Sayfa boşluğunda iken Ctrl+j, Cmd+j, Alt+j
      fireEvent.keyDown(window, { key: "j", ctrlKey: true });
      fireEvent.keyDown(window, { key: "j", metaKey: true });
      fireEvent.keyDown(window, { key: "j", altKey: true });

      const card = screen.getByTestId("post-card");
      expect(card.getAttribute("data-keyboard-selected")).toBeNull();
    });
  });
});
