import type { Metadata } from "next";
import { BansManager } from "@/components/mod/bans-manager";
import { requireModServer } from "@/lib/mod/auth";
import { listBans } from "@/lib/mod/client-actions";

export const metadata: Metadata = {
  title: "Ban Yönetimi — Moderasyon",
  description: "Yasaklanan ve kısıtlanan aktörlerin yönetimi.",
};

export const dynamic = "force-dynamic";

export default async function BansPage() {
  const { client } = await requireModServer();

  const bans = await listBans(client).catch(() => []);

  return (
    <div className="space-y-6" data-testid="bans-manager-page">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
          Hesap Kısıtlamaları ve Ban Yönetimi
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Topluluk standartlarına uymayan aktör hesaplarının süreli veya kalıcı olarak yasaklanması.
        </p>
      </div>

      <BansManager initialBans={bans} />
    </div>
  );
}
