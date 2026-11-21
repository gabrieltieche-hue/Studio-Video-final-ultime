/**
 * Pure French TTS speech normalizer.
 * Converts URLs, CLI paths, numbers/decimals, percentages, currencies, multipliers,
 * and common abbreviations into natural phonetic French for TTS synthesis ONLY,
 * without touching displayed text or subtitles.
 */

const ACRONYM_PRONUNCIATIONS: Record<string, string> = {
  SMIC: 'smic',
  RGPD: 'R G P D',
  DPE: 'D P E',
  TAEG: 'T A E G',
  CDI: 'C D I',
  CDD: 'C D D',
  PME: 'P M E',
  TPE: 'T P E',
  URSSAF: 'urssaf',
  INSEE: 'inssée',
  OECD: 'O C D E',
  OCDE: 'O C D E',
  PIB: 'P I B',
  TVA: 'T V A',
  APL: 'A P L',
  RSA: 'R S A',
  MCP: 'M C P',
  API: 'A P I',
  IA: 'I A',
  LLM: 'L L M',
  PDF: 'P D F',
  HEC: 'H E C',
};

const MONTH_ABBR: Record<string, string> = {
  janv: 'janvier',
  fevr: 'février',
  févr: 'février',
  avr: 'avril',
  juil: 'juillet',
  sept: 'septembre',
  oct: 'octobre',
  nov: 'novembre',
  dec: 'décembre',
  déc: 'décembre',
};

