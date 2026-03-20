// Unicode character mappings for LinkedIn-compatible text formatting.
// These use Mathematical Sans-Serif Bold / Italic code points which
// render as styled text on LinkedIn and other platforms that don't
// support rich text.

function buildMap(upper: number, lower: number, digits?: number): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < 26; i++) {
    map[String.fromCharCode(65 + i)] = String.fromCodePoint(upper + i);
    map[String.fromCharCode(97 + i)] = String.fromCodePoint(lower + i);
  }
  if (digits !== undefined) {
    for (let i = 0; i < 10; i++) {
      map[String.fromCharCode(48 + i)] = String.fromCodePoint(digits + i);
    }
  }
  return map;
}

// Mathematical Sans-Serif Bold: A 0x1D5D4, a 0x1D5EE, 0 0x1D7EC
const BOLD_MAP = buildMap(0x1d5d4, 0x1d5ee, 0x1d7ec);

// Mathematical Sans-Serif Italic: A 0x1D608, a 0x1D622 (no digits)
const ITALIC_MAP = buildMap(0x1d608, 0x1d622);

function applyMap(text: string, map: Record<string, string>): string {
  return Array.from(text)
    .map((ch) => map[ch] ?? ch)
    .join("");
}

export function toBold(text: string): string {
  return applyMap(text, BOLD_MAP);
}

export function toItalic(text: string): string {
  return applyMap(text, ITALIC_MAP);
}

// Build reverse map for stripping: Unicode char → plain ASCII char
const REVERSE_MAP: Record<string, string> = {};
for (const [plain, styled] of Object.entries(BOLD_MAP)) {
  REVERSE_MAP[styled] = plain;
}
for (const [plain, styled] of Object.entries(ITALIC_MAP)) {
  REVERSE_MAP[styled] = plain;
}

/**
 * Strip all Unicode bold/italic formatting back to plain ASCII.
 * Useful for scoring, word counting, and phrase detection.
 */
export function stripUnicodeFormatting(text: string): string {
  return Array.from(text)
    .map((ch) => REVERSE_MAP[ch] ?? ch)
    .join("");
}
