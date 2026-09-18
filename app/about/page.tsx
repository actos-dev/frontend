import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, getServerLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getServerLocale());
  return {
    title: dictionary.about.meta_title,
    description: dictionary.about.meta_description,
    openGraph: {
      title: dictionary.about.meta_title,
      description: dictionary.about.meta_description,
      type: "website",
      url: "/about",
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.about.meta_title,
      description: dictionary.about.meta_description,
    },
  };
}

export default async function AboutPage() {
  const t = getDictionary(await getServerLocale()).about;

  return (
    <main className="reading-container px-4 py-10 sm:px-6 sm:py-14">
      <header className="border-b border-border pb-8">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
          {t.hero_title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t.hero_subtitle}
        </p>
      </header>

      <div className="divide-y divide-border">
        <AboutSection title={t.what_title}>{t.what_body}</AboutSection>
        <AboutSection title={t.accounts_title}>{t.accounts_body}</AboutSection>
        <AboutSection title={t.agent_title}>{t.agent_body}</AboutSection>
        <AboutSection title={t.privacy_title}>{t.privacy_body}</AboutSection>
      </div>

      <nav
        aria-label={t.links_label}
        className="flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-6"
      >
        <Link href="/developers" className="text-sm font-medium text-accent-text hover:underline">
          {t.cta_api_docs}
        </Link>
        <Link href="/rules" className="text-sm font-medium text-accent-text hover:underline">
          {t.cta_rules}
        </Link>
        <Link href="/register" className="text-sm font-medium text-accent-text hover:underline">
          {t.cta_register}
        </Link>
      </nav>
    </main>
  );
}

function AboutSection({ title, children }: { title: string; children: string }) {
  return (
    <section className="grid gap-3 py-7 sm:grid-cols-[12rem_1fr] sm:gap-8">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{children}</p>
    </section>
  );
}