function normalizeMonthAbbreviations(text: string): string {
  return text.replace(
    /\b(janv|f[ée]vr|avr|juil|sept|oct|nov|d[ée]c)\.(?=\s|$|,|;)/gi,
    (_m, abbr: string) => {
      const key = abbr.toLowerCase();
      return MONTH_ABBR[key] || MONTH_ABBR[key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || abbr;
    }
  );
}

function normalizeCliAndFilePaths(text: string): string {
  return text.replace(/(~\/[A-Za-z0-9._/-]+|\.[A-Za-z0-9_-]*\/[A-Za-z0-9._/-]+)/g, (match) => {
    return match
      .replace(/^~\//, 'tilde slash ')
      .replace(/^\.\//, 'point slash ')
      .replace(/\//g, ' slash ')
      .replace(/\./g, ' point ')
      .replace(/[-_]/g, ' ');
  });
}

function normalizeWebDomains(text: string): string {
  // Match domains like info.gouv.fr, service-public.fr, anthropic.com, github.io
  return text.replace(
    /\b([a-z0-9-]+(?:\.[a-z0-9-]+)*)\.(gouv\.fr|fr|com|org|io|net|eu|ai|dev)\b(\/[A-Za-z0-9._/-]*)?/gi,
    (_m, host: string, tld: string, pathPart?: string) => {
      const spokenHost = host
        .split('.')
        .map((seg) => seg.replace(/-/g, ' '))
        .join(' point ');
      const spokenTld = tld.split('.').join(' point ');
      const spokenPath = pathPart
        ? ' ' +
          pathPart
            .replace(/\//g, ' slash ')
            .replace(/\./g, ' point ')
            .replace(/[-_]/g, ' ')
            .trim()
        : '';
      return `${spokenHost} point ${spokenTld}${spokenPath}`.replace(/\s+/g, ' ').trim();
    }
  );
}

function normalizeCurrenciesAndRates(text: string): string {
  let out = text;

  // e.g. 13 $/j, 20 €/mois, 50 €/an
  out = out.replace(
    /([+-]?\d+(?:[\s\u00A0]\d{3})*(?:[.,]\d+)?)\s*(€|\$)\s*\/\s*(j|jour|mois|an|h|heure)\b/gi,
    (_m, num: string, cur: string, unit: string) => {
      const cleanNum = num.replace(/[\s\u00A0]+/g, '').replace(',', ' virgule ').replace('.', ' virgule ');
      const curWord = cur === '€' ? 'euros' : 'dollars';
      const unitMap: Record<string, string> = {
        j: 'jour',
        jour: 'jour',
        mois: 'mois',
        an: 'an',
        h: 'heure',
        heure: 'heure',
      };
      return `${cleanNum} ${curWord} par ${unitMap[unit.toLowerCase()] || unit}`;
    }
  );

  // e.g. 24,50 € or 1 426 € or 2000 $
  out = out.replace(
    /([+-]?\d+(?:[\s\u00A0]\d{3})*)(?:[.,](\d{1,2}))?\s*(€|\$)/g,
    (_m, whole: string, cents: string | undefined, cur: string) => {
      const cleanWhole = whole.replace(/[\s\u00A0]+/g, '');
      const curWord = cur === '€' ? 'euros' : 'dollars';
      if (cents !== undefined) {
        if (cents === '00') return `${cleanWhole} ${curWord}`;
        return `${cleanWhole} ${curWord} ${cents}`;
      }
      return `${cleanWhole} ${curWord}`;
    }
  );

  // Percentages with optional +/- and decimal comma/dot: +1,6 %, -28 %, 80 %
  out = out.replace(
    /(^|[\s(«])([+-])?\s*(\d+(?:[\s\u00A0]\d{3})*)(?:[.,](\d+))?\s*%/g,
    (_m, prefix: string, sign: string | undefined, whole: string, dec: string | undefined) => {
      const signWord = sign === '+' ? 'plus ' : sign === '-' ? 'moins ' : '';
      const cleanWhole = whole.replace(/[\s\u00A0]+/g, '');
      const decWord = dec !== undefined ? ` virgule ${dec}` : '';
      return `${prefix}${signWord}${cleanWhole}${decWord} pour cent`;
    }
  );

  // Multipliers: 10×, 3x -> 10 fois, 3 fois
  out = out.replace(/(?:\b(\d+(?:[.,]\d+)?)\s*×|\b(\d+(?:[.,]\d+)?)\s*x\b)/gi, (_m, n1?: string, n2?: string) => {
    const n = n1 || n2 || '';
    return `${n.replace(',', ' virgule ').replace('.', ' virgule ')} fois`;
  });

  // Standalone decimal numbers with comma or dot: 1,6 -> 1 virgule 6 (after currency/percent handled)
  out = out.replace(/\b(\d+)[,.](\d+)\b/g, '$1 virgule $2');

  // Compact French spaced thousands: 1 426 -> 1426
  out = out.replace(/\b(\d{1,3})[\s\u00A0](\d{3})\b/g, '$1$2');

  return out;
}

function normalizeOrdinalsAndUnits(text: string): string {
  let out = text;
  out = out.replace(/\b1er\b/gi, 'premier');
  out = out.replace(/\b1re\b/gi, 'première');
  out = out.replace(/\b(\d+)(?:e|ème)\b/gi, '$1 ième');

  // Durations like 5 min, 45 s, 120 ms, 3 h
  out = out.replace(/\b(\d+)\s*min\b/gi, '$1 minutes');
  out = out.replace(/\b(\d+)\s*ms\b/gi, '$1 millisecondes');
  out = out.replace(/\b(\d+)\s*h\b/gi, '$1 heures');

  return out;
}

function normalizeAcronyms(text: string): string {
  return text.replace(/\b([A-Z]{2,6})\b/g, (word) => {
    return ACRONYM_PRONUNCIATIONS[word] || word;
  });
}

/**
 * Normalizes a French beat line for natural neural TTS pronunciation while leaving
 * the visual/caption source text untouched.
 */
export function normalizeFrenchForSpeech(text: string): string {
  let out = String(text || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[—–]/g, ', ')
    .replace(/[«»“”"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!out) return '';

  out = normalizeMonthAbbreviations(out);
  out = normalizeCliAndFilePaths(out);
  out = normalizeWebDomains(out);
  out = normalizeCurrenciesAndRates(out);
  out = normalizeOrdinalsAndUnits(out);
  out = normalizeAcronyms(out);

  // Strip stray handles symbol '@' for smoother reading if present
  out = out.replace(/@([a-zA-Z0-9._-]+)/g, (_m, handle: string) => handle.replace(/\./g, ' point '));

  out = out.replace(/\s+([,.;!?])/g, '$1').replace(/\s+/g, ' ').trim();

  // Ensure terminal punctuation so Edge/ElevenLabs sustains natural prosody until final syllable
  if (!/[.!?…]$/.test(out)) {
    out = `${out}.`;
  }

  return out;
}
