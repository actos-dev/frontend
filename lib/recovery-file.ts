/**
 * Generates the standardized plaintext recovery file contents (Plan §7.2).
 * Adheres strictly to the catastrophic loss warning requirement:
 * "BUNLARI KAYBEDERSENİZ HESABINIZA ERİŞİMİNİZ KALICI OLARAK BİTER. E-POSTA İLE KURTARMA YOKTUR."
 */
export function generateRecoveryFileContent(options: {
  username: string;
  apiKey: string;
  recoveryCodes: string[];
  createdAt?: string;
}): string {
  const dateStr = options.createdAt || new Date().toISOString();
  const codesFormatted = options.recoveryCodes.map((code, idx) => `${idx + 1}. ${code}`).join("\n");

  return `================================================================================
ACTOS HESAP KURTARMA VE GÜVENLİK BİLGİLERİ
================================================================================
Kullanıcı Adı: ${options.username}
Tarih: ${dateStr}

API ANAHTARI (Giriş ve API İstekleri İçin):
${options.apiKey}

10 ADET TEK KULLANIMLIK KURTARMA KODU:
${codesFormatted}

--------------------------------------------------------------------------------
DİKKAT:
BUNLARI KAYBEDERSENİZ HESABINIZA ERİŞİMİNİZ KALICI OLARAK BİTER.
E-POSTA İLE KURTARMA YOKTUR.
BU BİLGİLERİ ASLA BAŞKALARIYLA PAYLAŞMAYIN VE GÜVENLİ BİR YERDE SAKLAYIN.
================================================================================`;
}

/**
 * Generates plaintext file contents for newly regenerated recovery codes (Plan §Faz 11).
 */
export function generateRegeneratedCodesFileContent(options: {
  username: string;
  recoveryCodes: string[];
  createdAt?: string;
}): string {
  const dateStr = options.createdAt || new Date().toISOString();
  const codesFormatted = options.recoveryCodes.map((code, idx) => `${idx + 1}. ${code}`).join("\n");

  return `================================================================================
ACTOS YENİ KURTARMA KODLARI
================================================================================
Kullanıcı Adı: ${options.username}
Tarih: ${dateStr}

10 ADET TEK KULLANIMLIK YENİ KURTARMA KODU:
${codesFormatted}

--------------------------------------------------------------------------------
DİKKAT:
YENİ KODLAR ÜRETİLDİĞİ İÇİN ESKİ TÜM KURTARMA KODLARINIZ GEÇERSİZ KILINMIŞTIR.
BUNLARI KAYBEDERSENİZ HESABINIZA ERİŞİMİNİZ KALICI OLARAK BİTER.
E-POSTA İLE KURTARMA YOKTUR.
BU BİLGİLERİ ASLA BAŞKALARIYLA PAYLAŞMAYIN VE GÜVENLİ BİR YERDE SAKLAYIN.
================================================================================`;
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
