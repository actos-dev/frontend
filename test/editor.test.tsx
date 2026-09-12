// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Post } from "actos";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewPostPage from "@/app/new/page";
import { EditPostForm } from "@/components/editor/edit-post-form";
import { IMAGE_LIMIT_USER_MESSAGE, ImageUploader } from "@/components/editor/image-uploader";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { sanitizeTag, TagsInput } from "@/components/editor/tags-input";
import { toast } from "@/components/ui/toast";
import { renderMarkdown } from "@/lib/markdown";
import {
  clearStoredDraft,
  DRAFT_STORAGE_KEY,
  getStoredDraft,
  saveStoredDraft,
  useEditorDraftStore,
} from "@/lib/stores/editor-draft";
import { MOCK_USERS, useSessionStore } from "@/lib/stores/session-store";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/new",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock toast notifications
vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock storage for happy-dom
const storageMap = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() {
    return storageMap.size;
  },
};

Object.defineProperty(window, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});

describe("Faz 10 — Post Editörü Test Paketi", () => {
  const sampleAuthorPost: Post = {
    id: "c_post_author",
    contentType: "post",
    title: "Yazarın Kendi Gönderisi",
    body: "Düzenlenebilir orijinal gövde metni.",
    bodyHtml: "<p>Düzenlenebilir orijinal gövde metni.</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_human_1",
      username: "efe",
      displayName: "Efe",
      actorType: "human",
      createdAt: "2026-08-01T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 10,
    upvotes: 10,
    downvotes: 0,
    commentCount: 2,
    tags: ["rust", "web"],
    createdAt: "2026-09-01T00:00:00Z",
    editedAt: null,
    attachments: [],
  };

  const sampleOtherUserPost: Post = {
    id: "c_post_other",
    contentType: "post",
    title: "Başka Yazarın Gönderisi",
    body: "Bu post başka bir kullanıcıya ait.",
    bodyHtml: "<p>Bu post başka bir kullanıcıya ait.</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_admin_1",
      username: "dila_ai",
      displayName: "Dila",
      actorType: "ai_agent",
      createdAt: "2026-08-01T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 25,
    upvotes: 25,
    downvotes: 0,
    commentCount: 5,
    tags: ["ai", "agents"],
    createdAt: "2026-09-02T00:00:00Z",
    editedAt: null,
    attachments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = "actos_locale=tr; path=/";
    window.localStorage.clear();
    useEditorDraftStore.setState({
      title: "",
      body: "",
      tags: [],
      isLoaded: false,
      hasDraft: false,
    });
    useSessionStore.setState({
      user: MOCK_USERS.humanUser, // username: "efe"
      status: "authenticated",
      unreadCount: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  // =========================================================================
  // 1. Markdown Editörü ve Önizleme Testleri
  // =========================================================================
  describe("1. Markdown Editörü (components/editor/markdown-editor.tsx)", () => {
    it("yaz ve önizle sekmeleri arasında sorunsuz geçiş yapmalıdır", () => {
      const handleChange = vi.fn();
      render(
        <MarkdownEditor value="### Başlık\n**Kalın metin** ve *italik*." onChange={handleChange} />,
      );

      // Başlangıçta Yaz sekmesi aktif, textarea görünür
      const textarea = screen.getByTestId("markdown-textarea");
      expect(textarea).toBeInTheDocument();

      // Önizle sekmesine tıkla
      const previewTab = screen.getByTestId("tab-preview");
      fireEvent.click(previewTab);

      // Önizleme konteyneri ve reading-prose kontrolü
      const preview = screen.getByTestId("markdown-preview");
      expect(preview).toBeInTheDocument();

      const readingProse = screen.getByTestId("preview-reading-prose");
      expect(readingProse.className).toContain("reading-prose");
      expect(readingProse.innerHTML).toContain("Başlık");
      expect(readingProse.innerHTML).toContain("<strong>Kalın metin</strong>");
    });

    it("boş içerikte önizleme bilgi mesajı göstermelidir", () => {
      render(<MarkdownEditor value="" onChange={vi.fn()} />);

      const previewTab = screen.getByTestId("tab-preview");
      fireEvent.click(previewTab);

      expect(screen.getByText(/Önizlenecek bir içerik yok/i)).toBeInTheDocument();
    });

    it("temel biçimlendirme araç çubuğu butonları (kalın, italik, başlık, link, kod, alıntı, liste) doğru biçimlendirmeyi eklemelidir", () => {
      let currentVal = "";
      const handleChange = vi.fn((val) => {
        currentVal = val;
      });

      render(<MarkdownEditor value={currentVal} onChange={handleChange} />);

      // Kalın butonu
      const boldBtn = screen.getByTestId("toolbar-bold");
      fireEvent.click(boldBtn);
      expect(handleChange).toHaveBeenCalledWith(expect.stringContaining("**kalın metin**"));

      // İtalik butonu
      const italicBtn = screen.getByTestId("toolbar-italic");
      fireEvent.click(italicBtn);
      expect(handleChange).toHaveBeenCalledWith(expect.stringContaining("*italik metin*"));

      // Başlık butonu
      const headingBtn = screen.getByTestId("toolbar-heading");
      fireEvent.click(headingBtn);
      expect(handleChange).toHaveBeenCalledWith(expect.stringContaining("### Başlık"));

      // Link butonu
      const linkBtn = screen.getByTestId("toolbar-link");
      fireEvent.click(linkBtn);
      expect(handleChange).toHaveBeenCalledWith(
        expect.stringContaining("[bağlantı metni](https://)"),
      );

      // Kod butonu
      const codeBtn = screen.getByTestId("toolbar-code");
      fireEvent.click(codeBtn);
      expect(handleChange).toHaveBeenCalledWith(expect.stringContaining("```"));

      // Alıntı butonu
      const quoteBtn = screen.getByTestId("toolbar-quote");
      fireEvent.click(quoteBtn);
      expect(handleChange).toHaveBeenCalledWith(expect.stringContaining("> alıntı metni"));

      // Liste butonu
      const listBtn = screen.getByTestId("toolbar-list");
      fireEvent.click(listBtn);
      expect(handleChange).toHaveBeenCalledWith(expect.stringContaining("- liste öğesi"));
    });

    it("renderMarkdown fonksiyonu güvenli HTML üretmeli ve raw script injection'ı engellemelidir", () => {
      const malicious = `<script>alert('xss')</script>\n# Güvenli Başlık\n- Madde 1\n> Bir alıntı`;
      const html = renderMarkdown(malicious);

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("Güvenli Başlık");
      expect(html).toContain("<li>Madde 1</li>");
      expect(html).toContain("<blockquote");
    });
  });

  // =========================================================================
  // 2. Etiket Girişi ve Otomatik Tamamlama Testleri
  // =========================================================================
  describe("2. Etiket Girişi ve Otomatik Tamamlama (components/editor/tags-input.tsx)", () => {
    it("etiketleri küçük harfe dönüştürmeli, geçersiz karakterleri ve baştaki # işaretini temizlemelidir", () => {
      expect(sanitizeTag("#RUST")).toBe("rust");
      expect(sanitizeTag("  #Postgre-SQL!_123  ")).toBe("postgre-sql_123");
      expect(sanitizeTag("a".repeat(40))).toHaveLength(32);
    });

    it("Enter ve virgül tuşlarıyla etiket eklemeli ve (x) butonuyla silebilmelidir", () => {
      const handleChange = vi.fn();
      render(<TagsInput value={["rust"]} onChange={handleChange} maxTags={5} />);

      expect(screen.getByTestId("tag-badge-rust")).toBeInTheDocument();

      const input = screen.getByTestId("tags-input-field");
      fireEvent.change(input, { target: { value: "postgres" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(handleChange).toHaveBeenCalledWith(["rust", "postgres"]);

      // Silme işlemi
      const removeBtn = screen.getByTestId("remove-tag-rust");
      fireEvent.click(removeBtn);
      expect(handleChange).toHaveBeenCalledWith([]);
    });

    it("en fazla 5 etiket sınırını korumalı ve sınırı aşınca uyarı göstermelidir", () => {
      const fiveTags = ["one", "two", "three", "four", "five"];
      const handleChange = vi.fn();

      render(<TagsInput value={fiveTags} onChange={handleChange} maxTags={5} />);

      // Sınır uyarısı görünür olmalı
      expect(screen.getByTestId("tags-limit-warning")).toBeInTheDocument();
      expect(screen.getByText(/En fazla 5 etiket ekleyebilirsiniz/i)).toBeInTheDocument();

      // Input alanı DOM'da gizlenmiş veya devre dışı olmalı
      expect(screen.queryByTestId("tags-input-field")).not.toBeInTheDocument();
    });

    it("otomatik tamamlama için /api/tags/search çağırmalı ve öneriye tıklayınca etiketi eklemelidir", async () => {
      const handleChange = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: [
            { name: "ai", postCount: 71 },
            { name: "architecture", postCount: 15 },
          ],
        }),
      } as unknown as Response);

      render(<TagsInput value={[]} onChange={handleChange} maxTags={5} />);

      const input = screen.getByTestId("tags-input-field");
      fireEvent.change(input, { target: { value: "a" } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/tags/search?q=a"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("tag-suggestion-ai")).toBeInTheDocument();
      });

      const suggestion = screen.getByTestId("tag-suggestion-ai");
      fireEvent.click(suggestion);

      expect(handleChange).toHaveBeenCalledWith(["ai"]);
    });
  });

  // =========================================================================
  // 3. Taslak Koruma (localStorage) Testleri
  // =========================================================================
  describe("3. Taslak Koruma (lib/stores/editor-draft.ts & app/new/page.tsx)", () => {
    it("yazılan başlık, gövde ve etiketleri localStorage içine otomatik kaydetmelidir", () => {
      saveStoredDraft({
        title: "Taslak Başlığı",
        body: "Taslak gövdesi...",
        tags: ["taslak", "test"],
      });

      const draft = getStoredDraft();
      expect(draft).not.toBeNull();
      expect(draft?.title).toBe("Taslak Başlığı");
      expect(draft?.body).toBe("Taslak gövdesi...");
      expect(draft?.tags).toEqual(["taslak", "test"]);

      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      expect(raw).toContain("Taslak Başlığı");
    });

    it("sayfa açıldığında localStorage'daki taslağı otomatik geri yüklemelidir", async () => {
      saveStoredDraft({
        title: "Kurtarılan Başlık",
        body: "Kurtarılan gövde",
        tags: ["kurtar"],
      });

      render(<NewPostPage />);

      await waitFor(() => {
        const titleInput = screen.getByTestId("post-title-input") as HTMLInputElement;
        expect(titleInput.value).toBe("Kurtarılan Başlık");
      });

      const bodyTextarea = screen.getByTestId("markdown-textarea") as HTMLTextAreaElement;
      expect(bodyTextarea.value).toBe("Kurtarılan gövde");

      expect(screen.getByTestId("tag-badge-kurtar")).toBeInTheDocument();
      expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("taslak geri yüklendi"));
    });

    it("Taslağı Temizle butonuna basıldığında taslağı sıfırlamalı ve localStorage'dan silmelidir", async () => {
      saveStoredDraft({
        title: "Silinecek Taslak",
        body: "Silinecek İçerik",
        tags: ["gecici"],
      });

      render(<NewPostPage />);

      await waitFor(() => {
        expect(screen.getByTestId("clear-draft-button")).toBeInTheDocument();
      });

      const clearBtn = screen.getByTestId("clear-draft-button");
      fireEvent.click(clearBtn);

      const titleInput = screen.getByTestId("post-title-input") as HTMLInputElement;
      expect(titleInput.value).toBe("");

      const bodyTextarea = screen.getByTestId("markdown-textarea") as HTMLTextAreaElement;
      expect(bodyTextarea.value).toBe("");

      expect(getStoredDraft()).toBeNull();
      expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it("clearStoredDraft çağrıldığında taslak tamamen silinmelidir", () => {
      saveStoredDraft({ title: "Başlık", body: "Gövde", tags: [] });
      expect(getStoredDraft()).not.toBeNull();

      clearStoredDraft();
      expect(getStoredDraft()).toBeNull();
    });
  });

  // =========================================================================
  // 4. Çift Gönderim Engeli ve Idempotency Testleri
  // =========================================================================
  describe("4. Çift Gönderim Engeli (Double-submission Prevention)", () => {
    it("yayınla butonuna basıldığında buton devre dışı kalmalı, spinner gösterilmeli ve çift tıklama engellenmelidir", async () => {
      let resolvePromise: (val: unknown) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn().mockImplementation(() => delayedPromise);

      render(<NewPostPage />);

      const titleInput = screen.getByTestId("post-title-input");
      const bodyTextarea = screen.getByTestId("markdown-textarea");
      const publishBtn = screen.getByTestId("publish-button") as HTMLButtonElement;

      // Başlangıçta boşken buton disabled
      expect(publishBtn).toBeDisabled();

      // Değerleri doldur
      fireEvent.change(titleInput, { target: { value: "Yeni Gönderi" } });
      fireEvent.change(bodyTextarea, { target: { value: "Gönderi içeriği" } });

      expect(publishBtn).not.toBeDisabled();

      // İlk tıklama
      fireEvent.click(publishBtn);

      // Buton hemen disabled olmalı ve spinner gösterilmeli
      expect(publishBtn).toBeDisabled();
      expect(screen.getByText(/Yayınlanıyor\.\.\./i)).toBeInTheDocument();

      // Çift tıklama denemesi
      fireEvent.click(publishBtn);

      // Sadece 1 adet istek gitmiş olmalı
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // İsteği tamamla
      await act(async () => {
        resolvePromise?.({
          ok: true,
          json: async () => ({
            ok: true,
            data: { id: "c_post_new", slug: "yeni-gonderi" },
          }),
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/posts/c_post_new/yeni-gonderi");
      });
    });
  });

  // =========================================================================
  // 5. Görsel Ekleme (Staged) Testleri (components/editor/image-uploader.tsx)
  // =========================================================================
  describe("5. Görsel Ekleme — Standalone yükleme yok, görseller gönderiyle birlikte gider", () => {
    it("seçilen görsel hemen onFilesChange ile bildirilmeli ve önizlemesi render edilmelidir (ağ isteği YOK)", async () => {
      const handleFilesChange = vi.fn();
      global.fetch = vi.fn();

      render(<ImageUploader files={[]} onFilesChange={handleFilesChange} />);

      const fileInput = screen.getByTestId("image-file-input");
      const file = new File(["dummy content"], "diyagram.png", { type: "image/png" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(handleFilesChange).toHaveBeenCalledWith([file]);
      });

      // Standalone upload artık yok: hiçbir ağ isteği atılmamalı
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("seçili görseller kaldırılabilmelidir", () => {
      const file = new File(["dummy content"], "diyagram.png", { type: "image/png" });
      const handleFilesChange = vi.fn();

      render(<ImageUploader files={[file]} onFilesChange={handleFilesChange} />);

      expect(screen.getByTestId("staged-image-0")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("remove-staged-image-0"));

      expect(handleFilesChange).toHaveBeenCalledWith([]);
    });

    it("desteklenmeyen dosya formatında veya dosya boyutu aşımında anlaşılır bir sınır mesajı sunmalıdır", async () => {
      render(<ImageUploader files={[]} onFilesChange={vi.fn()} />);

      const fileInput = screen.getByTestId("image-file-input");
      const unsupportedFile = new File(["content"], "doc.pdf", { type: "application/pdf" });

      fireEvent.change(fileInput, { target: { files: [unsupportedFile] } });

      await waitFor(() => {
        const errorAlert = screen.getByTestId("upload-quota-error");
        expect(errorAlert.textContent).toContain(IMAGE_LIMIT_USER_MESSAGE);
      });
    });

    it("gönderi başına en fazla 4 görsel kabul etmelidir", () => {
      const existing = Array.from(
        { length: 4 },
        (_, i) => new File([`content-${i}`], `img-${i}.png`, { type: "image/png" }),
      );

      render(<ImageUploader files={existing} onFilesChange={vi.fn()} />);

      // Sınıra ulaşıldığında dropzone gizlenmelidir
      expect(screen.queryByTestId("image-dropzone")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. Rotalar, Giriş ve Sahiplik Kontrolü Testleri
  // =========================================================================
  describe("6. Rotalar, Giriş ve Sahiplik Kontrolü (app/new & app/posts/[id]/edit)", () => {
    it("giriş yapılmamışsa /new sayfasında açık giriş kartı ve /login?returnUrl=/new bağlantısı göstermelidir", () => {
      useSessionStore.setState({
        user: null,
        status: "unauthenticated",
      });

      render(<NewPostPage />);

      const loginCard = screen.getByTestId("login-required-card");
      expect(loginCard).toBeInTheDocument();
      expect(screen.getByText(/Yeni post oluşturmak için giriş yapmalısın/i)).toBeInTheDocument();

      const loginLink = screen.getByRole("link", { name: /Giriş Yap/i });
      expect(loginLink.getAttribute("href")).toBe("/login?returnUrl=/new");
    });

    it("edit sayfasında kullanıcı postun yazarı DEĞİLSE 403 / Bu içeriği düzenleme yetkiniz yok uyarısı vermelidir", () => {
      // Oturumdaki kullanıcı: 'efe'
      // sampleOtherUserPost yazarı: 'dila_ai'
      useSessionStore.setState({
        user: MOCK_USERS.humanUser, // efe
        status: "authenticated",
      });

      render(<EditPostForm post={sampleOtherUserPost} />);

      const forbiddenCard = screen.getByTestId("forbidden-edit-card");
      expect(forbiddenCard).toBeInTheDocument();
      expect(screen.getByText(/Bu içeriği düzenleme yetkiniz yok/i)).toBeInTheDocument();
      expect(screen.queryByTestId("update-button")).not.toBeInTheDocument();
    });

    it("edit sayfasında kullanıcı postun yazarı İSE formu doldurmalı ve güncellemeyi gönderebilmelidir", async () => {
      // Oturumdaki kullanıcı: 'efe'
      // sampleAuthorPost yazarı: 'efe'
      useSessionStore.setState({
        user: MOCK_USERS.humanUser,
        status: "authenticated",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: { ...sampleAuthorPost, title: "Güncellenmiş Başlık" },
        }),
      } as unknown as Response);

      render(<EditPostForm post={sampleAuthorPost} />);

      expect(screen.queryByTestId("forbidden-edit-card")).not.toBeInTheDocument();

      const titleInput = screen.getByTestId("edit-title-input") as HTMLInputElement;
      expect(titleInput.value).toBe("Yazarın Kendi Gönderisi");

      const bodyTextarea = screen.getByTestId("markdown-textarea") as HTMLTextAreaElement;
      expect(bodyTextarea.value).toBe("Düzenlenebilir orijinal gövde metni.");

      const updateBtn = screen.getByTestId("update-button");
      expect(updateBtn).not.toBeDisabled();

      fireEvent.change(titleInput, { target: { value: "Güncellenmiş Başlık" } });
      fireEvent.click(updateBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/posts/${sampleAuthorPost.id}`,
          expect.objectContaining({
            method: "PATCH",
          }),
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(`/posts/${sampleAuthorPost.id}`);
      });
    });
  });
});
