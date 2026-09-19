import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { getDictionary, getServerLocale } from "@/lib/i18n";
import { getLegalDocument } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const { legal } = getDictionary(await getServerLocale());
  const document = legal.privacy;
  return {
    title: document.meta_title,
    description: document.meta_description,
    openGraph: {
      title: document.meta_title,
      description: document.meta_description,
      type: "website",
      url: "/privacy",
    },
    twitter: {
      card: "summary_large_image",
      title: document.meta_title,
      description: document.meta_description,
    },
  };
}

/** ROADMAP.md D-07: the privacy policy and KVKK notice, rendered from `content/legal/privacy.<locale>.txt`. */
export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const { legal } = getDictionary(locale);

  return (
    <LegalDocumentPage
      title={legal.privacy.title}
      lastUpdatedLabel={legal.last_updated}
      lastUpdated={legal.updated}
      note={legal.source_note}
      text={getLegalDocument("privacy", locale)}
    />
  );
}
