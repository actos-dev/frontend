// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import type { Actor, ActorProfile, ApiKey } from "actos";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "@/app/u/[username]/page";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { RecoveryCodesManager } from "@/components/settings/recovery-codes-manager";
import { toast } from "@/components/ui/toast";
import * as actosLib from "@/lib/actos";
import * as recoveryFileLib from "@/lib/recovery-file";
import { useSessionStore } from "@/lib/stores/session-store";
import { renderWithQueryClient as render } from "@/test/query-test-utils";

// Mock next/navigation
const mockPush = vi.fn();
let currentMockParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/settings",
  useSearchParams: () => currentMockParams,
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// Mock toast
vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Faz 11 — Profil ve Ayarlar Test Paketi", () => {
  const sampleHumanActor: Actor = {
    id: "a_efe",
    username: "efe",
    displayName: "Efe",
    actorType: "human",
    bio: "Actos platform kurucusu ve yazılım mühendisi.",
    avatarUrl: "https://example.com/avatars/efe.png",
    createdAt: "2026-01-15T12:00:00Z",
  };

  const sampleAgentActor: Actor = {
    id: "a_dila",
    username: "dila_ai",
    displayName: "Dila",
    actorType: "ai_agent",
    bio: "Otonom yapay zekâ araştırma asistanı.",
    avatarUrl: null,
    createdAt: "2026-01-10T10:00:00Z",
  };

  const sampleProfile: ActorProfile = {
    actor: sampleHumanActor,
    stats: {
      postCount: 14,
      commentCount: 42,
      totalScore: 180,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentMockParams = new URLSearchParams();
    document.cookie = "actos_locale=tr";

    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/session")) {
        return {
          ok: true,
          json: async () => ({ ok: true }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ ok: true }),
      } as Response;
    });

    useSessionStore.getState().setUser({
      id: "a_efe",
      username: "efe",
      displayName: "Efe",
      actorType: "human",
      role: "user",
    });

    // Mock clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Profil Sayfası Başlık, Glif + Etiket Flair ve Yaş Testi
  // =========================================================================
  describe("1. Profil Sayfası Başlık ve Rozet Render Testi", () => {
    it("profil başlığında yazar bilgisi, bio ve Plan §7.3 glif + etiket flair'ını eksiksiz render eder", () => {
      // Profil sahibi olarak render
      render(
        <ProfileHeader
          actor={sampleHumanActor}
          stats={sampleProfile.stats}
          followerCount={12}
          followingCount={8}
        />,
      );

      // Görünen ad ve @username
      expect(screen.getByText("Efe")).toBeInTheDocument();
      expect(screen.getByText("@efe")).toBeInTheDocument();
      expect(screen.getByTestId("profile-bio")).toHaveTextContent(
        "Actos platform kurucusu ve yazılım mühendisi.",
      );

      // ROADMAP K-08: humans get no actor badge at all (the ✦ glyph and the
      // "İnsan" pill are gone; the circular avatar is the only signal).
      expect(screen.queryByTestId("profile-actor-badge")).not.toBeInTheDocument();

      // Hesap Yaşı: "Ocak 2026'dan beri üye"
      const ageEl = screen.getByTestId("account-age");
      expect(ageEl).toBeInTheDocument();
      expect(ageEl.textContent).toContain("Ocak 2026");
      expect(ageEl.textContent).toContain("beri üye");

      // İstatistikler
      expect(screen.getByTestId("stat-posts")).toHaveTextContent("14");
      expect(screen.getByTestId("stat-comments")).toHaveTextContent("42");
      expect(screen.getByTestId("stat-followers")).toHaveTextContent("12");
      expect(screen.getByTestId("stat-following")).toHaveTextContent("8");

      // Profil sahibi oturumda olduğu için "Profili Düzenle" butonu render edilir
      expect(screen.getByTestId("edit-profile-button")).toBeInTheDocument();
      expect(screen.queryByTestId("follow-button")).not.toBeInTheDocument();
    });

    it("yapay zekâ ajanı için doğru glif + etiket (✦ AI agent) gösterir ve ziyaretçi için FollowButton sunar", () => {
      // Ziyaretçi olarak oturum aç (efe, dila_ai'nin profiline bakıyor)
      useSessionStore.getState().setUser({
        id: "a_efe",
        username: "efe",
        displayName: "Efe",
        actorType: "human",
        role: "user",
      });

      render(
        <ProfileHeader
          actor={sampleAgentActor}
          stats={{ postCount: 5, commentCount: 20, totalScore: 95 }}
          followerCount={40}
          followingCount={3}
        />,
      );

      // ROADMAP K-08: agents get the mono AgentLabel chip, no ✦ glyph.
      const badge = screen.getByTestId("profile-actor-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("Agent");

      // Ziyaretçi olduğu için FollowButton görünür, "Profili Düzenle" görünmez
      expect(screen.getByTestId("follow-button")).toBeInTheDocument();
      expect(screen.queryByTestId("edit-profile-button")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. Profil Sekmeleri Geçiş Testi
  // =========================================================================
  describe("2. Profil Sekmeleri Geçiş Testi", () => {
    it("tüm 4 sekmeyi render eder ve aktif sekmeyi işaretler", () => {
      const { rerender } = render(
        <ProfileTabs
          username="efe"
          activeTab="posts"
          postCount={14}
          commentCount={42}
          followerCount={12}
          followingCount={8}
        />,
      );

      const postsTab = screen.getByTestId("profile-tab-posts");
      const commentsTab = screen.getByTestId("profile-tab-comments");
      const followersTab = screen.getByTestId("profile-tab-followers");
      const followingTab = screen.getByTestId("profile-tab-following");

      expect(postsTab).toHaveAttribute("aria-current", "page");
      expect(commentsTab).not.toHaveAttribute("aria-current");

      expect(postsTab).toHaveAttribute("href", "/u/efe");
      expect(commentsTab).toHaveAttribute("href", "/u/efe?tab=comments");
      expect(followersTab).toHaveAttribute("href", "/u/efe?tab=followers");
      expect(followingTab).toHaveAttribute("href", "/u/efe?tab=following");

      // Sekme değiştiğinde
      rerender(
        <ProfileTabs
          username="efe"
          activeTab="comments"
          postCount={14}
          commentCount={42}
          followerCount={12}
          followingCount={8}
        />,
      );
      expect(commentsTab).toHaveAttribute("aria-current", "page");
      expect(postsTab).not.toHaveAttribute("aria-current");
    });
  });

  // =========================================================================
  // 3. Avatar Uç Noktaları Testi (POST/DELETE /api/actors/me/avatar)
  // =========================================================================
  describe("3. Avatar Uç Noktaları Testi", () => {
    it("Profil kaydı: PATCH isteği yalnızca displayName ve bio taşır, avatar alanı hiç yok", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          actor: { ...sampleHumanActor, displayName: "Yeni Efe" },
        }),
      } as Response);

      render(<ProfileSettingsForm initialActor={sampleHumanActor} />);

      const nameInput = screen.getByTestId("display-name-input");
      fireEvent.change(nameInput, { target: { value: "Yeni Efe" } });

      const saveButton = screen.getByTestId("save-profile-button");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/actors/me",
          expect.objectContaining({
            method: "PATCH",
          }),
        );
      });

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(callBody.displayName).toBe("Yeni Efe");
      // Avatar alanı hiçbir zaman gönderilmez; kendi uç noktasından yönetilir
      expect(callBody).not.toHaveProperty("avatar");
      expect(toast.success).toHaveBeenCalledWith("Profil başarıyla güncellendi.");
    });

    it("'Fotoğrafı Kaldır' tıklandığında hemen DELETE /api/actors/me/avatar isteği atar", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      render(<ProfileSettingsForm initialActor={sampleHumanActor} />);

      const removeButton = screen.getByText("Fotoğrafı Kaldır");
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/actors/me/avatar",
          expect.objectContaining({ method: "DELETE" }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Fotoğraf kaldırıldı");
    });

    it("Yeni görsel seçildiğinde dosya hemen POST /api/actors/me/avatar'a multipart olarak yüklenir", async () => {
      const uploadResponse = {
        ok: true,
        data: {
          avatarUrl: "https://example.com/uploads/new-avatar.png",
        },
      };

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => uploadResponse,
      } as Response);

      render(<ProfileSettingsForm initialActor={sampleHumanActor} />);

      // Görsel yükleme simülasyonu
      const file = new File(["test-image-binary"], "avatar.png", {
        type: "image/png",
      });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/actors/me/avatar",
          expect.objectContaining({ method: "POST" }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Avatar güncellendi.");
    });
  });

  // =========================================================================
  // 4. API Anahtarı Oluşturma (Bir Kez Gösterim) ve İptal Testi
  // =========================================================================
  describe("4. API Anahtarı Yönetimi Testi (Plan §Faz 11)", () => {
    const existingKey: ApiKey = {
      id: "key_uuid_12345678",
      label: "CLI Script",
      createdAt: "2026-09-01T10:00:00Z",
      lastUsedAt: "2026-09-04T12:00:00Z",
      revokedAt: null,
    };

    it("yeni anahtar oluşturulduğunda YALNIZCA BİR KEZ gösterilir ve kritik uyarıyı verir", async () => {
      const createResponse = {
        ok: true,
        data: {
          key: {
            id: "key_uuid_87654321",
            label: "Bot Anahtarı",
            createdAt: "2026-09-04T20:00:00Z",
            lastUsedAt: null,
            revokedAt: null,
          },
          apiKey: "actos_secret_generated_key_live_xyz",
        },
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => createResponse,
      } as Response);

      render(<ApiKeysManager initialKeys={[existingKey]} />);

      // Mevcut anahtar listede görünmeli
      expect(screen.getByText("CLI Script")).toBeInTheDocument();
      expect(screen.getByText("actos_key_uuid...")).toBeInTheDocument();

      // "Yeni Anahtar Oluştur" butonuna tıkla
      fireEvent.click(screen.getByTestId("create-key-button"));

      const labelInput = screen.getByTestId("key-label-input");
      fireEvent.change(labelInput, { target: { value: "Bot Anahtarı" } });

      // Formu gönder
      fireEvent.click(screen.getByTestId("submit-create-key"));

      // Kritik Güvenlik Uyarısı render edilmeli
      await waitFor(() => {
        expect(screen.getByTestId("key-warning")).toBeInTheDocument();
      });

      expect(screen.getByTestId("key-warning")).toHaveTextContent(
        "Bu anahtarı bir daha göremeyeceksiniz, lütfen güvenli bir yere kaydedin.",
      );

      // Düz metin anahtar görünmeli
      const revealedInput = screen.getByTestId("revealed-api-key") as HTMLInputElement;
      expect(revealedInput.value).toBe("actos_secret_generated_key_live_xyz");

      // Kopyalama butonu
      const copyButton = screen.getByTestId("copy-key-button");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          "actos_secret_generated_key_live_xyz",
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Anahtar panoya kopyalandı!");
      });
    });

    it("anahtar iptal edildiğinde onay diyalogu açılır ve sunucuya DELETE isteği atar", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      render(<ApiKeysManager initialKeys={[existingKey]} />);

      const revokeButton = screen.getByTestId("revoke-key-key_uuid_12345678");
      fireEvent.click(revokeButton);

      // Onay modalı açılmalı
      expect(
        screen.getByText(/Bu anahtarı iptal etmek istediğinize emin misiniz/),
      ).toBeInTheDocument();

      // İptali onayla
      const confirmButton = screen.getByTestId("confirm-revoke-key");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/settings/keys/key_uuid_12345678",
          expect.objectContaining({ method: "DELETE" }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("API anahtarı başarıyla iptal edildi.");
    });
  });

  // =========================================================================
  // 5. Kurtarma Kodları Yenileme Uyarısı ve .txt İndirme Testi
  // =========================================================================
  describe("5. Kurtarma Kodları Yenileme Testi (Plan §Faz 11)", () => {
    it("tıklamadan önce açık felaket uyarısı verir, 10 yeni kodu gösterir ve .txt indirme sunar", async () => {
      const generatedCodes = [
        "11112222",
        "33334444",
        "55556666",
        "77778888",
        "99990000",
        "aaaa1111",
        "bbbb2222",
        "cccc3333",
        "dddd4444",
        "eeee5555",
      ];

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          data: { recoveryCodes: generatedCodes },
        }),
      } as Response);

      const downloadSpy = vi
        .spyOn(recoveryFileLib, "downloadRecoveryFile")
        .mockImplementation(() => {});

      render(<RecoveryCodesManager username="efe" />);

      // Yenile butonuna tıkla
      fireEvent.click(screen.getByTestId("regenerate-codes-button"));

      // Açık felaket uyarısını kontrol et (Kural 4)
      const warningEl = screen.getByTestId("regenerate-warning");
      expect(warningEl).toBeInTheDocument();
      expect(warningEl).toHaveTextContent(
        "Yeni kurtarma kodları ürettiğinizde, mevcut tüm kurtarma kodlarınız ANINDA geçersiz olacaktır.",
      );

      // Onayla
      fireEvent.click(screen.getByTestId("confirm-regenerate-button"));

      // 10 kodun tam ekran görünümde render edilmesini bekle
      await waitFor(() => {
        expect(screen.getByTestId("regenerated-codes-view")).toBeInTheDocument();
      });

      const grid = screen.getByTestId("recovery-codes-grid");
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveTextContent("11112222");
      expect(grid).toHaveTextContent("eeee5555");

      // Birincil eylem: .txt İndir
      const downloadBtn = screen.getByTestId("download-codes-button");
      expect(downloadBtn).toBeInTheDocument();
      fireEvent.click(downloadBtn);

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      expect(downloadSpy.mock.calls[0][0]).toBe("efe");
      expect(downloadSpy.mock.calls[0][1]).toContain("ACTOS YENİ KURTARMA KODLARI");
      expect(downloadSpy.mock.calls[0][1]).toContain("11112222");

      // İkincil eylem: Tümünü Kopyala
      const copyBtn = screen.getByTestId("copy-codes-button");
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("1. 11112222"),
      );
    });
  });

  // =========================================================================
  // 6. Hesap Silme Onay Akışı Testi (Tehlikeli Bölge)
  // =========================================================================
  describe("6. Hesap Silme Akışı Testi (Tehlikeli Bölge)", () => {
    it("kullanıcı adı onaylanana kadar butonu kilitler ve DELETE /api/actors/me ile hesabı siler", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      render(<ProfileSettingsForm initialActor={sampleHumanActor} />);

      // Tehlikeli Bölge uyarısı
      expect(screen.getByTestId("danger-zone")).toBeInTheDocument();

      // "Hesabımı Sil" tıkla
      fireEvent.click(screen.getByTestId("delete-account-button"));

      const confirmBtn = screen.getByTestId("confirm-delete-button");
      expect(confirmBtn).toBeDisabled();

      // Yanlış kullanıcı adı girilirse buton hâlâ kilitli olmalı
      const usernameInput = screen.getByTestId("delete-username-input");
      fireEvent.change(usernameInput, { target: { value: "yanlis_kullanici" } });
      expect(confirmBtn).toBeDisabled();

      // Doğru kullanıcı adı girildiğinde buton açılmalı
      fireEvent.change(usernameInput, { target: { value: "efe" } });
      expect(confirmBtn).not.toBeDisabled();

      // Kurtarma kodunu gir
      const recoveryInput = screen.getByTestId("delete-recovery-input");
      fireEvent.change(recoveryInput, { target: { value: "rc_delete_code_1" } });

      // Silmeyi onayla
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/actors/me",
          expect.objectContaining({
            method: "DELETE",
          }),
        );
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.recoveryCode).toBe("rc_delete_code_1");

      // Başarılı silmede ana sayfaya yönlendirilir
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(useSessionStore.getState().user).toBeNull();
    });
  });

  // =========================================================================
  // 7. Profil Server Component (RSC) ve 404/410 Hata Durumları Testi
  // =========================================================================
  describe("7. Profil Server Component (RSC) ve Hata Durumları Testi", () => {
    it("404 durumunda notFound() çağırır", async () => {
      const { notFound } = await import("next/navigation");
      vi.spyOn(actosLib, "getServerClient").mockResolvedValueOnce({
        actors: {
          get: vi.fn().mockRejectedValueOnce({ status: 404, code: "NOT_FOUND" }),
          followers: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
          following: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
          posts: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
          comments: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
        },
      } as unknown as actosLib.Actos);

      await expect(
        ProfilePage({
          params: Promise.resolve({ username: "bilinmeyen" }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(notFound).toHaveBeenCalled();
    });

    it("410 durumunda Gone durum ekranını render eder", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValueOnce({
        actors: {
          get: vi.fn().mockRejectedValueOnce({ status: 410, code: "GONE" }),
          followers: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
          following: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
          posts: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
          comments: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
        },
      } as unknown as actosLib.Actos);

      const result = await ProfilePage({
        params: Promise.resolve({ username: "silinmis_kullanici" }),
        searchParams: Promise.resolve({}),
      });

      render(result);
      expect(screen.getByText("Bu hesap silinmiştir")).toBeInTheDocument();
    });

    it("profil sayfasında gönderileri başarıyla yükler ve render eder", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValueOnce({
        actors: {
          get: vi.fn().mockResolvedValueOnce(sampleProfile),
          followers: vi.fn().mockResolvedValue({ items: [sampleAgentActor], nextCursor: null }),
          following: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
          posts: vi.fn().mockResolvedValue({
            items: [
              {
                id: "c_post_1",
                contentType: "post",
                title: "İlk Postum",
                body: "Merhaba Actos!",
                bodyHtml: "<p>Merhaba Actos!</p>",
                bodyFormat: "markdown",
                author: sampleHumanActor,
                authorDeleted: false,
                deleted: false,
                score: 5,
                commentCount: 2,
                tags: ["test"],
                createdAt: "2026-09-04T12:00:00Z",
              },
            ],
            nextCursor: null,
          }),
          comments: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
        },
      } as unknown as actosLib.Actos);

      const result = await ProfilePage({
        params: Promise.resolve({ username: "efe" }),
        searchParams: Promise.resolve({ tab: "posts" }),
      });

      render(result);
      expect(screen.getByText("İlk Postum")).toBeInTheDocument();
    });

    it("backend çevrimdışıyken (ECONNREFUSED) sahte bir profil göstermez, hata durumu render eder (ROADMAP.md P0-02)", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValueOnce({
        actors: {
          get: vi.fn().mockRejectedValueOnce({
            name: "APIConnectionError",
            code: "ECONNREFUSED",
            message: "connect ECONNREFUSED 127.0.0.1:3100",
          }),
          followers: vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")),
          following: vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")),
          posts: vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")),
          comments: vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")),
        },
      } as unknown as actosLib.Actos);

      const result = await ProfilePage({
        params: Promise.resolve({ username: "dila_ai" }),
        searchParams: Promise.resolve({ tab: "posts" }),
      });

      render(result);
      // No fabricated demo profile: an error state with retry instead.
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText("Dila")).not.toBeInTheDocument();
    });

    it("backend çevrimdışıyken (ECONNREFUSED) bir 404'e dönüştürmez, hata durumu render eder (ROADMAP.md P0-02)", async () => {
      const { notFound } = await import("next/navigation");
      vi.spyOn(actosLib, "getServerClient").mockResolvedValueOnce({
        actors: {
          get: vi.fn().mockRejectedValueOnce({
            name: "APIConnectionError",
            code: "ECONNREFUSED",
            message: "connect ECONNREFUSED 127.0.0.1:3100",
          }),
          followers: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
          following: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
          posts: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
          comments: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
        },
      } as unknown as actosLib.Actos);

      const result = await ProfilePage({
        params: Promise.resolve({ username: "bilinmeyen_offline_user" }),
        searchParams: Promise.resolve({}),
      });

      render(result);
      // A connection error is not the same thing as "this user doesn't
      // exist": it must not be masked as a 404.
      expect(notFound).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
