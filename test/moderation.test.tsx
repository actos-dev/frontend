// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getActionsRoute } from "@/app/api/mod/actions/route";
import { DELETE as deleteBanRoute } from "@/app/api/mod/bans/[username]/route";
import { POST as postBanRoute } from "@/app/api/mod/bans/route";
import { DELETE as deleteContentRoute } from "@/app/api/mod/contents/[id]/route";
import { PATCH as patchReportRoute } from "@/app/api/mod/reports/[id]/route";
import { GET as getReportsRoute } from "@/app/api/mod/reports/route";
import { POST as postRolesRoute } from "@/app/api/mod/roles/route";
import ActionsPage from "@/app/mod/actions/page";
import BansPage from "@/app/mod/bans/page";
import ModLayout from "@/app/mod/layout";
import ModSummaryPage from "@/app/mod/page";
import ReportsPage from "@/app/mod/reports/page";
import RolesPage from "@/app/mod/roles/page";
import { ActionsList } from "@/components/mod/actions-list";
import { BanDialog } from "@/components/mod/ban-dialog";
import { BansManager } from "@/components/mod/bans-manager";
import { DeleteContentDialog } from "@/components/mod/delete-content-dialog";
import { ModNav } from "@/components/mod/mod-nav";
import { ReportsQueue } from "@/components/mod/reports-queue";
import { ResolveReportDialog } from "@/components/mod/resolve-report-dialog";
import { RolesManager } from "@/components/mod/roles-manager";
import { toast } from "@/components/ui/toast";
import * as actosLib from "@/lib/actos";
import {
  capabilitiesFromPermissions,
  GLOBAL_ADMIN_PERMISSIONS,
  GLOBAL_MODERATOR_PERMISSIONS,
} from "@/lib/mod/capabilities";
import { useSessionStore } from "@/lib/stores/session-store";
import { MOCK_USERS } from "@/test/fixtures/users";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/mod"),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// Mock Sonner toast
vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Faz 14 — Moderasyon Paneli ve Anti-Leak Güvenlik Test Paketi", () => {
  const originalFetch = global.fetch;

  const globalGrants = (permissions: readonly string[]) =>
    permissions.map((permission) => ({ permission, scope: "global" as const, community: null }));

  const mockAdminWhoami = {
    actor: {
      id: "usr_admin_1",
      username: "dila_ai",
      displayName: "Dila Admin",
      actorType: "ai_agent",
    },
    permissions: globalGrants(GLOBAL_ADMIN_PERMISSIONS),
    key: { id: "k_1", createdAt: new Date().toISOString() },
  };

  const mockModeratorWhoami = {
    actor: {
      id: "usr_mod_1",
      username: "taylan_mod",
      displayName: "Taylan Mod",
      actorType: "human",
    },
    permissions: globalGrants(GLOBAL_MODERATOR_PERMISSIONS),
    key: { id: "k_2", createdAt: new Date().toISOString() },
  };

  const mockUserWhoami = {
    actor: {
      id: "usr_user_1",
      username: "efe_normal",
      displayName: "Efe",
      actorType: "human",
    },
    permissions: [],
    key: { id: "k_3", createdAt: new Date().toISOString() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /* ==========================================================================
     1. Anti-Leak Güvenlik ve 404 Sözleşmesi Testi (Plan §Faz 14)
     ========================================================================== */
  describe("1. Anti-Leak Güvenlik ve 404 Sözleşmesi", () => {
    it("anonim / oturumsuz kullanıcı /mod layout'una eriştiğinde notFound() (404) fırlatır", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("MISSING_CREDENTIALS")),
        },
      } as unknown as actosLib.Actos);

      await expect(ModLayout({ children: <div>Mod İçerik</div> })).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
    });

    it("rolsüz normal kullanıcı /mod layout'una eriştiğinde 403 değil doğrudan notFound() fırlatır", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue(mockUserWhoami),
        },
      } as unknown as actosLib.Actos);

      await expect(ModLayout({ children: <div>Mod İçerik</div> })).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
    });

    it("rolsüz kullanıcı /api/mod/reports endpointine eriştiğinde 404 döner (varlığını sızdırmaz)", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue(mockUserWhoami),
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/reports");
      const res = await getReportsRoute(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.code).toBe("NOT_FOUND");
    });

    it("rolsüz kullanıcı /api/mod/bans endpointine POST yaptığında 404 döner", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("Unauthorized")),
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/bans", {
        method: "POST",
        body: JSON.stringify({ username: "spammer", reason: "spam" }),
      });
      const res = await postBanRoute(req);
      expect(res.status).toBe(404);
    });

    it("normal moderatör /mod/roles admin sayfasına erişmeye çalıştığında 404 (notFound) alır", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue(mockModeratorWhoami),
        },
      } as unknown as actosLib.Actos);

      await expect(RolesPage()).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("normal moderatör /api/mod/roles API ucuna istek attığında 404 döner", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue(mockModeratorWhoami),
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/roles", {
        method: "POST",
        body: JSON.stringify({ username: "efe", role: "moderator" }),
      });
      const res = await postRolesRoute(req);
      expect(res.status).toBe(404);
    });
  });

  /* ==========================================================================
     2. Moderasyon Özeti ve İstatistikleri Testi
     ========================================================================== */
  describe("2. Moderasyon Özeti ve İstatistikleri", () => {
    it("özet sayfası sayaçları, son denetim eylemlerini ve hızlı kısayolları render eder", async () => {
      const mockReports = [
        { id: "r1", status: "pending", createdAt: new Date().toISOString() },
        { id: "r2", status: "pending", createdAt: new Date().toISOString() },
      ];
      const mockActions = [
        {
          id: "a1",
          actionType: "content_delete",
          adminUsername: "taylan_mod",
          targetType: "content",
          targetId: 101,
          reason: "Kural ihlali",
          createdAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockAdminWhoami) },
        admin: {
          reports: { list: vi.fn().mockResolvedValue({ items: mockReports, nextCursor: null }) },
          actions: { list: vi.fn().mockResolvedValue({ items: mockActions, nextCursor: null }) },
        },
      } as unknown as actosLib.Actos);

      const pageResult = await ModSummaryPage();
      render(pageResult);

      expect(screen.getByTestId("pending-reports-count")).toHaveTextContent("2");
      expect(screen.getByTestId("stat-ban-management")).toHaveTextContent(
        "The API cannot list bans",
      );
      expect(screen.getByTestId("recent-actions-count")).toHaveTextContent("1");
      expect(screen.getByTestId("quick-action-reports")).toBeInTheDocument();
      expect(screen.getByTestId("quick-action-bans")).toBeInTheDocument();
      expect(screen.getByTestId("quick-action-actions")).toBeInTheDocument();
      expect(screen.getByTestId("quick-action-roles")).toBeInTheDocument();
    });

    it("ModNav sekmeleri ve moderatör rozetini doğru render eder", () => {
      useSessionStore.setState({ user: MOCK_USERS.adminAgent });

      render(<ModNav initialUser={mockAdminWhoami.actor} />);

      expect(screen.getByText("Moderation Panel")).toBeInTheDocument();
      expect(screen.getByTestId("mod-status-badge")).toBeInTheDocument();
      expect(screen.getByTestId("mod-nav-summary")).toBeInTheDocument();
      expect(screen.getByTestId("mod-nav-reports")).toBeInTheDocument();
      expect(screen.getByTestId("mod-nav-bans")).toBeInTheDocument();
      expect(screen.getByTestId("mod-nav-actions")).toBeInTheDocument();
      expect(screen.getByTestId("mod-nav-roles")).toBeInTheDocument();
    });

    it("moderatör kabiliyetleri rol yönetimini dışarıda bırakır", () => {
      useSessionStore.setState({ user: null });
      render(
        <ModNav
          initialUser={{
            ...mockModeratorWhoami.actor,
            permissions: mockModeratorWhoami.permissions,
          }}
          capabilities={capabilitiesFromPermissions(mockModeratorWhoami.permissions)}
        />,
      );

      expect(screen.getByTestId("mod-nav-reports")).toBeInTheDocument();
      expect(screen.getByTestId("mod-nav-bans")).toBeInTheDocument();
      expect(screen.queryByTestId("mod-nav-roles")).not.toBeInTheDocument();
    });
  });

  /* ==========================================================================
     3. Rapor Kuyruğu ve Çözme/Reddetme Testi (Zorunlu Not)
     ========================================================================== */
  describe("3. Rapor Kuyruğu ve Çözme/Reddetme (Zorunlu Not)", () => {
    const sampleReport = {
      id: "rep_99",
      targetType: "post",
      targetId: "c_spam_99",
      reason: "Zararlı bağlantı",
      status: "pending",
      notes: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    it("rapor kuyruğu filtre sekmelerini ve rapor detayını render eder", () => {
      render(<ReportsQueue initialReports={[sampleReport]} initialStatus="pending" />);

      expect(screen.getByTestId("tab-pending-reports")).toBeInTheDocument();
      expect(screen.getByTestId("tab-resolved-reports")).toBeInTheDocument();
      expect(screen.getByTestId("tab-dismissed-reports")).toBeInTheDocument();
      expect(screen.getByTestId("report-card-rep_99")).toBeInTheDocument();
      expect(screen.getByText("Zararlı bağlantı")).toBeInTheDocument();
      expect(screen.getByTestId("resolve-report-btn-rep_99")).toBeInTheDocument();
      expect(screen.getByTestId("dismiss-report-btn-rep_99")).toBeInTheDocument();
    });

    it("zenginleştirilmiş hedefi satır içinde gösterir ve b kısayoluyla yazarı ban formuna taşır", () => {
      const enrichedReport = {
        ...sampleReport,
        targetReportCount: 2,
        targetPreview: {
          kind: "post" as const,
          title: "Raporlanan gönderi",
          excerpt: "İncelenecek gönderinin gerçek içerik özeti.",
          href: "/posts/c_spam_99",
          author: {
            id: "a_spammer",
            username: "spam_agent",
            displayName: "Spam Agent",
            actorType: "ai_agent",
            createdAt: new Date().toISOString(),
          },
        },
      };

      render(<ReportsQueue initialReports={[enrichedReport]} initialStatus="pending" />);

      expect(screen.getByTestId("report-preview-rep_99")).toHaveTextContent("Raporlanan gönderi");
      expect(screen.getByTestId("report-preview-rep_99")).toHaveTextContent(
        "İncelenecek gönderinin gerçek içerik özeti.",
      );
      expect(screen.getByText("2 reports")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByTestId("report-card-rep_99"), { key: "b" });
      expect(screen.getByTestId("ban-username-input")).toHaveValue("spam_agent");
    });

    it("ResolveReportDialog moderatör notu girilmeden gönderildiğinde hata verir ve engeller", async () => {
      render(
        <ResolveReportDialog
          report={sampleReport}
          mode="resolve"
          open={true}
          onOpenChange={vi.fn()}
        />,
      );

      const submitBtn = screen.getByTestId("resolve-report-submit-button");
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/A moderator note is required/i)).toBeInTheDocument();
    });

    it("not girildiğinde /api/mod/reports/[id] PATCH isteği yapar ve başarılı toast gösterir", async () => {
      const onSuccessMock = vi.fn();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          report: { ...sampleReport, status: "resolved", notes: "Kural ihlali doğrulandı." },
        }),
      } as Response);

      render(
        <ResolveReportDialog
          report={sampleReport}
          mode="resolve"
          open={true}
          onOpenChange={vi.fn()}
          onSuccess={onSuccessMock}
        />,
      );

      const noteInput = screen.getByTestId("resolve-report-note-input");
      fireEvent.change(noteInput, { target: { value: "Kural ihlali doğrulandı." } });

      const submitBtn = screen.getByTestId("resolve-report-submit-button");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/mod/reports/rep_99",
          expect.objectContaining({
            method: "PATCH",
            body: expect.stringContaining("Kural ihlali doğrulandı."),
          }),
        );
        expect(toast.success).toHaveBeenCalled();
        expect(onSuccessMock).toHaveBeenCalled();
      });
    });

    it("PATCH /api/mod/reports/[id] endpoint'i not verilmediğinde 400 döner", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/reports/rep_99", {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved", notes: "" }),
      });

      const res = await patchReportRoute(req, { params: Promise.resolve({ id: "rep_99" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/notu zorunludur/i);
    });
  });

  /* ==========================================================================
     4. İçerik Silme (Zorunlu Gerekçe Kontrolü) Testi
     ========================================================================== */
  describe("4. İçerik Silme ve Zorunlu Gerekçe Kontrolü", () => {
    it("DELETE /api/mod/contents/[id] gerekçe olmadan çağrıldığında 400 döner", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/contents/c_bad_post", {
        method: "DELETE",
        body: JSON.stringify({ reason: "   " }),
      });

      const res = await deleteContentRoute(req, { params: Promise.resolve({ id: "c_bad_post" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/gerekçesi zorunludur/i);
    });

    it("DELETE /api/mod/contents/[id] geçerli gerekçeyle çağrıldığında client.admin.contents.delete çağırır", async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
        admin: {
          contents: {
            delete: mockDelete,
          },
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/contents/c_bad_post", {
        method: "DELETE",
        body: JSON.stringify({ reason: "Telif hakkı ihlali gerekçesiyle kaldırıldı." }),
      });

      const res = await deleteContentRoute(req, { params: Promise.resolve({ id: "c_bad_post" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith("c_bad_post", {
        reason: "Telif hakkı ihlali gerekçesiyle kaldırıldı.",
      });
    });

    it("DeleteContentDialog gerekçe boş bırakıldığında uyarı gösterir", async () => {
      render(<DeleteContentDialog contentId="c_bad_post" open={true} onOpenChange={vi.fn()} />);

      const submitBtn = screen.getByTestId("confirm-moderate-delete-button");
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/A removal reason is required/i)).toBeInTheDocument();
    });
  });

  /* ==========================================================================
     5. Ban Yönetimi (Süreli / Kalıcı Ban Ekleme ve Ban Kaldırma)
     ========================================================================== */
  describe("5. Ban Yönetimi (Süreli / Kalıcı ve Unban)", () => {
    it("POST /api/mod/bans eksik kullanıcı adı veya gerekçede 400 döner", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
      } as unknown as actosLib.Actos);

      const reqNoUsername = new NextRequest("http://localhost:3000/api/mod/bans", {
        method: "POST",
        body: JSON.stringify({ username: "", reason: "spam" }),
      });
      const res1 = await postBanRoute(reqNoUsername);
      expect(res1.status).toBe(400);

      const reqNoReason = new NextRequest("http://localhost:3000/api/mod/bans", {
        method: "POST",
        body: JSON.stringify({ username: "spammer", reason: "" }),
      });
      const res2 = await postBanRoute(reqNoReason);
      expect(res2.status).toBe(400);
    });

    it("POST /api/mod/bans kalıcı ve süreli banı doğru parametrelerle oluşturur", async () => {
      const mockCreate = vi.fn().mockImplementation(async (inp) => ({
        username: inp.username,
        reason: inp.reason,
        bannedAt: new Date().toISOString(),
        expiresAt: inp.expiresAt,
      }));

      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
        admin: {
          bans: {
            create: mockCreate,
          },
        },
      } as unknown as actosLib.Actos);

      // Kalıcı ban
      const reqPermanent = new NextRequest("http://localhost:3000/api/mod/bans", {
        method: "POST",
        body: JSON.stringify({ username: "spammer", reason: "Bot faaliyeti", expiresAt: null }),
      });
      const res1 = await postBanRoute(reqPermanent);
      expect(res1.status).toBe(200);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ username: "spammer", reason: "Bot faaliyeti", expiresAt: null }),
      );

      // Süreli ban
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const reqTemp = new NextRequest("http://localhost:3000/api/mod/bans", {
        method: "POST",
        body: JSON.stringify({ username: "temp_troll", reason: "Hakaret", expiresAt: futureDate }),
      });
      const res2 = await postBanRoute(reqTemp);
      expect(res2.status).toBe(200);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ username: "temp_troll", expiresAt: futureDate }),
      );
    });

    it("DELETE /api/mod/bans/[username] banı kaldırır", async () => {
      const mockRemove = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
        admin: {
          bans: {
            remove: mockRemove,
          },
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/bans/spammer");
      const res = await deleteBanRoute(req, { params: Promise.resolve({ username: "spammer" }) });
      expect(res.status).toBe(200);
      expect(mockRemove).toHaveBeenCalledWith("spammer");
    });

    it("BansManager API'nin listeleme desteği olmadığını ve kullanıcı adıyla kaldırmayı açıklar", () => {
      render(<BansManager />);

      expect(screen.getByTestId("ban-list-unsupported")).toHaveTextContent(
        "The Actos API does not provide an endpoint to list active bans",
      );
      expect(screen.getByTestId("ban-remove-username-input")).toBeInTheDocument();
      expect(screen.getByTestId("open-add-ban-dialog-button")).toBeInTheDocument();
    });

    it("BansManager girilen kullanıcı adına göre ban kaldırma isteği gönderir", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);
      render(<BansManager />);

      fireEvent.change(screen.getByTestId("ban-remove-username-input"), {
        target: { value: "@troll_1" },
      });
      fireEvent.click(screen.getByRole("button", { name: /remove ban/i }));
      fireEvent.click(await screen.findByTestId("confirm-unban-button"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/mod/bans/troll_1", {
          method: "DELETE",
        });
      });
    });

    it("BanDialog modalını render eder", () => {
      render(<BanDialog open={true} onOpenChange={vi.fn()} />);
      expect(screen.getByTestId("confirm-ban-submit-button")).toBeInTheDocument();
      expect(screen.getByTestId("ban-username-input")).toBeInTheDocument();
      expect(screen.getByTestId("ban-reason-input")).toBeInTheDocument();
    });
  });

  /* ==========================================================================
     6. Denetim Kaydı (Audit Log) Salt Okunur Listeleme Testi
     ========================================================================== */
  describe("6. Denetim Kaydı (Audit Log) Salt Okunur Listeleme", () => {
    const mockActions = [
      {
        id: "act_1",
        actionType: "actor_ban",
        adminUsername: "dila_ai",
        targetType: "actor",
        targetId: 99,
        reason: "Zararlı bot",
        createdAt: new Date().toISOString(),
      },
      {
        id: "act_2",
        actionType: "content_delete",
        adminUsername: "taylan_mod",
        targetType: "content",
        targetId: 88,
        reason: "Spam içerik",
        createdAt: new Date().toISOString(),
      },
    ];

    it("ActionsList tüm denetim eylemlerini kolonlarıyla render eder", () => {
      render(<ActionsList initialActions={mockActions} />);

      expect(screen.getByTestId("audit-log-table")).toBeInTheDocument();
      expect(screen.getByTestId("audit-log-row-act_1")).toBeInTheDocument();
      expect(screen.getByTestId("audit-log-row-act_2")).toBeInTheDocument();
      expect(screen.getByText("User Banned")).toBeInTheDocument();
      expect(screen.getByText("Content Removed")).toBeInTheDocument();
      expect(screen.getByText("@dila_ai")).toBeInTheDocument();
      expect(screen.getByText("@taylan_mod")).toBeInTheDocument();
    });

    it("kütük listesinde arama filtresi çalışır", () => {
      render(<ActionsList initialActions={mockActions} />);

      const searchInput = screen.getByTestId("audit-log-search-input");
      fireEvent.change(searchInput, { target: { value: "taylan" } });

      expect(screen.queryByTestId("audit-log-row-act_1")).not.toBeInTheDocument();
      expect(screen.getByTestId("audit-log-row-act_2")).toBeInTheDocument();
    });

    it("GET /api/mod/actions denetim kütüğünü listeler", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
        admin: {
          actions: { list: vi.fn().mockResolvedValue({ items: mockActions, nextCursor: null }) },
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/actions");
      const res = await getActionsRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.actions).toHaveLength(2);
    });
  });

  /* ==========================================================================
     7. Rol Atama (Yalnızca Admin) Testi
     ========================================================================== */
  describe("7. Rol Atama (Yalnızca Admin)", () => {
    it("Admin kullanıcısı /api/mod/roles ile moderatör atayabilir", async () => {
      const mockGrant = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockAdminWhoami) },
        admin: {
          permissions: {
            grant: mockGrant,
            revoke: vi.fn(),
          },
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/roles", {
        method: "POST",
        body: JSON.stringify({ username: "yeni_mod", role: "moderator" }),
      });

      const res = await postRolesRoute(req);
      expect(res.status).toBe(200);
      expect(mockGrant).toHaveBeenCalledTimes(GLOBAL_MODERATOR_PERMISSIONS.length);
      expect(mockGrant).toHaveBeenCalledWith({
        username: "yeni_mod",
        permission: "report.view",
      });
    });

    it("Admin kullanıcısı rolü geri alabilir (role: null)", async () => {
      const mockRevoke = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockAdminWhoami) },
        admin: {
          permissions: {
            grant: vi.fn(),
            revoke: mockRevoke,
          },
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/mod/roles", {
        method: "POST",
        body: JSON.stringify({ username: "eski_mod", role: null }),
      });

      const res = await postRolesRoute(req);
      expect(res.status).toBe(200);
      expect(mockRevoke).toHaveBeenCalledTimes(GLOBAL_ADMIN_PERMISSIONS.length);
      expect(mockRevoke).toHaveBeenCalledWith({
        username: "eski_mod",
        permission: "role.grant",
      });
    });

    it("RolesManager formu kullanıcı adı ve rol seçimini yönetir", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, message: "Rol atandı." }),
      } as Response);

      render(<RolesManager />);

      const usernameInput = screen.getByTestId("role-target-username-input");
      fireEvent.change(usernameInput, { target: { value: "test_kullanici" } });

      const submitBtn = screen.getByTestId("submit-role-assignment-button");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/mod/roles",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ username: "test_kullanici", role: "moderator" }),
          }),
        );
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });

  /* ==========================================================================
     8. Server Component Sayfaları Render Testi (Yetkili Durumlar)
     ========================================================================== */
  describe("8. Server Component Sayfaları Render Testi", () => {
    it("ReportsPage yetkili moderatörle başarıyla render olur", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
        admin: {
          reports: { list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) },
        },
      } as unknown as actosLib.Actos);

      const page = await ReportsPage({});
      render(page);
      expect(screen.getByTestId("reports-queue-page")).toBeInTheDocument();
    });

    it("BansPage yetkili moderatörle başarıyla render olur", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
      } as unknown as actosLib.Actos);

      const page = await BansPage();
      render(page);
      expect(screen.getByTestId("bans-manager-page")).toBeInTheDocument();
    });

    it("ActionsPage yetkili moderatörle başarıyla render olur", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockModeratorWhoami) },
        admin: {
          actions: { list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) },
        },
      } as unknown as actosLib.Actos);

      const page = await ActionsPage();
      render(page);
      expect(screen.getByTestId("actions-audit-page")).toBeInTheDocument();
    });

    it("RolesPage yetkili admin ile başarıyla render olur", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: { whoami: vi.fn().mockResolvedValue(mockAdminWhoami) },
      } as unknown as actosLib.Actos);

      const page = await RolesPage();
      render(page);
      expect(screen.getByTestId("roles-manager-page")).toBeInTheDocument();
    });
  });
});
