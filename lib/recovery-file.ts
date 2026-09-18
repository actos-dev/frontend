import { type Locale, t } from "@/lib/i18n";

function recoveryText(
  key: string,
  params?: Record<string, string | number>,
  locale: Locale = "tr",
) {
  return t(`recoveryFile.${key}`, params, locale);
}

function formatCodes(codes: string[]): string {
  return codes.map((code, idx) => `${idx + 1}. ${code}`).join("\n");
}

/** Generates standardized recovery credentials in the selected language. */
export function generateRecoveryFileContent(options: {
  username: string;
  apiKey: string;
  recoveryCodes: string[];
  createdAt?: string;
  locale?: Locale;
}): string {
  const locale = options.locale ?? "tr";
  const dateStr = options.createdAt || new Date().toISOString();

  return `================================================================================
${recoveryText("account_title", undefined, locale)}
================================================================================
${recoveryText("username", { username: options.username }, locale)}
${recoveryText("date", { date: dateStr }, locale)}

${recoveryText("api_key_label", undefined, locale)}
${options.apiKey}

${recoveryText("codes_title", undefined, locale)}
${formatCodes(options.recoveryCodes)}

--------------------------------------------------------------------------------
${recoveryText("attention", undefined, locale)}
${recoveryText("loss_warning", undefined, locale)}
${recoveryText("no_email_recovery", undefined, locale)}
${recoveryText("keep_private", undefined, locale)}
================================================================================`;
}

/**
 * Generates plaintext file contents for newly regenerated recovery codes (Plan §Faz 11).
 */
export function generateRegeneratedCodesFileContent(options: {
  username: string;
  recoveryCodes: string[];
  createdAt?: string;
  locale?: Locale;
}): string {
  const locale = options.locale ?? "tr";
  const dateStr = options.createdAt || new Date().toISOString();

  return `================================================================================
${recoveryText("new_codes_title", undefined, locale)}
================================================================================
${recoveryText("username", { username: options.username }, locale)}
${recoveryText("date", { date: dateStr }, locale)}

${recoveryText("new_codes_label", undefined, locale)}
${formatCodes(options.recoveryCodes)}

--------------------------------------------------------------------------------
${recoveryText("attention", undefined, locale)}
${recoveryText("old_codes_invalid", undefined, locale)}
${recoveryText("loss_warning", undefined, locale)}
${recoveryText("no_email_recovery", undefined, locale)}
${recoveryText("keep_private", undefined, locale)}
================================================================================`;
}

/** Generates a language-aware plaintext file for a newly recovered API key. */
export function generateNewApiKeyFileContent(options: {
  username: string;
  apiKey: string;
  remainingRecoveryCodes: number | null;
  createdAt?: string;
  locale?: Locale;
}): string {
  const locale = options.locale ?? "tr";
  const remaining =
    options.remainingRecoveryCodes === null
      ? locale === "tr"
        ? "Bilinmiyor"
        : "Unknown"
      : String(options.remainingRecoveryCodes);
  return [
    recoveryText("new_key_title", undefined, locale),
    recoveryText("username", { username: options.username }, locale),
    recoveryText("date", { date: options.createdAt || new Date().toISOString() }, locale),
    recoveryText("new_key_label", { apiKey: options.apiKey }, locale),
    recoveryText("remaining_codes", { remaining }, locale),
    "",
  ].join("\n");
}

/**
 * Triggers a browser file download of the credentials text file.
 */
export function downloadRecoveryFile(username: string, content: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `actos-recovery-${username}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
