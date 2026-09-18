export const SEARCH_TABS = [
  { value: "post", label: "Gönderiler" },
  { value: "comment", label: "Yorumlar" },
  { value: "actor", label: "Aktörler" },
  { value: "tag", label: "Etiketler" },
] as const;

export type SearchTabType = (typeof SEARCH_TABS)[number]["value"];

const SEARCH_TAB_VALUES = new Set<string>(SEARCH_TABS.map((tab) => tab.value));

export function parseSearchTab(value: string | null): SearchTabType {
  return value && SEARCH_TAB_VALUES.has(value) ? (value as SearchTabType) : "post";
}
