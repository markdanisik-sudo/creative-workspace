import type { Locale } from "./config";
import { cs } from "./dictionaries/cs";
import { en, type Dictionary } from "./dictionaries/en";
import { createTranslator } from "./translate";

const dictionaries: Record<Locale, Dictionary> = { en, cs };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function translator(locale: Locale) {
  return createTranslator(locale, getDictionary(locale));
}

export * from "./config";
export type { MessageKey, PluralKey, Translator } from "./translate";
