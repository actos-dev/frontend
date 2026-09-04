import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { getServerClient } from "@/lib/actos";

export const dynamic = "force-dynamic";

export default async function SettingsKeysPage() {
  const client = await getServerClient();
  const keys = await client.auth.listKeys();

  return <ApiKeysManager initialKeys={keys} />;
}
