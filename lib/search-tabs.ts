export const SEARCH_TABS = [
  { value: "post", labelKey: "searchPage.tabs.post" },
  { value: "comment", labelKey: "searchPage.tabs.comment" },
  { value: "actor", labelKey: "searchPage.tabs.actor" },
  { value: "tag", labelKey: "searchPage.tabs.tag" },
  { value: "community", labelKey: "searchPage.tabs.community" },
] as const;

export type SearchTabType = (typeof SEARCH_TABS)[number]["value"];

const SEARCH_TAB_VALUES = new Set<string>(SEARCH_TABS.map((tab) => tab.value));

export function parseSearchTab(value: string | null): SearchTabType {
  return value && SEARCH_TAB_VALUES.has(value) ? (value as SearchTabType) : "post";
}
