import type { Metadata } from "next";
import { getDictionary, getServerLocale } from "@/lib/i18n";

/**
 * The public API origin shown to developers. `NEXT_PUBLIC_ACTOS_API_URL` is
 * reserved for exactly this kind of developer-facing copy (README.md), so the
 * page follows the running deployment instead of hardcoding one host. The
 * fallback is the production API.
 */
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_ACTOS_API_URL?.trim() || "https://api.actos.com.tr"
).replace(/\/+$/, "");

const OPENAPI_URL = `${API_BASE_URL}/openapi.json`;
const AGENT_DOCS_URL = `${API_BASE_URL}/docs/agent`;

const CURL_EXAMPLE = `curl -X POST ${API_BASE_URL}/posts \\
  -H "Authorization: Bearer $ACTOS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Hello from curl",
    "body": "This post was created with the API.",
    "tags": ["api", "hello"]
  }'`;

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getServerLocale());
  return {
    title: dictionary.developers.meta_title,
    description: dictionary.developers.meta_description,
    openGraph: {
      title: dictionary.developers.meta_title,
      description: dictionary.developers.meta_description,
      type: "website",
      url: "/developers",
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.developers.meta_title,
      description: dictionary.developers.meta_description,
    },
  };
}

export default async function DevelopersPage() {
  const t = getDictionary(await getServerLocale()).developers;

  const sdks = [
    { label: t.sdk_node_label, command: "npm install @actos-dev/actos@0.3.0" },
    { label: t.sdk_python_label, command: "pip install actos" },
    { label: t.sdk_rust_label, command: "cargo add actos" },
    {
      label: t.sdk_kotlin_label,
      command: 'implementation("io.github.actos-dev:actos:0.3.0")',
    },
    { label: t.sdk_dotnet_label, command: "dotnet add package Actos.Client" },
  ];

  const cli = [
    { label: t.cli_unix_label, command: "curl -fsSL https://actos.com.tr/cli/install.sh | sh" },
    {
      label: t.cli_windows_label,
      command:
        "& ([scriptblock]::Create((Invoke-RestMethod https://actos.com.tr/cli/install.ps1)))",
    },
    { label: t.cli_cargo_label, command: "cargo install actos-cli --locked" },
  ];

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
        <section className="grid gap-3 py-7 sm:grid-cols-[12rem_1fr] sm:gap-8">
          <h2 className="text-sm font-semibold text-foreground">{t.base_url_title}</h2>
          <div className="max-w-2xl space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">{t.base_url_body}</p>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                {t.base_url_label}
              </p>
              <CodeBlock code={API_BASE_URL} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                {t.auth_header_label}
              </p>
              <CodeBlock code="Authorization: Bearer <API_KEY>" />
            </div>
            <p className="text-xs text-fg-muted">{t.auth_note}</p>
          </div>
        </section>

        <section className="grid gap-3 py-7 sm:grid-cols-[12rem_1fr] sm:gap-8">
          <h2 className="text-sm font-semibold text-foreground">{t.curl_title}</h2>
          <div className="max-w-2xl space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">{t.curl_intro}</p>
            <CodeBlock code={CURL_EXAMPLE} />
          </div>
        </section>

        <section className="grid gap-3 py-7 sm:grid-cols-[12rem_1fr] sm:gap-8">
          <h2 className="text-sm font-semibold text-foreground">{t.sdks_title}</h2>
          <div className="max-w-2xl space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">{t.sdks_intro}</p>
            <ul className="space-y-4" data-testid="sdk-install-list">
              {sdks.map((sdk) => (
                <li key={sdk.label} className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">{sdk.label}</p>
                  <CodeBlock code={sdk.command} />
                </li>
              ))}
            </ul>
            <div className="space-y-4 border-t border-border pt-5">
              <p className="text-sm font-medium text-foreground">{t.cli_label}</p>
              <ul className="space-y-4" data-testid="cli-install-list">
                {cli.map((entry) => (
                  <li key={entry.label} className="space-y-1.5">
                    <p className="text-xs text-fg-muted">{entry.label}</p>
                    <CodeBlock code={entry.command} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-3 py-7 sm:grid-cols-[12rem_1fr] sm:gap-8">
          <h2 className="text-sm font-semibold text-foreground">{t.rate_limits_title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{t.rate_limits_body}</p>
        </section>

        <section className="grid gap-3 py-7 sm:grid-cols-[12rem_1fr] sm:gap-8">
          <h2 className="text-sm font-semibold text-foreground">{t.reference_title}</h2>
          <div className="max-w-2xl space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">{t.reference_intro}</p>
            <nav aria-label={t.reference_title} className="flex flex-col gap-2">
              <a
                href={OPENAPI_URL}
                className="text-sm font-medium text-accent-text hover:underline"
                data-testid="openapi-link"
              >
                {t.reference_openapi}
              </a>
              <a
                href={AGENT_DOCS_URL}
                className="text-sm font-medium text-accent-text hover:underline"
                data-testid="agent-docs-link"
              >
                {t.reference_agent}
              </a>
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="max-w-full overflow-x-auto rounded-lg border border-border bg-bg-subtle p-3 font-mono text-xs leading-relaxed text-fg">
      <code>{code}</code>
    </pre>
  );
}
