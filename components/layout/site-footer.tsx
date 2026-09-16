import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SiteFooterProps {
  /** Bound translate function — works with both the client `useTranslation()`
   * hook and the server `getTranslations(locale).t` helper, so this same
   * component renders correctly from a Server Component (the `@rightrail`
   * slot pages) or a Client Component (AppShell's mobile/tablet fallback). */
  t: (key: string) => string;
  className?: string;
}

/**
 * The footer on every page (ROADMAP.md S-03): About, Developers, Rules,
 * Terms, Privacy and the copyright line. No dead links (K-05) — every
 * target here resolves, the last four to real stub pages.
 */
export function SiteFooter({ t, className }: SiteFooterProps) {
  const links: Array<{ href: string; key: string }> = [
    { href: "/about", key: "footer.about" },
    { href: "/developers", key: "footer.developers" },
    { href: "/rules", key: "footer.rules" },
    { href: "/terms", key: "footer.terms" },
    { href: "/privacy", key: "footer.privacy" },
  ];

  return (
    <nav aria-label={t("footer.label")} className={cn("py-6 text-xs text-fg-subtle", className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {links.map((link, index) => (
          <span key={link.href} className="flex items-center gap-2">
            {index > 0 && (
              <span aria-hidden="true" className="text-fg-subtle">
                ·
              </span>
            )}
            <Link href={link.href} className="hover:text-fg hover:underline underline-offset-2">
              {t(link.key)}
            </Link>
          </span>
        ))}
        <span aria-hidden="true" className="text-fg-subtle">
          ·
        </span>
        <span>{t("footer.copyright")}</span>
      </div>
    </nav>
  );
}
