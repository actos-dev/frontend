import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import { DEFAULT_LOCALE, type Locale } from "./config";

export type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = {
  en,
  tr,
};

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Messages {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
}
