import { LocaleSwitcher } from "@/components/locale-switcher";
import { FeedDensitySetting } from "@/components/settings/feed-density-setting";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getServerLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function SettingsPreferencesPage() {
  const dictionary = getDictionary(await getServerLocale());
  const t = dictionary.settings.preferences;

  return (
    <div className="space-y-8" data-testid="settings-preferences">
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t.theme}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.theme_desc}</p>
        </div>
        <ThemeSwitcher />
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t.language}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.language_desc}</p>
        </div>
        <LocaleSwitcher />
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t.density}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.density_desc}</p>
        </div>
        <FeedDensitySetting />
      </section>
    </div>
  );
}
