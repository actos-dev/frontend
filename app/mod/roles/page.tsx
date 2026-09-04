import type { Metadata } from "next";
import { RolesManager } from "@/components/mod/roles-manager";
import { requireModServer } from "@/lib/mod/auth";

export const metadata: Metadata = {
  title: "Rol Yönetimi — Moderasyon",
  description: "Yetkilendirme ve rol atama yönetimi (Yalnızca Admin).",
};

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  // STRICT ADMIN GUARD: If caller is not an admin, immediately triggers 404 (anti-leak)
  await requireModServer(true);

  return (
    <div className="space-y-6" data-testid="roles-manager-page">
      <RolesManager />
    </div>
  );
}
