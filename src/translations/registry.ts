import { UIStrings, enUIStrings } from "./index.js";
export type { UIStrings };
import { hiUIStrings, hinglishUIStrings } from "./hindi.js";
import {
  bnUIStrings,
  teUIStrings,
  mrUIStrings,
  taUIStrings,
  guUIStrings,
  knUIStrings,
  mlUIStrings,
  paUIStrings,
  urUIStrings,
  neUIStrings,
  asUIStrings,
  orUIStrings,
  sdUIStrings,
} from "./indian.js";
import {
  esUIStrings,
  frUIStrings,
  deUIStrings,
  jaUIStrings,
  zhUIStrings,
  arUIStrings,
  ptUIStrings,
  ruUIStrings,
  koUIStrings,
  itUIStrings,
  idUIStrings,
  trUIStrings,
  viUIStrings,
  nlUIStrings,
} from "./international.js";

const RAW_TRANSLATIONS: Record<string, Partial<UIStrings>> = {
  en: enUIStrings,
  hi: hiUIStrings,
  hinglish: hinglishUIStrings,
  bn: bnUIStrings,
  te: teUIStrings,
  mr: mrUIStrings,
  ta: taUIStrings,
  gu: guUIStrings,
  kn: knUIStrings,
  ml: mlUIStrings,
  pa: paUIStrings,
  ur: urUIStrings,
  ne: neUIStrings,
  as: asUIStrings,
  or: orUIStrings,
  sd: sdUIStrings,
  es: esUIStrings,
  fr: frUIStrings,
  de: deUIStrings,
  ja: jaUIStrings,
  zh: zhUIStrings,
  ar: arUIStrings,
  pt: ptUIStrings,
  ru: ruUIStrings,
  ko: koUIStrings,
  it: itUIStrings,
  id: idUIStrings,
  tr: trUIStrings,
  vi: viUIStrings,
  nl: nlUIStrings,
};

// Cached merged dictionaries for fast zero-cost lookups
const MERGED_CACHE: Record<string, UIStrings> = {};

/**
 * Get the complete, strongly-typed UI translation dictionary for any language code.
 * Always guarantees 100% key coverage with fallback to English if any key is missing.
 */
export function getTranslations(code?: string): UIStrings {
  if (!code) return enUIStrings;
  const normalized = code.toLowerCase().trim();
  if (normalized === "all" || normalized === "en") return enUIStrings;

  // Extract base code (e.g. 'hi-IN' -> 'hi')
  const baseCode = normalized.split("-")[0];
  const lookupKey = RAW_TRANSLATIONS[normalized] ? normalized : baseCode;

  const raw = RAW_TRANSLATIONS[lookupKey];
  if (!raw) {
    return enUIStrings;
  }

  // Merge with English fallback so that every single key is guaranteed to exist
  return {
    ...enUIStrings,
    ...raw,
  };
}
