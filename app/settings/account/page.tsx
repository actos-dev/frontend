import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { RecoveryCodesManager } from "@/components/settings/recovery-codes-manager";
import { getServerClient } from "@/lib/actos";
import { getServerLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function SettingsAccountPage() {
  const client = await getServerClient();
  const [whoami, keys, locale] = await Promise.all([
    client.auth.whoami(),
    client.auth.listKeys(),
    getServerLocale(),
  ]);
  const t = getDictionary(locale).settings;

  return (
    <div className="space-y-10" data-testid="settings-account">
      <section aria-labelledby="account-keys-heading" id="api-keys">
        <div className="mb-4 border-b border-border/60 pb-3">
          <h2 id="account-keys-heading" className="text-lg font-semibold text-foreground">
            {t.keys.title}
          </h2>
        </div>
        <ApiKeysManager initialKeys={keys} />
      </section>

      <section aria-labelledby="account-recovery-heading" id="recovery-codes">
        <div className="mb-4 border-b border-border/60 pb-3">
          <h2 id="account-recovery-heading" className="text-lg font-semibold text-foreground">
            {t.recovery.title}
          </h2>
        </div>
        <RecoveryCodesManager username={whoami.actor.username} />
      </section>

      <section aria-labelledby="account-danger-heading" id="danger-zone">
        <h2 id="account-danger-heading" className="sr-only">
          {t.danger_zone.title}
        </h2>
        <ProfileSettingsForm initialActor={whoami.actor} section="account" />
      </section>
    </div>
  );
}
