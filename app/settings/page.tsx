import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { getServerClient } from "@/lib/actos";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const client = await getServerClient();
  const whoami = await client.auth.whoami();

  return <ProfileSettingsForm initialActor={whoami.actor} />;
}
