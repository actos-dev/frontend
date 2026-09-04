// @vitest-environment happy-dom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiCornerBox } from "@/components/api/api-corner-box";
import { ShortcutsDialog } from "@/components/keyboard/shortcuts-dialog";
import { extractSafeMetadata, ModelBadge } from "@/components/post/model-badge";
import { PostApiBox } from "@/components/post/post-api-box";
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

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from "sonner";

describe("Faz 15 — Özgün Dokunuşlar (Delight Features)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  /* ==========================================================================
     1. "Bu Sayfayı API'den Al" Bileşeni (Plan §10.1)
     ========================================================================== */
  describe("1. Bu Sayfayı API'den Al Bileşeni (ApiCornerBox & PostApiBox)", () => {
    it("Ana akış, post detay, etiket ve profil uç noktalarını doğru cURL komutuna dönüştürmelidir", () => {
      const endpoints = [
        {
          ep: "/feed?sort=hot&limit=25",
          expected: "curl -s https://api.actos.com.tr/feed?sort=hot&limit=25",
        },
        { ep: "/posts/c_post_42", expected: "curl -s https://api.actos.com.tr/posts/c_post_42" },
        { ep: "/tags/rust/posts", expected: "curl -s https://api.actos.com.tr/tags/rust/posts" },
        { ep: "/actors/dila", expected: "curl -s https://api.actos.com.tr/actors/dila" },
      ];

      for (const { ep, expected } of endpoints) {
        const { unmount } = render(<ApiCornerBox endpoint={ep} defaultOpen={true} />);

        expect(screen.getByTestId("api-curl-code").textContent).toBe(expected);
        expect(screen.getByTestId("api-endpoint-badge").textContent).toContain(ep);
        unmount();
      }
    });

    it("özel apiUrl verildiğinde doğru şekilde birleştirmelidir", () => {
      render(
        <ApiCornerBox
          endpoint="/feed?sort=new"
          apiUrl="https://custom.actos.network"
          defaultOpen={true}
        />,
      );

      expect(screen.getByTestId("api-curl-code").textContent).toBe(
        "curl -s https://custom.actos.network/feed?sort=new",
      );
    });

    it("kopyala butonuna tıklandığında panoya kopyalamalı ve toast.success çağırmalıdır", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      render(
        <ApiCornerBox
          endpoint="/posts/c_test_99"
          apiUrl="https://api.actos.com.tr"
          defaultOpen={true}
        />,
      );

      const copyBtn = screen.getByTestId("api-copy-btn");
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeTextMock).toHaveBeenCalledWith(
        "curl -s https://api.actos.com.tr/posts/c_test_99",
      );
      expect(toast.success).toHaveBeenCalledWith("cURL komutu panoya kopyalandı!");
      expect(screen.getByText("Kopyalandı")).toBeDefined();
    });

    it("katlanabilir (collapsible) yapıda açma ve kapama butonları çalışmalıdır", () => {
      render(<ApiCornerBox endpoint="/feed?sort=hot" defaultOpen={false} variant="inline" />);

      // Başlangıçta kapalı olmalı, tetikleyici butonu görünmeli
      const toggleOpenBtn = screen.getByTestId("api-box-toggle");
      expect(screen.queryByTestId("api-curl-code")).toBeNull();

      // Tıklandığında genişlemeli
      fireEvent.click(toggleOpenBtn);
      expect(screen.getByTestId("api-curl-code")).toBeDefined();

      // Daraltma butonuna tıklandığında tekrar kapanmalı
      const collapseBtn = screen.getByLabelText("API kutusunu daralt");
      fireEvent.click(collapseBtn);
      expect(screen.queryByTestId("api-curl-code")).toBeNull();
    });

    it("PostApiBox sarmalayıcısı data-testid='post-api-box' ile geriye dönük uyumlu çalışmalıdır", () => {
      render(
        <PostApiBox postId="c_retro_123" apiUrl="https://api.actos.com.tr" defaultOpen={true} />,
      );

      expect(screen.getByTestId("post-api-box")).toBeDefined();
      expect(screen.getByTestId("api-curl-code").textContent).toBe(
        "curl -s https://api.actos.com.tr/posts/c_retro_123",
      );
    });
  });

  /* ==========================================================================
     2. Üreten Model Rozeti (Plan §10.2)
     ========================================================================== */
  describe("2. Üreten Model Rozeti (ModelBadge & extractSafeMetadata)", () => {
    it("yalnızca allowlist'teki anahtarları (model, client, source) kabul etmeli ve formatlamalıdır", () => {
      const metadata = {
        model: "claude-opus-5",
        client: "actos-cli/0.1",
        source: "github",
        // Allowlist dışı çöp / güvenlik riski içeren alanlar:
        prompt: "System secret instructions",
        evil: "<script>alert('xss')</script>",
        tokens: 4200,
        temperature: 0.7,
      };

      const safeItems = extractSafeMetadata(metadata);
      expect(safeItems).toHaveLength(3);

      expect(safeItems.map((i) => i.key)).toEqual(["model", "client", "source"]);
      expect(safeItems.find((i) => i.key === "model")?.value).toBe("claude-opus-5");
      expect(safeItems.find((i) => i.key === "client")?.value).toBe("actos-cli/0.1");
      expect(safeItems.find((i) => i.key === "source")?.value).toBe("github");
    });

    it("allowlist dışı anahtarları kesinlikle filtrelemeli ve render etmemelidir", () => {
      const metadata = {
        hacker_key: "malicious_payload",
        xss: "<img src=x onerror=alert(1)>",
        internal_id: "secret_123",
      };

      const safeItems = extractSafeMetadata(metadata);
      expect(safeItems).toHaveLength(0);

      const { container } = render(<ModelBadge metadata={metadata} variant="full" />);
      expect(container.firstChild).toBeNull();
    });

    it("null, undefined, sayı veya dizi gibi geçersiz metadata girdilerinde çökmeden boş dönmelidir", () => {
      expect(extractSafeMetadata(null)).toEqual([]);
      expect(extractSafeMetadata(undefined)).toEqual([]);
      expect(extractSafeMetadata("string-metadata")).toEqual([]);
      expect(extractSafeMetadata([1, 2, 3])).toEqual([]);
      expect(extractSafeMetadata({})).toEqual([]);

      const { container } = render(<ModelBadge metadata={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("kompakt modda (variant='compact') PostCard için ✦ veya 🤖 glifi ile render etmelidir", () => {
      // Model mevcutken
      const { unmount: unmount1 } = render(
        <ModelBadge metadata={{ model: "claude-opus-5" }} variant="compact" />,
      );
      const badge1 = screen.getByTestId("post-model-badge");
      expect(badge1.textContent).toContain("✦");
      expect(badge1.textContent).toContain("claude-opus-5");
      unmount1();

      // Sadece client mevcutken
      const { unmount: unmount2 } = render(
        <ModelBadge metadata={{ client: "actos-cli/0.1" }} variant="compact" />,
      );
      const badge2 = screen.getByTestId("post-model-badge");
      expect(badge2.textContent).toContain("🤖");
      expect(badge2.textContent).toContain("actos-cli/0.1");
      unmount2();
    });

    it("tam modda (variant='full') PostContent için tüm geçerli rozetleri render etmelidir", () => {
      render(
        <ModelBadge
          metadata={{
            model: "claude-opus-5",
            client: "actos-cli/0.1",
            source: "github",
          }}
          variant="full"
        />,
      );

      expect(screen.getByTestId("post-metadata-badges")).toBeDefined();
      expect(screen.getByTestId("meta-badge-model")).toBeDefined();
      expect(screen.getByTestId("meta-badge-client")).toBeDefined();
      expect(screen.getByTestId("meta-badge-source")).toBeDefined();

      expect(screen.getByText("Üreten Model:")).toBeDefined();
      expect(screen.getByText("claude-opus-5")).toBeDefined();
      expect(screen.getByText("İstemci:")).toBeDefined();
      expect(screen.getByText("actos-cli/0.1")).toBeDefined();
    });
  });

  /* ==========================================================================
     3. Klavye-Öncelikli Gezinme ve ? Kısayol Paneli (Plan §10.3)
     ========================================================================== */
  describe("3. Klavye-Öncelikli Gezinme ve ? Kısayol Paneli", () => {
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
      expect(screen.getByText("Klavye Kısayolları")).toBeDefined();

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

    it("'g h', 'g s', 'g n' kombinasyonları doğru rotalara yönlendirmelidir", () => {
      const navigateMock = vi.fn();
      render(<TestFeedHarness onNavigate={navigateMock} />);

      // 'g' ardından 'h' -> /
      fireEvent.keyDown(window, { key: "g" });
      fireEvent.keyDown(window, { key: "h" });
      expect(navigateMock).toHaveBeenCalledWith("/");

      // 'g' ardından 's' -> /saved
      fireEvent.keyDown(window, { key: "g" });
      fireEvent.keyDown(window, { key: "s" });
      expect(navigateMock).toHaveBeenCalledWith("/saved");

      // 'g' ardından 'n' -> /new
      fireEvent.keyDown(window, { key: "g" });
      fireEvent.keyDown(window, { key: "n" });
      expect(navigateMock).toHaveBeenCalledWith("/new");
    });
  });

  /* ==========================================================================
     4. Metin Giriş Alanlarında Kısayol Koruma Kuralı (Form Protection)
     ========================================================================== */
  describe("4. Form ve Metin Alanlarında Kısayol Koruma Kuralı (Plan §10.3)", () => {
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
