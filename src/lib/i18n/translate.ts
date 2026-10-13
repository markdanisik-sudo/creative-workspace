import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

/** Plural forms keyed by Intl.PluralRules categories; `other` is required. */
export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;

type Paths<T> = {
  [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>>;
}[keyof T];

/** Dot paths to every string in the dictionary, e.g. "auth.email". Plural groups live under `plural`. */
export type MessageKey = Paths<Omit<Dictionary, "plural">>;

/** Dot paths to every plural group, e.g. "plural.project". */
export type PluralKey = `plural.${Extract<keyof Dictionary["plural"], string>}`;

export type Params = Record<string, string | number>;

function lookup(dictionary: Dictionary, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dictionary);
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export interface Translator {
  locale: Locale;
  /** A message, with `{name}` placeholders filled from params. */
  t: (key: MessageKey, params?: Params) => string;
  /** A count-dependent message; `{count}` is always available. */
  tp: (key: PluralKey, count: number, params?: Params) => string;
}

export function createTranslator(locale: Locale, dictionary: Dictionary): Translator {
  const rules = new Intl.PluralRules(locale);
  return {
    locale,
    t(key, params) {
      const value = lookup(dictionary, key);
      return typeof value === "string" ? interpolate(value, params) : key;
    },
    tp(key, count, params) {
      const forms = lookup(dictionary, key) as PluralForms | undefined;
      if (!forms) return key;
      const form = forms[rules.select(count) as keyof PluralForms] ?? forms.other;
      return interpolate(form, { count, ...params });
    },
  };
}
