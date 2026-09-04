import { RecoveryCodesManager } from "@/components/settings/recovery-codes-manager";
import { getServerClient } from "@/lib/actos";

export const dynamic = "force-dynamic";

export default async function SettingsRecoveryPage() {
  const client = await getServerClient();
  const whoami = await client.auth.whoami();

  return <RecoveryCodesManager username={whoami.actor.username} />;
}
